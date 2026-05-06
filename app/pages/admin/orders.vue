<template>
  <section class="admin-orders">
    <h1>Order Review</h1>
    <p class="subtitle">Review paid orders, approve them, and submit approved orders to WHCC.</p>

    <div class="auth-row">
      <label for="token">Admin API Token</label>
      <input id="token" v-model="adminToken" type="password" placeholder="Paste ADMIN_API_TOKEN" />
      <button @click="saveToken">Save Token</button>
    </div>

    <div class="controls">
      <select v-model="statusFilter">
        <option value="pending_approval">Pending Approval</option>
        <option value="approved">Approved</option>
        <option value="submitted_to_whcc">Submitted to WHCC</option>
      </select>
      <button @click="loadOrders" :disabled="loading">{{ loading ? 'Loading...' : 'Refresh' }}</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="!orders.length && !loading" class="empty">
      No orders found for this status.
    </div>

    <ul class="orders-list">
      <li v-for="order in orders" :key="order.id" class="order-card">
        <div class="order-head">
          <h3>{{ order.id }}</h3>
          <span class="status">{{ order.status }}</span>
        </div>
        <p><strong>Email:</strong> {{ order.customer_email || 'Unknown' }}</p>
        <p><strong>Amount:</strong> {{ formatMoney(order.amount_total, order.currency) }}</p>
        <p><strong>Stripe Session:</strong> {{ order.stripe_session_id }}</p>
        <p v-if="order.whcc_last_error" class="error">
          <strong>WHCC Error:</strong> {{ order.whcc_last_error }}
        </p>

        <details>
          <summary>Line Items</summary>
          <pre>{{ JSON.stringify(order.line_items, null, 2) }}</pre>
        </details>

        <div class="actions">
          <button
            v-if="order.status === 'pending_approval'"
            @click="approve(order.id)"
            :disabled="workingOrderId === order.id"
          >
            Approve
          </button>
          <button
            v-if="order.status === 'approved'"
            @click="submitWhcc(order.id)"
            :disabled="workingOrderId === order.id"
          >
            Submit to WHCC
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

type OrderRecord = {
  id: string
  status: string
  customer_email: string | null
  amount_total: number
  currency: string
  stripe_session_id: string
  line_items: unknown
  whcc_last_error: string | null
}

const config = useRuntimeConfig()
const orders = ref<OrderRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const workingOrderId = ref<string | null>(null)
const statusFilter = ref<'pending_approval' | 'approved' | 'submitted_to_whcc'>('pending_approval')
const adminToken = ref('')

onMounted(() => {
  if (import.meta.client) {
    adminToken.value = localStorage.getItem('krfa-admin-token') || ''
  }
  loadOrders()
})

function saveToken() {
  if (!import.meta.client) {
    return
  }
  localStorage.setItem('krfa-admin-token', adminToken.value)
}

async function loadOrders() {
  loading.value = true
  error.value = null

  try {
    const response = await callApi(`/api/list-orders?status=${statusFilter.value}`, 'GET')
    orders.value = response.orders || []
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : 'Failed to load orders.'
  } finally {
    loading.value = false
  }
}

async function approve(orderId: string) {
  await runAction(orderId, '/api/approve-order')
}

async function submitWhcc(orderId: string) {
  await runAction(orderId, '/api/submit-whcc-order')
}

async function runAction(orderId: string, path: string) {
  workingOrderId.value = orderId
  error.value = null

  try {
    await callApi(path, 'POST', { orderId })
    await loadOrders()
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Action failed.'
  } finally {
    workingOrderId.value = null
  }
}

async function callApi(path: string, method: 'GET' | 'POST', body?: unknown) {
  const baseUrl = (config.public.checkoutApiBaseUrl || '').replace(/\/$/, '')

  if (!baseUrl) {
    throw new Error('NUXT_PUBLIC_CHECKOUT_API_BASE_URL is not configured.')
  }

  if (!adminToken.value) {
    throw new Error('Admin token is required.')
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${adminToken.value}`,
    },
    body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed.')
  }

  return payload
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
  }).format((cents || 0) / 100)
}

useSeoMeta({
  title: 'Order Admin',
  description: 'Internal order review and fulfillment controls.',
  robots: 'noindex,nofollow',
})
</script>

<style scoped>
.admin-orders {
  max-width: 1000px;
  margin: 2.5rem auto;
  padding: 1rem;
}

.subtitle {
  color: var(--color-text-muted);
  margin-bottom: 1rem;
}

.auth-row,
.controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.8rem;
  flex-wrap: wrap;
}

input,
select,
button {
  border: 1px solid var(--color-border-muted);
  border-radius: 8px;
  padding: 0.45rem 0.65rem;
}

button {
  background: #1d4ed8;
  color: #fff;
  cursor: pointer;
}

.orders-list {
  list-style: none;
  display: grid;
  gap: 0.8rem;
}

.order-card {
  border: 1px solid var(--color-border-muted);
  border-radius: 12px;
  padding: 1rem;
  background: #fff;
}

.order-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.status {
  background: #eef2ff;
  color: #1e3a8a;
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  font-size: 0.8rem;
}

.error {
  color: #b42318;
}

.actions {
  margin-top: 0.8rem;
}

pre {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
