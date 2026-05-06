const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)

export function getCorsHeaders(origin) {
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*'

  return {
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,stripe-signature,authorization',
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
