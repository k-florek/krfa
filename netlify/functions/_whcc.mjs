const DEFAULT_WHCC_API_BASE_URL = 'https://prospector.dragdrop.design/api/v1'
const TOKEN_EXPIRY_BUFFER_MS = 60_000
const MAX_TOKEN_CACHE_SIZE = 64

const tokenCache = new Map()

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

function normalizeEditorApiBaseUrl(rawBaseUrl) {
  const baseUrl = String(rawBaseUrl || DEFAULT_WHCC_API_BASE_URL).replace(/\/$/, '')

  if (baseUrl.endsWith('/api/v1')) {
    return baseUrl
  }

  // WHCC docs list staging host without path in some places.
  // Ensure requests always target the v1 API root.
  return `${baseUrl}/api/v1`
}

export function getWhccConfig() {
  return {
    apiBaseUrl: normalizeEditorApiBaseUrl(process.env.WHCC_EDITOR_API_BASE_URL),
    key: process.env.WHCC_KEY || '',
    secret: process.env.WHCC_SECRET || '',
    defaultAccountId: process.env.WHCC_ACCOUNT_ID || '',
    timeoutMs: parsePositiveInt(process.env.WHCC_HTTP_TIMEOUT_MS, 15_000),
  }
}

function getTokenFromResponse(payload) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  return payload.accessToken || payload.access_token || payload.token || null
}

function getTokenExpiryFromResponse(payload) {
  if (!payload || typeof payload !== 'object') {
    return Date.now() + 80 * 60_000
  }

  if (payload.expiresAt) {
    const expiresAt = Number(payload.expiresAt)
    if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
      return expiresAt
    }
  }

  if (payload.expires) {
    const expiresSeconds = Number(payload.expires)
    if (Number.isFinite(expiresSeconds) && expiresSeconds > 0) {
      if (expiresSeconds > 2_000_000_000) {
        return expiresSeconds
      }
      return expiresSeconds * 1000
    }
  }

  if (payload.expiresIn) {
    const expiresInSeconds = Number(payload.expiresIn)
    if (Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) {
      return Date.now() + expiresInSeconds * 1000
    }
  }

  return Date.now() + 80 * 60_000
}

function pruneTokenCache(now = Date.now()) {
  for (const [cacheKey, entry] of tokenCache.entries()) {
    if (!entry?.expiresAt || entry.expiresAt <= now) {
      tokenCache.delete(cacheKey)
    }
  }

  while (tokenCache.size > MAX_TOKEN_CACHE_SIZE) {
    const oldestKey = tokenCache.keys().next().value
    if (!oldestKey) {
      break
    }
    tokenCache.delete(oldestKey)
  }
}

export async function getWhccAccessToken(accountIdInput) {
  const config = getWhccConfig()

  if (!config.key || !config.secret) {
    throw new Error('WHCC credentials are not configured. Set WHCC_KEY and WHCC_SECRET.')
  }

  const accountId = String(accountIdInput || config.defaultAccountId || '')
  if (!accountId) {
    throw new Error('WHCC account ID is not configured. Set WHCC_ACCOUNT_ID or pass accountId.')
  }

  const cacheKey = accountId
  pruneTokenCache()
  const cached = tokenCache.get(cacheKey)

  if (cached && cached.expiresAt - TOKEN_EXPIRY_BUFFER_MS > Date.now()) {
    return { token: cached.token, accountId }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

  let response
  try {
    response = await fetch(`${config.apiBaseUrl}/auth/access-token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        key: config.key,
        secret: config.secret,
        claims: {
          accountId,
        },
      }),
      signal: controller.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`WHCC token request timed out after ${config.timeoutMs}ms.`)
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
    const keyHint = config.key ? `${config.key.slice(0, 4)}…` : '(empty)'
    throw new Error(`WHCC token request failed (${response.status}) [key=${keyHint}]: ${responseText}`)
  }

  const token = getTokenFromResponse(payload)

  if (!token) {
    throw new Error('WHCC token response did not include an access token.')
  }

  const expiresAt = getTokenExpiryFromResponse(payload)
  tokenCache.set(cacheKey, { token, expiresAt })
  pruneTokenCache()

  return { token, accountId }
}

export async function whccJsonRequest(path, { method = 'GET', token, body, accountId } = {}) {
  const config = getWhccConfig()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    const response = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        ...(accountId ? { 'x-whcc-account-id': String(accountId) } : {}),
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