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
      whccProductUID: String(item?.whccProductUID || item?.whccProductId || ''),
      printSourceUrl: String(item?.printSourceUrl || ''),
      aspectRatio: String(item?.aspectRatio || ''),
      slug: String(item?.slug || ''),
    }))
    .filter((item) => item.productId && item.variantId && item.quantity > 0)
}

function toDesignId(slug, aspectRatio) {
  const normalizedSlug = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const normalizedAspectRatio = String(aspectRatio || '')
    .trim()
    .replace(':', 'x')
    .replace(/[^0-9x.]+/g, '')

  if (!normalizedSlug || !normalizedAspectRatio) {
    return ''
  }

  return `${normalizedSlug}-${normalizedAspectRatio}`
}

function toAbsoluteAssetUrl(url, siteUrl) {
  const trimmed = String(url || '').trim()
  if (!trimmed) {
    return ''
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  const normalizedSiteUrl = String(siteUrl || '').trim().replace(/\/$/, '')
  if (!normalizedSiteUrl) {
    return trimmed
  }

  return `${normalizedSiteUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`
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

    const missingMapping = lineItems.find(
      (item) => !item.whccProductUID || !item.printSourceUrl || !toDesignId(item.slug, item.aspectRatio)
    )
    if (missingMapping) {
      return jsonResponse(400, origin, {
        error:
          'Missing WHCC mapping details. Provide whccProductUID, printSourceUrl, slug, and aspectRatio for each print item.',
        productId: missingMapping.productId,
        variantId: missingMapping.variantId,
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
    const designId = toDesignId(item.slug, item.aspectRatio)
    const printSourceUrl = toAbsoluteAssetUrl(item.printSourceUrl, siteUrl)

    const { token } = await getWhccAccessToken(accountId)

    const editorPayload = {
      userId: accountId,
      productId: item.whccProductUID,
      designId,
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
      photos: [
        {
          id: '1',
          name: `${item.productTitle || item.productId} source`,
          url: printSourceUrl,
          printUrl: printSourceUrl,
          filetype: printSourceUrl.toLowerCase().endsWith('.png') ? 'png' : 'jpg',
        },
      ],
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