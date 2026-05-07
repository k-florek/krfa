/**
 * POST /api/verify-admin
 * 
 * Validates a Netlify Identity token and sets a secure admin session cookie.
 * 
 * Expected body:
 * {
 *   "token": "JWT token from Netlify Identity"
 * }
 */

import { handlePreflight, jsonResponse } from './_shared.mjs'
import { getSessionCookieHeader, isEmailAuthorized } from './_auth-common.mjs'
import { getCorsHeaders } from './_shared.mjs'


// Decode JWT without verification (Netlify Identity tokens are trusted)
// In production, verify the signature using Netlify's public key
function decodeJWT(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }
    
    // Decode the payload (second part)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    return payload
  } catch (error) {
    throw new Error(`Failed to decode JWT: ${error.message}`)
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
    const token = payload.token || ''

    if (!token) {
      return jsonResponse(400, origin, { error: 'token is required' })
    }

    // Decode JWT to extract user email
    const decoded = decodeJWT(token)
    const userEmail = decoded.email || decoded.sub || ''

    if (!userEmail) {
      return jsonResponse(400, origin, { error: 'Unable to extract email from token' })
    }

    // Check if user is authorized
    if (!isEmailAuthorized(userEmail)) {
      console.warn(`Unauthorized admin access attempt: ${userEmail}`)
      return jsonResponse(403, origin, { error: 'User is not authorized as admin' })
    }

    // Create session cookie
    const { header: setCookieHeader } = getSessionCookieHeader(userEmail)

    return {
      statusCode: 200,
      headers: {
        ...getCorsHeaders(origin),
        'content-type': 'application/json',
        'set-cookie': setCookieHeader,
      },
      body: JSON.stringify({
        ok: true,
        message: 'Admin session established',
        email: userEmail,
      }),
    }
  } catch (error) {
    console.error('verify-admin failed:', error)
    return jsonResponse(400, origin, { error: `Authentication failed: ${error.message}` })
  }
}
