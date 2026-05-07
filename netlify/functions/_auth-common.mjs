/**
 * Shared authentication utilities for admin endpoints
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

const SESSION_COOKIE_NAME = 'admin_session'
const SESSION_SECRET_ENV = 'ADMIN_SESSION_SECRET'

function isLocalhostHost(host = '') {
  return host.startsWith('localhost') || host.startsWith('127.0.0.1')
}

function buildSessionCookieHeader(token, expiryDate, secure) {
  const attributes = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${secure ? 'Strict' : 'Lax'}`,
    `Expires=${expiryDate.toUTCString()}`,
  ]

  if (secure) {
    attributes.push('Secure')
  }

  return attributes.join('; ')
}

// Parse cookies from request
export function parseCookies(cookieHeader) {
  const cookies = {}
  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie) => {
      const trimmed = cookie.trim()
      if (!trimmed) {
        return
      }

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex <= 0) {
        return
      }

      const name = trimmed.slice(0, separatorIndex)
      const value = trimmed.slice(separatorIndex + 1)

      if (name && value) {
        cookies[name.trim()] = decodeURIComponent(value.trim())
      }
    })
  }
  return cookies
}

function getSessionSecret() {
  const secret = String(process.env[SESSION_SECRET_ENV] || '').trim()
  if (!secret) {
    throw new Error(`Missing ${SESSION_SECRET_ENV} environment variable.`)
  }
  return secret
}

function signPayload(payloadSegment, secret) {
  return createHmac('sha256', secret).update(payloadSegment).digest('base64url')
}

function toSessionToken(payload, secret) {
  const payloadSegment = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = signPayload(payloadSegment, secret)
  return `${payloadSegment}.${signature}`
}

function decodeSessionToken(token, secret) {
  const [payloadSegment, signature] = String(token || '').split('.')

  if (!payloadSegment || !signature) {
    throw new Error('Invalid session token format')
  }

  const expectedSignature = signPayload(payloadSegment, secret)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (
    signatureBuffer.length !== expectedBuffer.length
    || !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid session token signature')
  }

  return JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf-8'))
}

// Create httpOnly session cookie value
export function createSessionCookie(userEmail, expiryDays = 7) {
  const secret = getSessionSecret()
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + expiryDays)

  const issuedAt = Date.now()
  const expiresAt = expiryDate.getTime()
  const token = toSessionToken(
    {
      email: String(userEmail || '').trim().toLowerCase(),
      issuedAt,
      expiresAt,
    },
    secret
  )
  
  return {
    token,
    expiryDate,
  }
}

export function shouldUseSecureCookies(event, origin = '') {
  const forwardedProto = event?.headers?.['x-forwarded-proto'] || event?.headers?.['X-Forwarded-Proto'] || ''
  const host = event?.headers?.host || event?.headers?.Host || ''

  if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
    return false
  }

  if (isLocalhostHost(host)) {
    return false
  }

  if (forwardedProto) {
    return forwardedProto === 'https'
  }

  return true
}

// Get session cookie header
export function getSessionCookieHeader(userEmail, expiryDays = 7, options = {}) {
  const { token, expiryDate } = createSessionCookie(userEmail, expiryDays)
  const secure = options.secure !== false
  
  return {
    name: SESSION_COOKIE_NAME,
    header: buildSessionCookieHeader(token, expiryDate, secure),
    token,
  }
}

export function getClearedSessionCookieHeader(options = {}) {
  const secure = options.secure !== false
  return buildSessionCookieHeader('', new Date(0), secure)
}

// Validate admin session from cookie
export function validateAdminSession(cookieHeader) {
  const cookies = parseCookies(cookieHeader)
  const sessionToken = cookies[SESSION_COOKIE_NAME]
  
  if (!sessionToken) {
    return { valid: false, email: null, error: 'No session cookie' }
  }
  
  try {
    const payload = decodeSessionToken(sessionToken, getSessionSecret())
    const email = String(payload?.email || '').trim().toLowerCase()
    const expiresAt = Number(payload?.expiresAt)

    if (!email || !Number.isFinite(expiresAt)) {
      return { valid: false, email: null, error: 'Invalid session token format' }
    }

    if (Date.now() >= expiresAt) {
      return { valid: false, email: null, error: 'Session expired' }
    }
    
    return { valid: true, email }
  } catch (error) {
    return { valid: false, email: null, error: `Failed to parse session: ${error.message}` }
  }
}

// Check if email is in admin whitelist
export function isEmailAuthorized(email) {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  
  return adminEmails.includes(email.toLowerCase())
}

// Middleware: Check authorization via session cookie
export function requireAdminSession(event) {
  const cookieHeader = event.headers.cookie || ''
  const session = validateAdminSession(cookieHeader)
  
  if (!session.valid) {
    return {
      authorized: false,
      email: null,
      error: session.error,
    }
  }

  if (!isEmailAuthorized(session.email)) {
    return {
      authorized: false,
      email: null,
      error: 'Session user is not authorized',
    }
  }
  
  return {
    authorized: true,
    email: session.email,
    error: null,
  }
}
