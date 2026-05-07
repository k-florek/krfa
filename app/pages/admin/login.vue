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

// Initialize Netlify Identity
onMounted(() => {
  // Load Netlify Identity script if not already loaded
  if (!window.netlifyIdentity) {
    const script = document.createElement('script')
    script.src = 'https://identity.netlify.com/v1/netlify-identity-widget.js'
    script.async = true
    document.head.appendChild(script)
  }
})

const handleLogin = async () => {
  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (!window.netlifyIdentity) {
      throw new Error('Netlify Identity is not loaded. Please refresh the page and try again.')
    }

    // Open Netlify Identity modal
    window.netlifyIdentity.open('login')

    // Wait for authentication to complete
    const user = await new Promise<any>((resolve, reject) => {
      const handleClose = () => {
        const user = window.netlifyIdentity.currentUser()
        if (user) {
          resolve(user)
        } else {
          reject(new Error('Login cancelled'))
        }
        window.netlifyIdentity.off('close', handleClose)
      }

      // Set a timeout in case the user takes too long
      const timeout = setTimeout(() => {
        window.netlifyIdentity.off('close', handleClose)
        reject(new Error('Login timeout'))
      }, 5 * 60 * 1000) // 5 minutes

      window.netlifyIdentity.on('close', () => {
        clearTimeout(timeout)
        handleClose()
      })
    })

    // Get the JWT token from the user
    const token = user.token?.access_token

    if (!token) {
      throw new Error('Failed to obtain authentication token')
    }

    successMessage.value = 'Authentication successful! Verifying access...'

    // Send token to backend to verify and set session cookie
    const response = await fetch('/api/verify-admin', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to verify admin access')
    }

    // Redirect to admin dashboard
    await navigateTo('/admin/orders')
  } catch (error) {
    console.error('Login error:', error)
    errorMessage.value = error instanceof Error ? error.message : 'An unexpected error occurred'
    isLoading.value = false
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
