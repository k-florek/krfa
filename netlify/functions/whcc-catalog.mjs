import { getWhccOrderAccessToken, whccOrderJsonRequest } from './_whcc-order-submit.mjs'
import { handlePreflight, jsonResponse } from './_shared.mjs'

const CATALOG_CACHE_TTL_MS = 60 * 60 * 1000
let cachedCatalog = null
let cachedAt = 0

function gcd(a, b) {
  let x = Math.abs(Math.trunc(a))
  let y = Math.abs(Math.trunc(b))

  while (y !== 0) {
    const temp = y
    y = x % y
    x = temp
  }

  return x || 1
}

function normalizeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function toAspectRatio(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    const ratio = width / height
    return ratio.toFixed(4)
  }

  const divisor = gcd(width, height)
  return `${Math.trunc(width / divisor)}:${Math.trunc(height / divisor)}`
}

function isFineArtLikeCategory(name) {
  const value = String(name || '').toLowerCase()
  return value.includes('fine art') || value.includes('print') || value.includes('poster')
}

function extractProducts(payload) {
  const categories = Array.isArray(payload?.Categories) ? payload.Categories : []
  const all = []
  const filtered = []

  for (const category of categories) {
    const categoryName = String(category?.Name || '').trim()
    const products = Array.isArray(category?.ProductList) ? category.ProductList : []

    for (const product of products) {
      const productId = String(product?.Id || '').trim()
      const productName = String(product?.Name || '').trim()
      const nodes = Array.isArray(product?.ProductNodes) ? product.ProductNodes : []

      if (!productId || !productName || !nodes.length) {
        continue
      }

      for (const node of nodes) {
        const width = normalizeNumber(node?.W)
        const height = normalizeNumber(node?.H)

        if (!width || !height) {
          continue
        }

        const entry = {
          productUID: productId,
          name: productName,
          widthIn: width,
          heightIn: height,
          aspectRatio: toAspectRatio(width, height),
          categoryName,
        }

        all.push(entry)
        if (isFineArtLikeCategory(categoryName)) {
          filtered.push(entry)
        }
      }
    }
  }

  const source = filtered.length ? filtered : all
  const deduped = new Map()

  for (const item of source) {
    const key = `${item.productUID}:${item.widthIn}:${item.heightIn}`
    if (!deduped.has(key)) {
      deduped.set(key, item)
    }
  }

  return [...deduped.values()]
    .sort((a, b) => {
      if (a.widthIn !== b.widthIn) {
        return a.widthIn - b.widthIn
      }

      if (a.heightIn !== b.heightIn) {
        return a.heightIn - b.heightIn
      }

      return a.name.localeCompare(b.name)
    })
    .map(({ categoryName, ...item }) => item)
}

export async function handler(event) {
  const origin = event.headers.origin || ''

  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight(origin)
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, origin, { error: 'Method not allowed' })
  }

  try {
    if (cachedCatalog && Date.now() - cachedAt < CATALOG_CACHE_TTL_MS) {
      return jsonResponse(200, origin, {
        ok: true,
        cached: true,
        products: cachedCatalog,
      })
    }

    const token = await getWhccOrderAccessToken()
    const response = await whccOrderJsonRequest('/api/catalog', {
      method: 'GET',
      token,
    })

    if (!response.ok) {
      return jsonResponse(502, origin, {
        error: 'WHCC catalog request failed.',
        details: response.text,
      })
    }

    const products = extractProducts(response.data)
    cachedCatalog = products
    cachedAt = Date.now()

    return jsonResponse(200, origin, {
      ok: true,
      cached: false,
      products,
    })
  } catch (error) {
    console.error('whcc-catalog failed:', error)
    return jsonResponse(500, origin, {
      error: error instanceof Error ? error.message : 'Unable to fetch WHCC catalog.',
    })
  }
}
