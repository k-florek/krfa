<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
      <h1 class="text-3xl font-bold text-center mb-2">Admin Login</h1>
      <p class="text-gray-600 text-center mb-8">Sign in with your Netlify Identity account to access the admin dashboard.</p>

      <div class="space-y-4">
        <button
          @click="handleLogin"
          :disabled="isLoading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
        >
          {{ isLoading ? 'Signing in...' : 'Sign in with Netlify' }}
        </button>

        <div v-if="errorMessage" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {{ successMessage }}
        </div>
      </div>

      <p class="text-sm text-gray-500 text-center mt-8">
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
/* Ensure Netlify Identity modal appears on top */
:deep(.netlify-identity-widget) {
  z-index: 9999 !important;
}
</style>
