/**
 * Middleware to protect admin routes
 * Redirects to /admin/login if no valid session cookie
 */

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server || !to.path.startsWith('/admin')) return

  const { isAuthenticated, refreshSession, sessionState } = useAdminAuth()

  if (sessionState.value === 'unknown') {
    await refreshSession()
  }

  if (to.path === '/admin/login') {
    if (isAuthenticated.value) {
      return navigateTo('/admin')
    }

    return
  }

  if (!isAuthenticated.value) {
    return navigateTo('/admin/login')
  }
})
