import { handlePreflight, jsonResponse } from './_shared.mjs'
import { validateAdminSession } from './_auth-common.mjs'

/**
 * GET /api/admin-session
 *
 * Returns the current admin session state based on the session cookie.
 */
export async function handler(event) {
  const origin = event.headers.origin || ''

  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight(origin)
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, origin, { error: 'Method not allowed' })
  }

  const session = validateAdminSession(event.headers.cookie || '')

  return jsonResponse(200, origin, {
    authenticated: session.valid,
    email: session.valid ? session.email : null,
    error: session.valid ? null : session.error,
  })
}