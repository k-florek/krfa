<template>
  <section class="admin-hub">
    <div class="admin-hub__hero panel">
      <div>
        <p class="admin-hub__eyebrow">Admin</p>
        <h1>Admin Home</h1>
        <p class="subtitle">
          Use this page to confirm auth state and check the current environment.
        </p>
      </div>

      <div class="admin-hub__actions">
        <button class="btn btn-secondary" @click="handleLogout">Sign Out</button>
      </div>
    </div>

    <p v-if="sessionError && sessionError !== 'No session cookie'" class="status error">
      {{ sessionError }}
    </p>

    <div class="admin-hub__grid">
      <article class="panel admin-hub__card">
        <h2>Session</h2>
        <p><strong>Status:</strong> {{ isChecking ? 'Checking session…' : 'Authenticated' }}</p>
        <p><strong>Admin email:</strong> {{ adminEmail || 'Unavailable' }}</p>
        <p><strong>Cookie source:</strong> Server-validated Netlify function session</p>
      </article>

      <article class="panel admin-hub__card">
        <h2>Environment</h2>
        <p><strong>Site:</strong> {{ environmentLabel }}</p>
        <p><strong>API base:</strong> {{ apiBaseLabel }}</p>
        <p><strong>Recommended local flow:</strong> `netlify dev`</p>
      </article>

    </div>
  </section>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'admin-auth',
})

const { adminEmail, isChecking, logout, refreshSession, sessionError } = useAdminAuth()

const environmentLabel = computed(() => {
  if (import.meta.server) {
    return 'Netlify deploy'
  }

  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'Local via Netlify Dev'
    : 'Netlify deploy'
})

const apiBaseLabel = computed(() => {
  const config = useRuntimeConfig()
  return config.public.checkoutApiBaseUrl || 'same-origin /api'
})

async function handleLogout() {
  await logout()
}

onMounted(async () => {
  await refreshSession()
})

useSeoMeta({
  title: 'Admin Home',
  description: 'Admin dashboard and authentication status.',
  robots: 'noindex,nofollow',
})
</script>