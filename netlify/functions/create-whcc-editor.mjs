import { randomUUID } from 'node:crypto'
import { handlePreflight, jsonResponse } from './_shared.mjs'
import { getWhccAccessToken, whccJsonRequest } from './_whcc.mjs'

function normalizeLineItems(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => ({
      productId: String(item?.productId || ''),
      variantId: String(item?.variantId || ''),
      productTitle: String(item?.productTitle || ''),
      variantLabel: String(item?.variantLabel || ''),
      productType: String(item?.productType || ''),
      quantity: Number(item?.quantity || 0),
      whccSku: String(item?.whccSku || ''),
      whccProductId: String(item?.whccProductId || ''),
      whccDesignId: String(item?.whccDesignId || ''),
    }))
    .filter((item) => item.productId && item.variantId && item.quantity > 0)
}

function isPlaceholderValue(value) {
  return String(value || '').trim().toLowerCase().startsWith('replace_me_')
}

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

function extractEditorSession(data) {
  if (!data || typeof data !== 'object') {
    return { editorId: null, editorUrl: null }
  }

  const editorId = String(data.editorId || data.id || '').trim() || null
  const editorUrl = String(data.editorUrl || data.url || data.link || '').trim() || null
  return { editorId, editorUrl }
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
    const lineItems = normalizeLineItems(payload.lineItems)

    if (!lineItems.length) {
      return jsonResponse(400, origin, { error: 'At least one valid line item is required.' })
    }

    if (lineItems.some((item) => item.productType !== 'print')) {
      return jsonResponse(400, origin, {
        error: 'WHCC editor checkout currently supports print products only.',
      })
    }

    if (lineItems.length !== 1) {
      return jsonResponse(400, origin, {
        error: 'WHCC editor checkout currently supports one cart item per launch.',
      })
    }

    const missingMapping = lineItems.find((item) => !item.whccProductId || !item.whccDesignId)
    if (missingMapping) {
      return jsonResponse(400, origin, {
        error:
          'Missing WHCC variant mapping. Configure whccProductId and whccDesignId in gallery-catalog.json for each print variant.',
        productId: missingMapping.productId,
        variantId: missingMapping.variantId,
      })
    }

    const placeholderMapping = lineItems.find(
      (item) => isPlaceholderValue(item.whccProductId) || isPlaceholderValue(item.whccDesignId)
    )
    if (placeholderMapping) {
      return jsonResponse(400, origin, {
        error:
          'WHCC variant mapping still uses placeholder values. Replace whccProductId/whccDesignId with real IDs from WHCC staging or production.',
        productId: placeholderMapping.productId,
        variantId: placeholderMapping.variantId,
      })
    }

    const siteUrl = process.env.SITE_URL || 'http://localhost:3000'
    const successPath = '/gallery/success'
    const cancelPath = '/gallery/cancel'
    const { accountId, source: accountIdSource } = getAccountIdFromPayload(payload)

    if (!accountId) {
      return jsonResponse(500, origin, {
        error: 'WHCC account ID is not configured. Pass accountId or set WHCC_ACCOUNT_ID.',
      })
    }

    const checkoutId = randomUUID()
    const item = lineItems[0]

    const { token } = await getWhccAccessToken(accountId)

    const editorPayload = {
      userId: accountId,
      productId: item.whccProductId,
      designId: item.whccDesignId,
      redirects: {
        complete: {
          text: 'Checkout',
          url: `${siteUrl}${successPath}?checkout_id=${checkoutId}&editor_id=%EDITOR_ID%`,
        },
        cancel: {
          text: 'Back to Gallery',
          url: `${siteUrl}${cancelPath}?checkout_id=${checkoutId}`,
        },
      },
      settings: {
        quantity: {
          default: item.quantity,
        },
      },
    }

    const editorResponse = await whccJsonRequest('/editors', {
      method: 'POST',
      token,
      accountId,
      body: editorPayload,
    })

    if (!editorResponse.ok) {
      return jsonResponse(502, origin, {
        error: 'WHCC editor creation failed.',
        details: editorResponse.text,
      })
    }

    const { editorId, editorUrl } = extractEditorSession(editorResponse.data)

    if (!editorId || !editorUrl) {
      return jsonResponse(502, origin, {
        error: 'WHCC editor response missing required editorUrl/editorId fields.',
        details: editorResponse.data || editorResponse.text,
      })
    }

    return jsonResponse(200, origin, {
      ok: true,
      checkoutId,
      editorId,
      editorUrl,
      accountIdSource,
    })
  } catch (error) {
    console.error('create-whcc-editor failed:', error)
    return jsonResponse(500, origin, { error: 'Unable to create WHCC editor session.' })
  }
}