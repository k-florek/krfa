/**
 * Shared authentication utilities for admin endpoints
 */

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

// Get session cookie header
export function getSessionCookieHeader(userEmail, expiryDays = 7) {
  const { token, expiryDate } = createSessionCookie(userEmail, expiryDays)
  
  return {
    name: 'admin_session',
    header: `admin_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=${expiryDate.toUTCString()}`,
    token,
  }
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
