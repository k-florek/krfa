<template>
  <section class="gallery-page">
    <div class="gallery-header">
      <div>
        <p class="artist-label">Collect Work</p>
        <h1 class="watercolor-heading">Gallery Shop</h1>
        <p class="subtitle">Choose prints now and prepare originals for future releases.</p>
      </div>
      <NuxtLink to="/" class="back-home">Back to Home</NuxtLink>
    </div>

    <div class="shop-layout">
      <section class="products-panel">
        <div class="filters">
          <button
            v-for="option in filterOptions"
            :key="option.value"
            :class="['filter-btn', { active: selectedFilter === option.value }]"
            @click="selectedFilter = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <div v-if="error" class="status error">{{ error }}</div>
        <div v-else-if="loading" class="status loading">Loading gallery catalog...</div>

        <div v-else class="products-grid">
          <article v-for="product in filteredProducts" :key="product.id" class="product-card">
            <img :src="product.image.src" :alt="product.image.alt" class="product-image" loading="lazy" />
            <div class="product-content">
              <p class="product-type">{{ product.type === 'print' ? 'Print' : 'Original' }}</p>
              <h3>{{ product.title }}</h3>
              <p class="product-description">{{ product.description }}</p>
              <p class="product-medium">{{ product.medium }}</p>

              <label class="variant-label" :for="`variant-${product.id}`">Size / Option</label>
              <select
                :id="`variant-${product.id}`"
                v-model="selectedVariants[product.id]"
                class="variant-select"
              >
                <option
                  v-for="variant in product.variants"
                  :key="variant.id"
                  :value="variant.id"
                  :disabled="!variant.inStock"
                >
                  {{ variant.label }} - {{ formatMoney(variant.priceCents) }}{{ variant.inStock ? '' : ' (Sold Out)' }}
                </option>
              </select>

              <button class="add-cart" :disabled="!canAddToCart(product)" @click="addToCart(product)">
                {{ canAddToCart(product) ? 'Add to Cart' : 'Unavailable' }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <aside class="cart-panel">
        <h2>Cart ({{ itemCount }})</h2>

        <div v-if="items.length === 0" class="empty-cart">
          Your cart is empty.
        </div>

        <ul v-else class="cart-items">
          <li v-for="item in items" :key="`${item.productId}-${item.variantId}`" class="cart-item">
            <img :src="item.imageSrc" :alt="item.productTitle" class="cart-thumb" loading="lazy" />
            <div class="cart-item-content">
              <p class="cart-item-title">{{ item.productTitle }}</p>
              <p class="cart-item-variant">{{ item.variantLabel }}</p>
              <p class="cart-item-price">{{ formatMoney(item.unitPriceCents) }}</p>
              <div class="qty-row">
                <button @click="decreaseItem(item)">-</button>
                <span>{{ item.quantity }}</span>
                <button @click="increaseItem(item)">+</button>
                <button class="remove-btn" @click="removeItem(item.productId, item.variantId)">Remove</button>
              </div>
            </div>
          </li>
        </ul>

        <div class="cart-summary">
          <div class="summary-line">
            <span>Subtotal</span>
            <strong>{{ formatMoney(subtotalCents) }}</strong>
          </div>
          <p class="summary-note">Shipping and tax calculated at Stripe checkout.</p>
          <button class="checkout-btn" :disabled="checkoutLoading || items.length === 0" @click="startCheckout">
            {{ checkoutLoading ? 'Redirecting...' : 'Checkout with Stripe' }}
          </button>
          <button class="clear-btn" :disabled="items.length === 0" @click="clearCart">Clear Cart</button>
          <p v-if="checkoutError" class="checkout-error">{{ checkoutError }}</p>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCart } from '@/composables/useCart'
import type { CartItem, GalleryProduct, ProductVariant } from '@/types/gallery'

