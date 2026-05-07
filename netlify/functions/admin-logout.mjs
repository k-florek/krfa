import { getClearedSessionCookieHeader, shouldUseSecureCookies } from './_auth-common.mjs'
import { getCorsHeaders, handlePreflight, jsonResponse } from './_shared.mjs'

/**
 * POST /api/admin-logout
 *
 * Clears the current admin session cookie.
 */
export async function handler(event) {
  const origin = event.headers.origin || ''

  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight(origin)
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, origin, { error: 'Method not allowed' })
  }

  return {
    statusCode: 200,
    headers: {
      ...getCorsHeaders(origin),
      'content-type': 'application/json',
      'set-cookie': getClearedSessionCookieHeader({
        secure: shouldUseSecureCookies(event, origin),
      }),
    },
    body: JSON.stringify({ ok: true }),
  }
}