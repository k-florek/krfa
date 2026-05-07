<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="login-title">Admin Login</h1>
      <p class="login-subtitle">Sign in with your Netlify Identity account to access the admin dashboard.</p>

      <div class="login-actions">
        <button
          @click="handleLogin"
          :disabled="isLoading"
          class="login-btn"
        >
          {{ isLoading ? 'Signing in...' : 'Sign in with Netlify' }}
        </button>

        <div v-if="errorMessage" class="login-message login-message--error">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="login-message login-message--success">
          {{ successMessage }}
        </div>
      </div>

      <p class="login-footer">
        Not authorized? Contact the site administrator.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'admin-auth',
})

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
let removeLoginListener: (() => void) | null = null

const {
  establishSession,
  isAuthenticated,
  refreshSession,
  sessionError,
  waitForIdentity,
} = useAdminAuth()

const finalizeLogin = async (user: { jwt: () => Promise<string> }) => {
  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = 'Authentication successful! Verifying access...'

  try {
    await establishSession(user)
    await navigateTo('/admin')
  } catch (error) {
    console.error('Login error:', error)
    errorMessage.value = error instanceof Error ? error.message : 'An unexpected error occurred'
    successMessage.value = ''
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  const session = await refreshSession(true)

  if (session.authenticated || isAuthenticated.value) {
    await navigateTo('/admin')
    return
  }

  if (sessionError.value && sessionError.value !== 'No session cookie') {
    errorMessage.value = sessionError.value
  }

  try {
    const identity = await waitForIdentity()
    const handleIdentityLogin = async (user: { jwt: () => Promise<string> }) => {
      await finalizeLogin(user)
    }

    identity.on('login', handleIdentityLogin)
    removeLoginListener = () => {
      identity.off('login', handleIdentityLogin)
    }

    const existingUser = identity.currentUser()
    if (existingUser) {
      await finalizeLogin(existingUser)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to initialize Netlify Identity.'
  }
})

onBeforeUnmount(() => {
  removeLoginListener?.()
})

const handleLogin = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    isLoading.value = true
    const identity = await waitForIdentity()
    identity.open('login')
  } catch (error) {
    console.error('Login error:', error)
    errorMessage.value = error instanceof Error ? error.message : 'An unexpected error occurred'
  } finally {
    if (!successMessage.value) {
      isLoading.value = false
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background-color: var(--color-bg-body);
}

.login-card {
  width: 100%;
  max-width: 28rem;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  padding: 2.5rem 2rem;
}

.login-title {
  font-size: 1.75rem;
  text-align: center;
  margin-bottom: 0.5rem;
}

.login-subtitle {
  color: var(--color-text-secondary, #6b7280);
  text-align: center;
  margin-bottom: 2rem;
  font-size: 1rem;
}

.login-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-btn {
  width: 100%;
  background-color: #2563eb;
  color: white;
  font-weight: 600;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.login-btn:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.login-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.login-message {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
}

.login-message--error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.login-message--success {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #15803d;
}

.login-footer {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  text-align: center;
  margin-top: 2rem;
}

/* Ensure Netlify Identity modal appears on top */
:deep(.netlify-identity-widget) {
  z-index: 9999 !important;
}
</style>
