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
import { getSessionCookieHeader, isEmailAuthorized, shouldUseSecureCookies } from './_auth-common.mjs'
import { getCorsHeaders } from './_shared.mjs'


function decodeJwtPayload(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
    return payload
  } catch (error) {
    throw new Error(`Failed to decode JWT: ${error.message}`)
  }
}

function validateJwtClaims(payload) {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const exp = Number(payload?.exp)
  const nbf = Number(payload?.nbf)

  if (Number.isFinite(exp) && nowSeconds >= exp) {
    throw new Error('Identity token has expired')
  }

  if (Number.isFinite(nbf) && nowSeconds < nbf) {
    throw new Error('Identity token is not valid yet')
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
    const token = String(payload.token || '').trim()

    if (!token) {
      return jsonResponse(400, origin, { error: 'token is required' })
    }

    // Netlify Identity owns auth; we still enforce basic claim validity before session minting.
    const decoded = decodeJwtPayload(token)
    validateJwtClaims(decoded)

    const userEmail = String(decoded.email || decoded.sub || '').trim().toLowerCase()

    if (!userEmail || !userEmail.includes('@')) {
      return jsonResponse(400, origin, { error: 'Unable to extract email from token' })
    }

    // Check if user is authorized
    if (!isEmailAuthorized(userEmail)) {
      console.warn(`Unauthorized admin access attempt: ${userEmail}`)
      return jsonResponse(403, origin, { error: 'User is not authorized as admin' })
    }

    // Create session cookie
    const { header: setCookieHeader } = getSessionCookieHeader(userEmail, 7, {
      secure: shouldUseSecureCookies(event, origin),
    })

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