const config = useRuntimeConfig()
const catalog = ref<GalleryProduct[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const checkoutLoading = ref(false)
const checkoutError = ref<string | null>(null)
const selectedVariants = ref<Record<string, string>>({})
const selectedFilter = ref<'all' | 'print' | 'original'>('all')

const filterOptions = [
  { label: 'All', value: 'all' as const },
  { label: 'Prints', value: 'print' as const },
  { label: 'Originals', value: 'original' as const },
]

const { items, itemCount, subtotalCents, addItem, updateQuantity, removeItem, clearCart } = useCart()

const filteredProducts = computed(() => {
  if (selectedFilter.value === 'all') {
    return catalog.value.filter((product) => product.active)
  }

  return catalog.value.filter(
    (product) => product.active && product.type === selectedFilter.value
  )
})

onMounted(async () => {
  try {
    const response = await fetch('/data/gallery-catalog.json')
    if (!response.ok) {
      throw new Error('Failed to load catalog data')
    }

    const products = (await response.json()) as GalleryProduct[]
    catalog.value = products

    for (const product of products) {
      const firstInStock = product.variants.find((variant) => variant.inStock)
      if (firstInStock) {
        selectedVariants.value[product.id] = firstInStock.id
      }
    }
  } catch (fetchError) {
    error.value = fetchError instanceof Error ? fetchError.message : 'Unable to load catalog'
  } finally {
    loading.value = false
  }
})

function resolveVariant(product: GalleryProduct): ProductVariant | undefined {
  const variantId = selectedVariants.value[product.id]
  return product.variants.find((entry) => entry.id === variantId)
}

function canAddToCart(product: GalleryProduct) {
  const variant = resolveVariant(product)
  return !!variant && variant.inStock
}

function addToCart(product: GalleryProduct) {
  const variant = resolveVariant(product)
  if (!variant || !variant.inStock) {
    return
  }

  const item: CartItem = {
    productId: product.id,
    productTitle: product.title,
    productType: product.type,
    variantId: variant.id,
    variantLabel: variant.label,
    stripePriceId: variant.stripePriceId,
    unitPriceCents: variant.priceCents,
    quantity: 1,
    imageSrc: product.image.src,
  }

  addItem(item)
}

function increaseItem(item: CartItem) {
  updateQuantity(item.productId, item.variantId, item.quantity + 1)
}

function decreaseItem(item: CartItem) {
  updateQuantity(item.productId, item.variantId, item.quantity - 1)
}

async function startCheckout() {
  checkoutLoading.value = true
  checkoutError.value = null

  try {
    const baseUrl = (config.public.checkoutApiBaseUrl || '').replace(/\/$/, '')
    if (!baseUrl) {
      throw new Error('Checkout API base URL is not configured yet.')
    }

    const response = await fetch(`${baseUrl}/api/create-checkout-session`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        lineItems: items.value.map((item) => ({
          stripePriceId: item.stripePriceId,
          quantity: item.quantity,
          productId: item.productId,
          variantId: item.variantId,
          productTitle: item.productTitle,
          variantLabel: item.variantLabel,
          unitPriceCents: item.unitPriceCents,
        })),
        successPath: config.public.checkoutSuccessPath,
        cancelPath: config.public.checkoutCancelPath,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create checkout session')
    }

    const payload = (await response.json()) as { checkoutUrl?: string }

    if (!payload.checkoutUrl) {
      throw new Error('Checkout URL missing from API response')
    }

    window.location.href = payload.checkoutUrl
  } catch (checkoutErrorValue) {
    checkoutError.value =
      checkoutErrorValue instanceof Error
        ? checkoutErrorValue.message
        : 'Unable to start checkout'
  } finally {
    checkoutLoading.value = false
  }
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

useSeoMeta({
  title: 'Gallery Shop',
  description: 'Buy open-edition prints and view original artwork availability.',
})
</script>

<style scoped>
.gallery-page {
  max-width: 1300px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  gap: 2rem;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.artist-label {
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.subtitle {
  max-width: 60ch;
}

.back-home {
  border: 1px solid var(--color-border-muted);
  border-radius: 999px;
  padding: 0.5rem 1rem;
  background: #fff;
  white-space: nowrap;
}

.shop-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
}

.products-panel,
.cart-panel {
  background: #fff;
  border: 1px solid var(--color-border-muted);
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
  padding: 1.25rem;
}

.filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.filter-btn {
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border-muted);
  border-radius: 999px;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
}

.filter-btn.active {
  background: #14213d;
  color: #fff;
}

.status {
  padding: 1rem;
  border-radius: 10px;
}

.status.error {
  border: 1px solid #b42318;
  background: #fef3f2;
  color: #912018;
}

.status.loading {
  border: 1px solid #bdd5ea;
  background: #eef6ff;
  color: #084b83;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.product-card {
  border: 1px solid var(--color-border-muted);
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.product-image {
  width: 100%;
  height: 220px;
  object-fit: cover;
}

.product-content {
  padding: 0.9rem;
}

.product-type {
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.product-description,
.product-medium {
  font-size: 0.95rem;
}

.product-medium {
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.variant-label {
  font-size: 0.8rem;
  display: block;
  margin-bottom: 0.3rem;
}

.variant-select {
  width: 100%;
  padding: 0.55rem;
  border-radius: 8px;
  border: 1px solid var(--color-border-muted);
  margin-bottom: 0.7rem;
}

.add-cart {
  width: 100%;
  background: #0f5132;
  color: #fff;
  border: 0;
  border-radius: 8px;
  padding: 0.65rem;
  cursor: pointer;
}

.add-cart:disabled {
  background: #7f8c8d;
  cursor: not-allowed;
}

.cart-items {
  list-style: none;
  display: grid;
  gap: 0.8rem;
  margin: 1rem 0;
}

.cart-item {
  display: grid;
  grid-template-columns: 58px 1fr;
  gap: 0.7rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid var(--color-border-muted);
}

.cart-thumb {
  width: 58px;
  height: 58px;
  border-radius: 8px;
  object-fit: cover;
}

.cart-item-title {
  font-weight: 700;
  font-size: 0.95rem;
}

.cart-item-variant,
.cart-item-price {
  font-size: 0.85rem;
}

.qty-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.2rem;
}

.qty-row button {
  border: 1px solid var(--color-border-muted);
  background: #fff;
  border-radius: 6px;
  padding: 0.2rem 0.45rem;
  cursor: pointer;
}

.remove-btn {
  margin-left: auto;
  color: #b42318;
}

.cart-summary {
  border-top: 1px solid var(--color-border-muted);
  padding-top: 1rem;
}

.summary-line {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.summary-note {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  margin-bottom: 0.7rem;
}

.checkout-btn,
.clear-btn {
  width: 100%;
  border: 0;
  border-radius: 8px;
  padding: 0.65rem;
  cursor: pointer;
}

.checkout-btn {
  background: #1d4ed8;
  color: #fff;
  margin-bottom: 0.5rem;
}

.checkout-btn:disabled,
.clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clear-btn {
  background: #f3f4f6;
}

.checkout-error {
  margin-top: 0.65rem;
  font-size: 0.85rem;
  color: #b42318;
}

.empty-cart {
  margin: 1rem 0;
  color: var(--color-text-muted);
}

@media (max-width: 1024px) {
  .shop-layout {
    grid-template-columns: 1fr;
  }

  .products-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .gallery-header {
    flex-direction: column;
  }

  .products-grid {
    grid-template-columns: 1fr;
  }
}
</style>
