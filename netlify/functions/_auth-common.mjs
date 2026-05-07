/**
 * Shared authentication utilities for admin endpoints
 */

function isLocalhostHost(host = '') {
  return host.startsWith('localhost') || host.startsWith('127.0.0.1')
}

function buildSessionCookieHeader(token, expiryDate, secure) {
  const attributes = [
    `admin_session=${token}`,
    'Path=/',
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
      const [name, value] = cookie.split('=')
      if (name && value) {
        cookies[name.trim()] = decodeURIComponent(value.trim())
      }
    })
  }
  return cookies
}

// Create httpOnly session cookie value
export function createSessionCookie(userEmail, expiryDays = 7) {
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + expiryDays)
  
  // Session token: simple base64 encoded email + timestamp for now
  // In production, use a proper JWT with signing
  const token = Buffer.from(`${userEmail}:${Date.now()}`).toString('base64')
  
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
    name: 'admin_session',
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
  const sessionToken = cookies.admin_session
  
  if (!sessionToken) {
    return { valid: false, email: null, error: 'No session cookie' }
  }
  
  try {
    // Decode the session token
    const decoded = Buffer.from(sessionToken, 'base64').toString('utf-8')
    const [email, timestamp] = decoded.split(':')
    
    if (!email || !timestamp) {
      return { valid: false, email: null, error: 'Invalid session token format' }
    }
    
    // Check if session is not expired (7 days default from creation)
    const sessionAge = Date.now() - parseInt(timestamp, 10)
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    
    if (sessionAge > maxAge) {
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
  
  return {
    authorized: true,
    email: session.email,
    error: null,
  }
}
