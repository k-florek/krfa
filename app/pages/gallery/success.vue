<template>
  <section class="checkout-status checkout-flow">
    <h1 class="watercolor-heading">Your Cart</h1>

    <p v-if="callbackStatus" class="status">
      {{ callbackStatus }}
    </p>
    <p v-if="callbackError" class="status error">
      {{ callbackError }}
    </p>

    <div v-if="!items.length" class="panel">
      <p>Your cart is empty.</p>
      <div class="actions-row">
        <NuxtLink to="/gallery" class="btn btn-primary">Browse Prints</NuxtLink>
      </div>
    </div>

    <div v-else class="checkout-grid">
      <div class="panel">
        <h2>Items</h2>
        <ul class="checkout-items">
          <li v-for="item in items" :key="item.id" class="checkout-item-row">
            <div>
              <p class="checkout-item-title">{{ item.productTitle }}</p>
              <p class="checkout-item-meta">{{ item.variantLabel }}</p>
            </div>

            <div class="checkout-item-controls">
              <label>
                Qty
                <input
                  type="number"
                  min="1"
                  :value="item.quantity"
                  @input="onQuantityInputEvent(item.id, $event)"
                />
              </label>
              <strong>{{ formatMoney(item.priceCents * item.quantity) }}</strong>
              <button class="btn btn-outline-dark" @click="removeItem(item.id)">Remove</button>
            </div>
          </li>
        </ul>
      </div>

      <div class="panel">
        <h2>Shipping</h2>
        <form class="shipping-form" @submit.prevent="submitOrder">
          <label>
            Full Name
            <input v-model="shipping.name" required />
          </label>

          <label>
            Company / Attn (optional)
            <input v-model="shipping.attn" />
          </label>

          <label>
            Address Line 1
            <input v-model="shipping.addr1" required />
          </label>

          <label>
            Address Line 2 (optional)
            <input v-model="shipping.addr2" />
          </label>

          <div class="shipping-row">
            <label>
              City
              <input v-model="shipping.city" required />
            </label>
            <label>
              State
              <input v-model="shipping.state" required />
            </label>
          </div>

          <div class="shipping-row">
            <label>
              ZIP
              <input v-model="shipping.zip" required />
            </label>
            <label>
              Country Code
              <input v-model="shipping.country" maxlength="2" required />
            </label>
          </div>

          <label>
            Phone
            <input v-model="shipping.phone" required />
          </label>

          <label>
            Notification Email (optional)
            <input v-model="shipping.sendNotificationEmailAddress" type="email" />
          </label>

          <p class="checkout-total">
            Subtotal: <strong>{{ formatMoney(subtotalCents) }}</strong>
          </p>

          <p v-if="submitError" class="status error">{{ submitError }}</p>
          <p v-if="submitSuccess" class="status success">{{ submitSuccess }}</p>

          <button class="btn btn-primary btn-block" :disabled="submitting || !items.length">
            {{ submitting ? 'Submitting order...' : 'Place Order' }}
          </button>
        </form>
      </div>
    </div>

    <div class="actions-row">
      <NuxtLink to="/gallery" class="btn btn-secondary">Continue Shopping</NuxtLink>
      <NuxtLink to="/" class="btn btn-outline-dark">Back to Home</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { WhccCartItem } from '@/composables/useWhccCart'

type PendingLaunchItem = {
  productId: string
  variantId: string
  productTitle: string
  variantLabel: string
  quantity: number
  priceCents: number
  currency: 'usd'
  whccSku: string | null
  whccProductId?: string
  whccDesignId?: string
  createdAt: string
}

type ShippingForm = {
  name: string
  attn: string
  addr1: string
  addr2: string
  city: string
  state: string
  zip: string
  country: string
  phone: string
  sendNotificationEmailAddress: string
}

const config = useRuntimeConfig()
const route = useRoute()
const {
  items,
  subtotalCents,
  addOrUpdateItem,
  removeItem,
  updateQuantity,
  clearCart,
  loadFromStorage,
} = useWhccCart()

