/**
 * Composable for admin authentication state and actions
 */

type AdminSessionResponse = {
  authenticated: boolean
  email: string | null
  error?: string | null
}

type NetlifyIdentityUser = {
  jwt: () => Promise<string>
}

let pendingRefresh: Promise<AdminSessionResponse> | null = null
let pendingIdentityExchange: Promise<void> | null = null

function getAdminApiBaseUrl() {
  const config = useRuntimeConfig()
  return (config.public.checkoutApiBaseUrl || '').replace(/\/$/, '')
}

function getAdminApiUrl(path: string) {
  return `${getAdminApiBaseUrl()}${path}`
}

async function parseJsonResponse(response: Response) {
  const text = await response.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

export const useAdminAuth = () => {
  const sessionState = useState<'unknown' | 'authenticated' | 'unauthenticated'>('admin-session-state', () => 'unknown')
  const adminEmail = useState<string | null>('admin-session-email', () => null)
  const sessionError = useState<string | null>('admin-session-error', () => null)
  const isChecking = useState<boolean>('admin-session-checking', () => false)

  const isAuthenticated = computed(() => sessionState.value === 'authenticated')

  const refreshSession = async (force = false) => {
    if (import.meta.server) {
      return {
        authenticated: false,
        email: null,
        error: null,
      }
    }

    if (pendingRefresh && !force) {
      return pendingRefresh
    }

    isChecking.value = true
    sessionError.value = null

    pendingRefresh = (async () => {
      try {
        const response = await fetch(getAdminApiUrl('/api/admin-session'), {
          credentials: 'include',
          headers: {
            accept: 'application/json',
          },
        })
        const payload = await parseJsonResponse(response) as AdminSessionResponse

        if (!response.ok) {
          throw new Error(payload.error || 'Unable to verify the admin session.')
        }

        sessionState.value = payload.authenticated ? 'authenticated' : 'unauthenticated'
        adminEmail.value = payload.email || null
        sessionError.value = payload.authenticated ? null : (payload.error || null)

        return payload
      } catch (error) {
        sessionState.value = 'unauthenticated'
        adminEmail.value = null
        sessionError.value = error instanceof Error ? error.message : 'Unable to verify the admin session.'

        return {
          authenticated: false,
          email: null,
          error: sessionError.value,
        }
      } finally {
        isChecking.value = false
        pendingRefresh = null
      }
    })()

    return pendingRefresh
  }

  const waitForIdentity = async (timeoutMs = 5000) => {
    if (import.meta.server) {
      throw new Error('Netlify Identity is only available in the browser.')
    }

    const startedAt = Date.now()

    return await new Promise<any>((resolve, reject) => {
      const check = () => {
        if (window.netlifyIdentity) {
          resolve(window.netlifyIdentity)
          return
        }

        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error('Netlify Identity is not loaded.'))
          return
        }

        window.setTimeout(check, 50)
      }

      check()
    })
  }

  const establishSession = async (user: NetlifyIdentityUser) => {
    if (pendingIdentityExchange) {
      return pendingIdentityExchange
    }

    pendingIdentityExchange = (async () => {
      const token = await user.jwt()

      if (!token) {
        throw new Error('Failed to obtain authentication token.')
      }

      const response = await fetch(getAdminApiUrl('/api/verify-admin'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })
      const payload = await parseJsonResponse(response) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to verify admin access.')
      }

      await refreshSession(true)
    })()

    try {
      await pendingIdentityExchange
    } finally {
      pendingIdentityExchange = null
    }
  }

  const logout = async () => {
    if (import.meta.server) {
      return
    }

    try {
      await fetch(getAdminApiUrl('/api/admin-logout'), {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      sessionState.value = 'unauthenticated'
      adminEmail.value = null
      sessionError.value = null
      isChecking.value = false
      await navigateTo('/admin/login')
    }
  }

  return {
    adminEmail,
    establishSession,
    isAuthenticated,
    isChecking,
    logout,
    refreshSession,
    sessionError,
    sessionState,
    waitForIdentity,
  }
}
