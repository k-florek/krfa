/**
 * Composable for admin authentication state and actions
 */

export const useAdminAuth = () => {
  const isAuthenticated = computed(() => {
    if (process.server) return false
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [name, value] = cookie.split('=')
      acc[name?.trim()] = value?.trim()
      return acc
    }, {} as Record<string, string>)
    return !!cookies.admin_session
  })

  const logout = () => {
    // Clear the session cookie by setting its expiration to the past
    if (!process.server) {
      document.cookie = 'admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC;'
      navigateTo('/')
    }
  }

  return {
    isAuthenticated,
    logout,
  }
}
