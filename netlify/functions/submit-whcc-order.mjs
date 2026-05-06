import { handlePreflight, jsonResponse } from './_shared.mjs'
import {
  getApprovedOrder,
  isOrderStoreConfigured,
  markOrderFailed,
  markOrderSubmitted,
} from './_orders.mjs'

export async function handler(event) {
  const origin = event.headers.origin || ''

  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight(origin)
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, origin, { error: 'Method not allowed' })
  }

  const adminToken = process.env.ADMIN_API_TOKEN
  const authHeader = event.headers.authorization || ''

  if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
    return jsonResponse(401, origin, { error: 'Unauthorized' })
  }

  try {
    const payload = JSON.parse(event.body || '{}')
    const orderId = String(payload.orderId || '')

    if (!orderId) {
      return jsonResponse(400, origin, { error: 'orderId is required.' })
    }

    if (!isOrderStoreConfigured()) {
      return jsonResponse(500, origin, {
        error: 'Order store is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      })
    }

    const whccApiBaseUrl = process.env.WHCC_API_BASE_URL
    const whccApiKey = process.env.WHCC_API_KEY

    if (!whccApiBaseUrl || !whccApiKey) {
      return jsonResponse(500, origin, {
        error: 'WHCC is not configured. Set WHCC_API_BASE_URL and WHCC_API_KEY.',
      })
    }

    const order = await getApprovedOrder(orderId)

    const whccPayload = {
      externalOrderId: order.id,
      customerEmail: order.customer_email,
      currency: order.currency,
      lineItems: Array.isArray(order.line_items) ? order.line_items : [],
    }

    const response = await fetch(`${whccApiBaseUrl.replace(/\/$/, '')}/orders`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${whccApiKey}`,
      },
      body: JSON.stringify(whccPayload),
    })

    const responseText = await response.text()

    if (!response.ok) {
      await markOrderFailed(orderId, `WHCC ${response.status}: ${responseText}`)
      return jsonResponse(502, origin, {
        error: 'WHCC submission failed.',
        details: responseText,
      })
    }

    let parsed
    try {
      parsed = JSON.parse(responseText)
    } catch {
      parsed = null
    }

    const externalId = parsed?.id || parsed?.orderId || null
    const updatedOrder = await markOrderSubmitted(orderId, externalId, parsed || responseText)

    return jsonResponse(200, origin, {
      ok: true,
      orderId,
      status: 'submitted_to_whcc',
      order: updatedOrder,
      whcc: parsed || responseText,
    })
  } catch (error) {
    console.error('submit-whcc-order failed:', error)
    return jsonResponse(500, origin, { error: 'Unable to submit WHCC order.' })
  }
}