const callbackStatus = ref('')
const callbackError = ref('')
const submitError = ref('')
const submitSuccess = ref('')
const submitting = ref(false)
const processedEditorIds = useState<string[]>('processed-editor-ids', () => [])

const shipping = ref<ShippingForm>({
  name: '',
  attn: '',
  addr1: '',
  addr2: '',
  city: '',
  state: '',
  zip: '',
  country: 'US',
  phone: '',
  sendNotificationEmailAddress: '',
})

const PENDING_STORAGE_KEY = 'krfa-whcc-pending-launches-v1'

onMounted(async () => {
  loadFromStorage()
  await processWhccReturn()
})

function onQuantityInput(itemId: string, inputValue: string) {
  const parsed = Number.parseInt(inputValue, 10)
  updateQuantity(itemId, parsed)
}

function onQuantityInputEvent(itemId: string, event: Event) {
  const target = event.target as HTMLInputElement | null
  onQuantityInput(itemId, target?.value || '0')
}

function getApiUrl(path: string) {
  const baseUrl = (config.public.checkoutApiBaseUrl || '').replace(/\/$/, '')
  return baseUrl ? `${baseUrl}${path}` : path
}

function readPendingLaunches(): Record<string, PendingLaunchItem> {
  if (import.meta.server) {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(PENDING_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writePendingLaunches(launches: Record<string, PendingLaunchItem>) {
  if (import.meta.server) {
    return
  }

  window.localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(launches))
}

async function processWhccReturn() {
  const checkoutId = String(route.query.checkout_id || '').trim()
  const editorId = String(route.query.editor_id || '').trim()

  if (!checkoutId || !editorId || processedEditorIds.value.includes(editorId)) {
    return
  }

  callbackError.value = ''
  callbackStatus.value = 'Finalizing your edited item and adding it to cart...'

  const pendingLaunches = readPendingLaunches()
  const pendingItem = pendingLaunches[checkoutId]

  if (!pendingItem) {
    callbackStatus.value = ''
    callbackError.value = 'Could not find this editor launch in local state. Add the item again from the gallery.'
    return
  }

  try {
    const response = await fetch(getApiUrl('/api/whcc-editor-complete'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        checkoutId,
        editorId,
        pendingItem,
      }),
    })

    const payload = (await response.json()) as {
      cartItem?: WhccCartItem
      error?: string
    }

    if (!response.ok || !payload.cartItem) {
      throw new Error(payload.error || 'Unable to finalize edited item.')
    }

    addOrUpdateItem(payload.cartItem)
    delete pendingLaunches[checkoutId]
    writePendingLaunches(pendingLaunches)
    processedEditorIds.value = [...processedEditorIds.value, editorId]
    callbackStatus.value = 'Item added to cart.'
  } catch (error) {
    callbackStatus.value = ''
    callbackError.value = error instanceof Error ? error.message : 'Failed to add item to cart.'
  }
}

async function submitOrder() {
  submitError.value = ''
  submitSuccess.value = ''

  if (!items.value.length) {
    submitError.value = 'Your cart is empty.'
    return
  }

  submitting.value = true

  try {
    const response = await fetch(getApiUrl('/api/submit-whcc-order'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        cartItems: items.value,
        shipping: shipping.value,
      }),
    })

    const payload = (await response.json()) as {
      confirmationId?: string
      confirmationMessage?: string
      error?: string
    }

    if (!response.ok || !payload.confirmationId) {
      throw new Error(payload.error || 'Unable to place order.')
    }

    clearCart()
    submitSuccess.value = `${payload.confirmationMessage || 'Order submitted.'} Confirmation ID: ${payload.confirmationId}`
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'Unable to place order.'
  } finally {
    submitting.value = false
  }
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

useSeoMeta({
  title: 'Cart & Checkout',
  description: 'Review your cart, enter shipping, and submit your print order.',
})
</script>

