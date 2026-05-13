const DEFAULT_WHCC_ORDER_API_BASE_URL = 'https://apps.whcc.com'
const TOKEN_EXPIRY_BUFFER_MS = 60_000
const MAX_TOKEN_CACHE_SIZE = 16

const orderTokenCache = new Map()

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

function getOrderTokenExpiry(payload) {
  if (!payload || typeof payload !== 'object') {
    return Date.now() + 50 * 60_000
  }

  const expirationDate = Date.parse(String(payload.ExpirationDate || ''))
  if (Number.isFinite(expirationDate) && expirationDate > Date.now()) {
    return expirationDate
  }

  return Date.now() + 50 * 60_000
}

function pruneOrderTokenCache(now = Date.now()) {
  for (const [cacheKey, entry] of orderTokenCache.entries()) {
    if (!entry?.expiresAt || entry.expiresAt <= now) {
      orderTokenCache.delete(cacheKey)
    }
  }

  while (orderTokenCache.size > MAX_TOKEN_CACHE_SIZE) {
    const oldestKey = orderTokenCache.keys().next().value
    if (!oldestKey) {
      break
    }
    orderTokenCache.delete(oldestKey)
  }
}

export function getWhccOrderConfig() {
  return {
    apiBaseUrl: (process.env.WHCC_ORDER_API_BASE_URL || DEFAULT_WHCC_ORDER_API_BASE_URL).replace(/\/$/, ''),
    key: process.env.WHCC_ORDER_KEY || '',
    secret: process.env.WHCC_ORDER_SECRET || '',
    timeoutMs: parsePositiveInt(process.env.WHCC_HTTP_TIMEOUT_MS, 15_000),
  }
}

export async function getWhccOrderAccessToken() {
  const config = getWhccOrderConfig()

  if (!config.key || !config.secret) {
    throw new Error('WHCC order credentials are not configured. Set WHCC_ORDER_KEY and WHCC_ORDER_SECRET.')
  }

  const cacheKey = `${config.apiBaseUrl}|${config.key}`
  pruneOrderTokenCache()
  const cached = orderTokenCache.get(cacheKey)

  if (cached && cached.expiresAt - TOKEN_EXPIRY_BUFFER_MS > Date.now()) {
    return cached.token
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

  const search = new URLSearchParams({
    grant_type: 'consumer_credentials',
    consumer_key: config.key,
    consumer_secret: config.secret,
  })

  let response
  try {
    response = await fetch(`${config.apiBaseUrl}/api/AccessToken?${search.toString()}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
      signal: controller.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`WHCC order token request timed out after ${config.timeoutMs}ms.`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }

  const responseText = await response.text()
  let payload

  try {
    payload = responseText ? JSON.parse(responseText) : null
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(`WHCC order token request failed (${response.status}): ${responseText}`)
  }

  const token = String(payload?.Token || '').trim()
  if (!token) {
    throw new Error('WHCC order token response did not include Token.')
  }

  const expiresAt = getOrderTokenExpiry(payload)
  orderTokenCache.set(cacheKey, { token, expiresAt })
  pruneOrderTokenCache()

  return token
}

export async function whccOrderJsonRequest(path, { method = 'GET', token, body } = {}) {
  const config = getWhccOrderConfig()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    const response = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    const responseText = await response.text()
    let data

    try {
      data = responseText ? JSON.parse(responseText) : null
    } catch {
      data = null
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      text: responseText,
    }
  } finally {
    clearTimeout(timeout)
  }
}
