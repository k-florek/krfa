import { jsonResponse, handlePreflight } from './_shared.mjs'

function normalizePendingItem(item) {
  return {
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
    const checkoutId = String(payload?.checkoutId || '').trim()
    const editorId = String(payload?.editorId || '').trim()
    const pendingItem = normalizePendingItem(payload?.pendingItem || {})

    if (!checkoutId || !editorId) {
      return jsonResponse(400, origin, {
        error: 'checkoutId and editorId are required.',
      })
    }

    if (!pendingItem.productId || !pendingItem.variantId || !pendingItem.productTitle || !pendingItem.variantLabel) {
      return jsonResponse(400, origin, {
        error: 'Pending item metadata is incomplete.',
      })
    }

    if (!Number.isFinite(pendingItem.quantity) || pendingItem.quantity <= 0) {
      return jsonResponse(400, origin, {
        error: 'Item quantity must be greater than zero.',
      })
    }

    if (!Number.isFinite(pendingItem.priceCents) || pendingItem.priceCents < 0) {
      return jsonResponse(400, origin, {
        error: 'Item price must be zero or greater.',
      })
    }

    if (!pendingItem.whccProductId || !pendingItem.whccDesignId) {
      return jsonResponse(400, origin, {
        error: 'WHCC mapping is required for checkout.',
      })
    }

    const cartItem = {
      id: `editor:${editorId}`,
      checkoutId,
      editorId,
      productId: pendingItem.productId,
      variantId: pendingItem.variantId,
      productTitle: pendingItem.productTitle,
      variantLabel: pendingItem.variantLabel,
      quantity: pendingItem.quantity,
      priceCents: pendingItem.priceCents,
      currency: pendingItem.currency === 'usd' ? 'usd' : 'usd',
      whccSku: pendingItem.whccSku || null,
      whccProductId: pendingItem.whccProductId,
      whccDesignId: pendingItem.whccDesignId,
      addedAt: new Date().toISOString(),
    }

    return jsonResponse(200, origin, {
      ok: true,
      cartItem,
    })
  } catch (error) {
    console.error('whcc-editor-complete failed:', error)
    return jsonResponse(500, origin, {
      error: 'Unable to process completed editor session.',
    })
  }
}
