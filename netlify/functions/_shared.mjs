const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)

function isImplicitlyAllowedOrigin(origin = '') {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    || /^https:\/\/[a-z0-9-]+\.netlify\.app$/.test(origin)
    || /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.netlify\.app$/.test(origin)
}

export function getCorsHeaders(origin) {
  const allowedOrigin = allowedOrigins.includes(origin) || isImplicitlyAllowedOrigin(origin)
    ? origin
    : allowedOrigins[0] || '*'

  return {
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    'access-control-allow-credentials': 'true',
  }
}

export function handlePreflight(origin) {
  return {
    statusCode: 204,
    headers: getCorsHeaders(origin),
    body: '',
  }
}

export function jsonResponse(statusCode, origin, payload) {
  return {
    statusCode,
    headers: {
      ...getCorsHeaders(origin),
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  }
}
