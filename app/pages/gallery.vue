<template>
  <section class="gallery-page">
    <div class="gallery-header">
      <div class="gallery-header-inner">
        <div class="site-headline">
          <NuxtLink to="/" class="site-brand">Kelsey Raine Art</NuxtLink>
          <NuxtLink to="/" class="back-home btn btn-outline-dark">Back to Home</NuxtLink>
        </div>
        <h1 class="watercolor-heading">Gallery Shop</h1>
      </div>
      
    </div>

    <div class="shop-layout">
      <section class="products-panel panel">
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

              <button class="add-cart btn btn-success btn-block" :disabled="!canAddToCart(product)" @click="addToCart(product)">
                {{ canAddToCart(product) ? 'Add to Cart' : 'Unavailable' }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <aside class="cart-panel panel">
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
                <button class="remove-btn btn btn-danger-text" @click="removeItem(item.productId, item.variantId)">Remove</button>
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
          <button class="checkout-btn btn btn-primary btn-block" :disabled="checkoutLoading || items.length === 0" @click="startCheckout">
            {{ checkoutLoading ? 'Redirecting...' : 'Checkout with Stripe' }}
          </button>
          <button class="clear-btn btn btn-muted btn-block" :disabled="items.length === 0" @click="clearCart">Clear Cart</button>
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

