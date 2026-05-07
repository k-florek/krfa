<template>
  <section class="gallery-page">
    <div class="gallery-header">
      <div class="gallery-header-inner">
        <div class="site-headline">
          <NuxtLink to="/" class="site-brand">Kelsey Raine Art</NuxtLink>
          <NuxtLink to="/" class="back-home btn btn-outline-dark">Back to Home</NuxtLink>
        </div>
        <div class="gallery-title-row">
          <h1 class="watercolor-heading">Gallery Shop</h1>
          <button class="gallery-cart-indicator" @click="cartOpen = true" aria-label="Open cart">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <span>Cart</span>
            <span v-if="itemCount > 0" class="cart-badge">{{ itemCount }}</span>
          </button>
        </div>
      </div>
    </div>

    <section class="gallery-products">
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

      <div v-else class="gallery-masonry">
        <article v-for="product in filteredProducts" :key="product.id" class="gallery-card">
          <div class="gallery-card-img-wrap">
            <img :src="product.image.src" :alt="product.image.alt" loading="lazy" />
            <div class="masonry-overlay">
              <span class="masonry-title">{{ product.title }}</span>
            </div>
          </div>
          <div class="gallery-card-footer">
            <p class="product-type">{{ product.type === 'print' ? 'Print' : 'Original' }}</p>
            <h3>{{ product.title }}</h3>
            <button class="filter-btn btn-block" @click="openSizeModal(product)">
              Add to Cart
            </button>
          </div>
        </article>
      </div>
    </section>

    <!-- Cart Drawer -->
    <Teleport to="body">
      <div v-if="cartOpen" class="cart-drawer-overlay" @click="cartOpen = false" aria-hidden="true"></div>
      <div :class="['cart-drawer', { open: cartOpen }]" role="dialog" aria-label="Shopping cart" aria-modal="true">
        <div class="cart-drawer-header">
          <h2>Cart ({{ itemCount }})</h2>
          <button class="modal-close" @click="cartOpen = false" aria-label="Close cart">&times;</button>
        </div>
        <div class="cart-drawer-body">
          <div v-if="items.length === 0" class="empty-cart">Your cart is empty.</div>
          <ul v-else class="cart-items">
            <li v-for="item in items" :key="`${item.productId}-${item.variantId}`" class="cart-item">
              <img :src="item.imageSrc" :alt="item.productTitle" class="cart-thumb" loading="lazy" />
              <div class="cart-item-content">
                <p class="cart-item-title">{{ item.productTitle }}</p>
                <p class="cart-item-variant">{{ item.variantLabel }}</p>
                <p class="cart-item-price">{{ formatMoney(item.unitPriceCents) }}</p>
                <div class="qty-row">
                  <button @click="decreaseItem(item)" aria-label="Decrease quantity">-</button>
                  <span>{{ item.quantity }}</span>
                  <button @click="increaseItem(item)" aria-label="Increase quantity">+</button>
                  <button class="remove-btn btn btn-danger-text" @click="removeItem(item.productId, item.variantId)">Remove</button>
                </div>
              </div>
            </li>
          </ul>
        </div>
        <div class="cart-summary">
          <div class="summary-line">
            <span>Subtotal</span>
            <strong>{{ formatMoney(subtotalCents) }}</strong>
          </div>
          <p class="summary-note">Shipping and tax calculated at Stripe checkout.</p>
          <button class="btn btn-primary btn-block" :disabled="checkoutLoading || items.length === 0" @click="startCheckout">
            {{ checkoutLoading ? 'Redirecting...' : 'Checkout with Stripe' }}
          </button>
          <button class="btn btn-muted btn-block" :disabled="items.length === 0" @click="clearCart">Clear Cart</button>
          <p v-if="checkoutError" class="checkout-error">{{ checkoutError }}</p>
        </div>
      </div>
    </Teleport>

    <!-- Size Selection Modal -->
    <Teleport to="body">
      <div v-if="selectedProduct" class="modal-overlay" @click.self="closeSizeModal">
        <div class="modal-content size-modal-content" role="dialog" aria-modal="true" :aria-label="`Select size for ${selectedProduct.title}`">
          <button class="modal-close" @click="closeSizeModal" aria-label="Close">&times;</button>
          <div class="size-modal-body">
            <img :src="selectedProduct.image.src" :alt="selectedProduct.image.alt" class="size-modal-img" />
            <div class="size-modal-info">
              <p class="product-type">{{ selectedProduct.type === 'print' ? 'Print' : 'Original' }}</p>
              <h3>{{ selectedProduct.title }}</h3>
              <p class="product-description">{{ selectedProduct.description }}</p>
              <p class="product-medium">{{ selectedProduct.medium }}</p>
              <div class="size-options">
                <button
                  v-for="variant in selectedProduct.variants"
                  :key="variant.id"
                  :class="['size-option', { selected: selectedVariantId === variant.id, disabled: !variant.inStock }]"
                  :disabled="!variant.inStock"
                  @click="selectedVariantId = variant.id"
                >
                  <span class="size-option-label">{{ variant.label }}</span>
                  <span class="size-option-price">{{ formatMoney(variant.priceCents) }}</span>
                  <span v-if="!variant.inStock" class="size-option-soldout">Sold Out</span>
                </button>
              </div>
              <button
                class="filter-btn btn-block"
                :disabled="!selectedVariantId"
                @click="confirmAddToCart"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCart } from '@/composables/useCart'
import type { CartItem, GalleryProduct } from '@/types/gallery'

const config = useRuntimeConfig()
const catalog = ref<GalleryProduct[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const checkoutLoading = ref(false)
const checkoutError = ref<string | null>(null)
const selectedFilter = ref<'all' | 'print' | 'original'>('all')
const cartOpen = ref(false)
const selectedProduct = ref<GalleryProduct | null>(null)
const selectedVariantId = ref<string | null>(null)

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
    catalog.value = (await response.json()) as GalleryProduct[]
  } catch (fetchError) {
    error.value = fetchError instanceof Error ? fetchError.message : 'Unable to load catalog'
  } finally {
    loading.value = false
  }
})

function openSizeModal(product: GalleryProduct) {
  selectedProduct.value = product
  const firstInStock = product.variants.find((v) => v.inStock)
  selectedVariantId.value = firstInStock?.id ?? null
}

function closeSizeModal() {
  selectedProduct.value = null
  selectedVariantId.value = null
}

function confirmAddToCart() {
  if (!selectedProduct.value || !selectedVariantId.value) return
  const product = selectedProduct.value
  const variant = product.variants.find((v) => v.id === selectedVariantId.value)
  if (!variant || !variant.inStock) return

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
  closeSizeModal()
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

