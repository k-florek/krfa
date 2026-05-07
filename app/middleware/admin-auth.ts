/**
 * Middleware to protect admin routes
 * Redirects to /admin/login if no valid session cookie
 */

export default defineNuxtRouteMiddleware((to, from) => {
  // Only check on client-side
  if (process.server) return

  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.split('=')
    acc[name?.trim()] = value?.trim()
    return acc
  }, {} as Record<string, string>)

  const hasSession = !!cookies.admin_session

  // If accessing admin routes without session, redirect to login
  if (to.path.startsWith('/admin') && !hasSession && to.path !== '/admin/login') {
    return navigateTo('/admin/login')
  }

  // If already logged in and visiting login page, redirect to admin dashboard
  if (to.path === '/admin/login' && hasSession) {
    return navigateTo('/admin/orders')
  }
})
