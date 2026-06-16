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
type CartItem = {
  id: string
  productTitle: string
  variantLabel: string
  quantity: number
  priceCents: number
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

const callbackStatus = ref('')
const callbackError = ref('')
const submitError = ref('')
const submitSuccess = ref('')
const submitting = ref(false)

const items = ref<CartItem[]>([])

const subtotalCents = computed(() =>
  items.value.reduce((sum, item) => sum + item.priceCents * item.quantity, 0)
)

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

function onQuantityInputEvent(_itemId: string, _event: Event) {
  // TODO: implement cart quantity update
}

function removeItem(_itemId: string) {
  // TODO: implement cart item removal
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function submitOrder() {
  // TODO: implement order submission
}

useSeoMeta({
  title: 'Cart & Checkout',
  description: 'Review your cart, enter shipping, and submit your print order.',
})
</script>

