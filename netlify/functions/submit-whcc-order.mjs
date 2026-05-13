import { randomUUID } from 'node:crypto'
import { getWhccAccessToken, whccJsonRequest } from './_whcc.mjs'
import { getWhccOrderAccessToken, whccOrderJsonRequest } from './_whcc-order-submit.mjs'
import { handlePreflight, jsonResponse } from './_shared.mjs'

function getAccountIdFromPayload(payload) {
  const fromPayload = String(payload?.accountId || '').trim()
  const fromEnvironment = String(process.env.WHCC_ACCOUNT_ID || '').trim()

  if (fromPayload) {
    return { accountId: fromPayload, source: 'request' }
  }

  if (fromEnvironment) {
    return { accountId: fromEnvironment, source: 'environment' }
  }

  return { accountId: '', source: 'none' }
}

function normalizeCartItem(item) {
  return {
    id: String(item?.id || '').trim(),
    editorId: String(item?.editorId || '').trim(),
    productId: String(item?.productId || '').trim(),
    variantId: String(item?.variantId || '').trim(),
    productTitle: String(item?.productTitle || '').trim(),
    variantLabel: String(item?.variantLabel || '').trim(),
    quantity: Number(item?.quantity || 0),
    priceCents: Number(item?.priceCents || 0),
    currency: String(item?.currency || 'usd').toLowerCase(),
    whccSku: String(item?.whccSku || '').trim(),
    whccProductId: String(item?.whccProductId || '').trim(),
    whccDesignId: String(item?.whccDesignId || '').trim(),
  }
}

function normalizeShipping(shipping) {
  return {
    name: String(shipping?.name || '').trim(),
    attn: String(shipping?.attn || '').trim(),
    addr1: String(shipping?.addr1 || '').trim(),
    addr2: String(shipping?.addr2 || '').trim(),
    city: String(shipping?.city || '').trim(),
    state: String(shipping?.state || '').trim(),
    zip: String(shipping?.zip || '').trim(),
    country: String(shipping?.country || '').trim().toUpperCase(),
    phone: String(shipping?.phone || '').trim(),
    sendNotificationEmailAddress: String(shipping?.sendNotificationEmailAddress || '').trim(),
  }
}

function validateShipping(shipping) {
  const requiredFields = ['name', 'addr1', 'city', 'state', 'zip', 'country', 'phone']

  for (const field of requiredFields) {
    if (!shipping[field]) {
      return `Shipping field ${field} is required.`
    }
  }

  if (shipping.country.length !== 2) {
    return 'Shipping country must be a 2-letter country code.'
  }

  return null
}

function getShipFromAddress() {
  const address = {
    Name: String(process.env.WHCC_SHIP_FROM_NAME || '').trim(),
    Addr1: String(process.env.WHCC_SHIP_FROM_ADDR1 || '').trim(),
    Addr2: String(process.env.WHCC_SHIP_FROM_ADDR2 || '').trim(),
    City: String(process.env.WHCC_SHIP_FROM_CITY || '').trim(),
    State: String(process.env.WHCC_SHIP_FROM_STATE || '').trim(),
    Zip: String(process.env.WHCC_SHIP_FROM_ZIP || '').trim(),
    Country: String(process.env.WHCC_SHIP_FROM_COUNTRY || 'US').trim().toUpperCase(),
    Phone: String(process.env.WHCC_SHIP_FROM_PHONE || '').trim(),
  }

  const required = ['Name', 'Addr1', 'City', 'State', 'Zip', 'Country', 'Phone']
  const missing = required.filter((key) => !address[key])

  if (missing.length > 0) {
    throw new Error(`Missing ship-from environment fields: ${missing.join(', ')}`)
  }

  return address
}

