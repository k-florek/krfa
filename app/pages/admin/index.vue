<template>
  <section class="admin-hub">
    <div class="admin-hub__hero panel">
      <div>
        <p class="admin-hub__eyebrow">Admin</p>
        <h1>Admin Home</h1>
        <p class="subtitle">
          Use this page to confirm auth state, check the current environment, and jump into order review.
        </p>
      </div>

      <div class="admin-hub__actions">
        <NuxtLink to="/admin/orders" class="btn btn-primary">Open Orders</NuxtLink>
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

      <article class="panel admin-hub__card">
        <h2>Order Summary</h2>
        <p v-if="summaryLoading">Loading pending orders…</p>
        <template v-else>
          <p><strong>Pending approval:</strong> {{ pendingCount }}</p>
          <p><strong>Summary status:</strong> {{ summaryError ? 'Unavailable' : 'Ready' }}</p>
        </template>
        <p v-if="summaryError" class="status error admin-hub__status">{{ summaryError }}</p>
        <button class="btn btn-secondary" @click="loadSummary" :disabled="summaryLoading">
          {{ summaryLoading ? 'Refreshing…' : 'Refresh Summary' }}
        </button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'admin-auth',
})

type OrdersResponse = {
  orders?: Array<unknown>
}

const { adminEmail, isChecking, logout, refreshSession, sessionError } = useAdminAuth()
const { callAdminApi } = useAdminApi()

const pendingCount = ref(0)
const summaryError = ref('')
const summaryLoading = ref(false)

const environmentLabel = computed(() => {
  if (process.server) {
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

async function loadSummary() {
  summaryLoading.value = true
  summaryError.value = ''

  try {
    const payload = await callAdminApi<OrdersResponse>('/api/list-orders?status=pending_approval')
    pendingCount.value = payload.orders?.length || 0
  } catch (error) {
    summaryError.value = error instanceof Error ? error.message : 'Unable to load the order summary.'
  } finally {
    summaryLoading.value = false
  }
}

async function handleLogout() {
  await logout()
}

onMounted(async () => {
  await refreshSession()
  await loadSummary()
})

useSeoMeta({
  title: 'Admin Home',
  description: 'Admin dashboard and order summary.',
  robots: 'noindex,nofollow',
})
</script>