function applyShippingToOrder(orderPayload, cartItems, shipping, entryId) {
  if (!orderPayload || typeof orderPayload !== 'object') {
    throw new Error('WHCC export payload did not return a valid order object.')
  }

  if (!Array.isArray(orderPayload.Orders) || orderPayload.Orders.length === 0) {
    throw new Error('WHCC export payload did not include any orders.')
  }

  const shipFromAddress = getShipFromAddress()

  const orders = orderPayload.Orders.map((order, index) => ({
    ...order,
    SequenceNumber: Number(order?.SequenceNumber || index + 1),
    Reference: order?.Reference || `KRFA ${entryId}`,
    SendNotificationEmailAddress: shipping.sendNotificationEmailAddress || null,
    SendNotificationEmailToAccount: true,
    ShipToAddress: {
      Name: shipping.name,
      Attn: shipping.attn || null,
      Addr1: shipping.addr1,
      Addr2: shipping.addr2 || null,
      City: shipping.city,
      State: shipping.state,
      Zip: shipping.zip,
      Country: shipping.country,
      Phone: shipping.phone,
    },
    ShipFromAddress: shipFromAddress,
  }))

  return {
    ...orderPayload,
    EntryId: entryId,
    Orders: orders,
  }
}

export async function handler(event) {
  const origin = event.headers.origin || ''

  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight(origin)
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, origin, { error: 'Method not allowed' })
  }

  try {
    const payload = JSON.parse(event.body || '{}')
    const cartItems = Array.isArray(payload?.cartItems)
      ? payload.cartItems.map(normalizeCartItem)
      : []
    const shipping = normalizeShipping(payload?.shipping || {})

    if (!cartItems.length) {
      return jsonResponse(400, origin, {
        error: 'At least one cart item is required.',
      })
    }

    const invalidItem = cartItems.find(
      (item) => !item.editorId || item.quantity <= 0 || !item.whccProductId || !item.whccDesignId
    )

    if (invalidItem) {
      return jsonResponse(400, origin, {
        error: 'Cart contains invalid WHCC item data.',
        itemId: invalidItem.id || null,
      })
    }

    const shippingError = validateShipping(shipping)
    if (shippingError) {
      return jsonResponse(400, origin, { error: shippingError })
    }

    const { accountId } = getAccountIdFromPayload(payload)
    if (!accountId) {
      return jsonResponse(500, origin, {
        error: 'WHCC account ID is not configured. Pass accountId or set WHCC_ACCOUNT_ID.',
      })
    }

    const { token: editorToken } = await getWhccAccessToken(accountId)
    const exportResponse = await whccJsonRequest('/oas/editors/export', {
      method: 'PUT',
      token: editorToken,
      accountId,
      body: {
        editors: cartItems.map((item) => ({ editorId: item.editorId })),
      },
    })

    if (!exportResponse.ok) {
      return jsonResponse(502, origin, {
        error: 'WHCC editor export failed.',
        details: exportResponse.text,
      })
    }

    const exportedOrder = exportResponse?.data?.order
    const entryId = randomUUID()
    const orderImportPayload = applyShippingToOrder(exportedOrder, cartItems, shipping, entryId)

    const orderToken = await getWhccOrderAccessToken()

    const importResponse = await whccOrderJsonRequest('/api/OrderImport', {
      method: 'POST',
      token: orderToken,
      body: orderImportPayload,
    })

    if (!importResponse.ok) {
      return jsonResponse(502, origin, {
        error: 'WHCC order import failed.',
        details: importResponse.text,
      })
    }

    const confirmationId = String(importResponse?.data?.ConfirmationID || '').trim()
    if (!confirmationId) {
      return jsonResponse(502, origin, {
        error: 'WHCC order import did not return ConfirmationID.',
        details: importResponse.data || importResponse.text,
      })
    }

    const submitResponse = await whccOrderJsonRequest(`/api/OrderImport/Submit/${encodeURIComponent(confirmationId)}`, {
      method: 'POST',
      token: orderToken,
    })

    if (!submitResponse.ok) {
      return jsonResponse(502, origin, {
        error: 'WHCC order submit failed.',
        details: submitResponse.text,
      })
    }

    return jsonResponse(200, origin, {
      ok: true,
      confirmationId,
      confirmedOrders: submitResponse?.data?.ConfirmedOrders ?? null,
      confirmationMessage: submitResponse?.data?.Confirmation || 'Order submitted.',
      totals: importResponse?.data?.Orders || [],
      entryId,
    })
  } catch (error) {
    console.error('submit-whcc-order failed:', error)
    return jsonResponse(500, origin, {
      error: error instanceof Error ? error.message : 'Unable to submit WHCC order.',
    })
  }
}
