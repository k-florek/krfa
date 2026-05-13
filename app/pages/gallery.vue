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
          <NuxtLink to="/gallery/success" class="btn btn-outline-dark">
            Cart ({{ totalItems }})
          </NuxtLink>
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

      <div v-if="hasItems" class="gallery-cart-banner panel">
        <p>
          <strong>{{ totalItems }}</strong>
          {{ totalItems === 1 ? 'item is' : 'items are' }} in your cart.
        </p>
        <p>
          Subtotal: <strong>{{ formatMoney(subtotalCents) }}</strong>
        </p>
        <NuxtLink to="/gallery/success" class="btn btn-secondary">Review Cart</NuxtLink>
      </div>

      <div v-if="error" class="status error">
        <span>{{ error }}</span>
        <button class="btn btn-secondary" @click="loadCatalog">Retry</button>
      </div>
      <div v-else-if="loading" class="status loading">Loading gallery catalog...</div>

      <div v-else class="gallery-masonry">
        <article v-for="product in filteredProducts" :key="product.id" class="gallery-card">
          <div class="gallery-card-img-wrap">
            <img :src="product.displayImage.src" :alt="product.displayImage.alt" loading="lazy" />
            <div class="masonry-overlay">
              <span class="masonry-title">{{ product.title }}</span>
            </div>
          </div>
          <div class="gallery-card-footer">
            <p class="product-type">{{ product.type === 'print' ? 'Print' : 'Original' }}</p>
            <h3>{{ product.title }}</h3>
            <button
              v-if="product.type === 'print'"
              class="btn btn-primary btn-block"
              @click="openOrderModal(product)"
            >
              Order Print
            </button>
          </div>
        </article>
      </div>
    </section>

    <!-- Order Modal -->
    <Teleport to="body">
      <div v-if="selectedProduct" class="modal-overlay" @click.self="closeOrderModal">
        <div class="modal-content size-modal-content" role="dialog" aria-modal="true" :aria-label="`Order ${selectedProduct.title}`">
          <button class="modal-close" @click="closeOrderModal" aria-label="Close">&times;</button>
          <div class="size-modal-body">
            <img :src="selectedProduct.displayImage.src" :alt="selectedProduct.displayImage.alt" class="size-modal-img" />
            <div class="size-modal-info">
              <p class="product-type">Print</p>
              <h3>{{ selectedProduct.title }}</h3>
              <p class="product-description">{{ selectedProduct.description }}</p>
              <p class="product-medium">{{ selectedProduct.medium }}</p>
              <div class="size-options" aria-live="polite">
                <p class="product-medium">Available print options</p>
                <p v-if="whccCatalogLoading" class="status loading">Loading available WHCC print options...</p>
                <p v-else-if="whccCatalogError" class="checkout-error">{{ whccCatalogError }}</p>
                <p v-else-if="!matchedOptions.length" class="checkout-error">
                  No WHCC fine art products match this artwork's source aspect ratios.
                </p>
                <label
                  v-else
                  v-for="option in matchedOptions"
                  :key="option.id"
                  class="size-option"
                >
                  <input
                    type="radio"
                    name="matched-print-option"
                    :value="option.id"
                    v-model="selectedOptionId"
                  />
                  <span>{{ option.label }}</span>
                </label>
              </div>
              <button
                class="btn btn-primary btn-block"
                :disabled="!selectedOptionId || editorLoading || whccCatalogLoading"
                @click="launchEditor"
              >
                {{ editorLoading ? 'Opening editor...' : 'Order Print' }}
              </button>
              <p v-if="editorError" class="checkout-error">{{ editorError }}</p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { GalleryProduct } from '@/types/gallery'
import { useWhccCart } from '@/composables/useWhccCart'

const config = useRuntimeConfig()
const { hasItems, subtotalCents, totalItems, loadFromStorage } = useWhccCart()
const catalog = ref<GalleryProduct[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const editorLoading = ref(false)
const editorError = ref<string | null>(null)
const whccCatalogLoading = ref(false)
const whccCatalogError = ref<string | null>(null)
const selectedFilter = ref<'all' | 'print' | 'original'>('all')
const selectedProduct = ref<GalleryProduct | null>(null)
const selectedOptionId = ref<string | null>(null)
const whccCatalog = ref<WhccCatalogProduct[]>([])
const matchedOptions = ref<MatchedPrintOption[]>([])
const PENDING_STORAGE_KEY = 'krfa-whcc-pending-launches-v1'
const ASPECT_RATIO_TOLERANCE = 0.01

type WhccCatalogProduct = {
  productUID: string
  name: string
  widthIn: number
  heightIn: number
  aspectRatio: string
}

type MatchedPrintOption = {
  id: string
  label: string
  variantLabel: string
  whccProductId: string
  aspectRatio: string
  printSourceUrl: string
}

const filterOptions = [
  { label: 'All', value: 'all' as const },
  { label: 'Prints', value: 'print' as const },
  { label: 'Originals', value: 'original' as const },
]

const filteredProducts = computed(() => {
  if (selectedFilter.value === 'all') {
    return catalog.value.filter((product) => product.active && !product.hidden)
  }
  return catalog.value.filter(
    (product) => product.active && !product.hidden && product.type === selectedFilter.value
  )
})

async function loadCatalog() {
  loading.value = true
  error.value = null

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
}

onMounted(async () => {
  loadFromStorage()
  await loadCatalog()
})

function openOrderModal(product: GalleryProduct) {
  void openOrderModalAsync(product)
}

async function openOrderModalAsync(product: GalleryProduct) {
  if (product.type !== 'print') {
    return
  }

  selectedProduct.value = product
  selectedOptionId.value = null
  matchedOptions.value = []
  whccCatalogError.value = null
  editorError.value = null

  if (!product.printSources.length) {
    whccCatalogError.value = 'This artwork has no print sources configured.'
    return
  }

  try {
    const products = await loadWhccCatalog()
    matchedOptions.value = buildMatchedPrintOptions(product, products)
    selectedOptionId.value = matchedOptions.value[0]?.id || null
  } catch (catalogError) {
    whccCatalogError.value =
      catalogError instanceof Error ? catalogError.message : 'Unable to load WHCC catalog options.'
  }
}

function closeOrderModal() {
  selectedProduct.value = null
  selectedOptionId.value = null
  matchedOptions.value = []
  whccCatalogError.value = null
  editorError.value = null
}

function parseAspectRatio(aspectRatio: string) {
  const raw = String(aspectRatio || '').trim()
  if (!raw) {
    return null
  }

  if (raw.includes(':')) {
    const parts = raw.split(':').map((part) => Number.parseFloat(part))
    if (parts.length !== 2) {
      return null
    }

    const width = parts[0]
    const height = parts[1]
    if (width === undefined || height === undefined) {
      return null
    }

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null
    }

    return width / height
  }

  const decimalRatio = Number.parseFloat(raw)
  if (!Number.isFinite(decimalRatio) || decimalRatio <= 0) {
    return null
  }

  return decimalRatio
}

function normalizeRatioForOrientation(ratio: number) {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return null
  }

  return ratio >= 1 ? ratio : 1 / ratio
}

function toAbsoluteAssetUrl(url: string) {
  const trimmed = String(url || '').trim()
  if (!trimmed) {
    return ''
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  const siteUrl = String(config.public.siteUrl || config.public.checkoutApiBaseUrl || '').replace(/\/$/, '')
  if (!siteUrl) {
    return trimmed
  }

  return `${siteUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`
}

function getApiUrl(path: string) {
  const baseUrl = (config.public.checkoutApiBaseUrl || '').replace(/\/$/, '')
  return baseUrl ? `${baseUrl}${path}` : path
}

async function loadWhccCatalog() {
  if (whccCatalog.value.length) {
    return whccCatalog.value
  }

  whccCatalogLoading.value = true
  whccCatalogError.value = null

  try {
    const response = await fetch(getApiUrl('/api/whcc-catalog'))
    const payload = (await response.json()) as {
      products?: WhccCatalogProduct[]
      error?: string
    }

    if (!response.ok || !Array.isArray(payload.products)) {
      throw new Error(payload.error || 'Unable to fetch WHCC catalog products.')
    }

    whccCatalog.value = payload.products
    return whccCatalog.value
  } finally {
    whccCatalogLoading.value = false
  }
}

function buildMatchedPrintOptions(product: GalleryProduct, products: WhccCatalogProduct[]) {
  const options: MatchedPrintOption[] = []

  for (const source of product.printSources) {
    const sourceRatio = parseAspectRatio(source.aspectRatio)
    if (!sourceRatio) {
      continue
    }

    const normalizedSourceRatio = normalizeRatioForOrientation(sourceRatio)
    if (!normalizedSourceRatio) {
      continue
    }

    const matchingProducts = products.filter((entry) => {
      const productRatio = Number(entry.widthIn) / Number(entry.heightIn)
      const normalizedProductRatio = normalizeRatioForOrientation(productRatio)
      return (
        normalizedProductRatio !== null
        && Math.abs(normalizedProductRatio - normalizedSourceRatio) <= ASPECT_RATIO_TOLERANCE
      )
    })

    for (const matchedProduct of matchingProducts) {
      const optionId = `${matchedProduct.productUID}:${source.aspectRatio}:${source.src}`
      options.push({
        id: optionId,
        variantLabel: matchedProduct.name,
        label: `${matchedProduct.name} (${matchedProduct.widthIn}x${matchedProduct.heightIn}, source ${source.aspectRatio})`,
        whccProductId: matchedProduct.productUID,
        aspectRatio: source.aspectRatio,
        printSourceUrl: toAbsoluteAssetUrl(source.src),
      })
    }
  }

  return options
}

async function launchEditor() {
  if (!selectedProduct.value || !selectedOptionId.value) return
  const product = selectedProduct.value
  if (product.type !== 'print') return

  const selectedOption = matchedOptions.value.find((option) => option.id === selectedOptionId.value)
  if (!selectedOption) {
    editorError.value = 'Please choose a print option.'
    return
  }

  if (!selectedOption.printSourceUrl) {
    editorError.value = 'This print source is not configured with a valid URL.'
    return
  }

  editorLoading.value = true
  editorError.value = null

  try {
    const baseUrl = (config.public.checkoutApiBaseUrl || '').replace(/\/$/, '')
    const endpoint = baseUrl ? `${baseUrl}/api/create-whcc-editor` : '/api/create-whcc-editor'

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lineItems: [
          {
            productId: product.id,
            variantId: selectedOption.id,
            productType: product.type,
            productTitle: product.title,
            variantLabel: selectedOption.variantLabel,
            quantity: 1,
            whccSku: product.sku,
            whccProductUID: selectedOption.whccProductId,
            printSourceUrl: selectedOption.printSourceUrl,
            aspectRatio: selectedOption.aspectRatio,
            slug: product.slug,
          },
        ],
      }),
    })

    const payload = (await response.json()) as {
      checkoutId?: string
      editorId?: string
      editorUrl?: string
      error?: string
    }

    if (!response.ok || !payload.editorUrl || !payload.checkoutId || !payload.editorId) {
      throw new Error(payload.error || 'Failed to open editor')
    }

    persistPendingLaunch(payload.checkoutId, {
      productId: product.id,
      variantId: selectedOption.id,
      productTitle: product.title,
      variantLabel: selectedOption.variantLabel,
      quantity: 1,
      priceCents: 0,
      currency: 'usd',
      whccSku: product.sku || null,
      whccProductId: selectedOption.whccProductId,
      whccDesignId: `${product.slug}-${selectedOption.aspectRatio.replace(':', 'x')}`,
    })

    window.location.href = payload.editorUrl
  } catch (launchError) {
    editorError.value =
      launchError instanceof Error ? launchError.message : 'Unable to open editor'
  } finally {
    editorLoading.value = false
  }
}

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
}

function readPendingLaunches() {
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

function persistPendingLaunch(checkoutId: string, item: PendingLaunchItem) {
  if (import.meta.server) {
    return
  }

  const launches = readPendingLaunches()
  launches[checkoutId] = {
    ...item,
    createdAt: new Date().toISOString(),
  }
  window.localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(launches))
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

useSeoMeta({
  title: 'Gallery Shop',
  description: 'Buy open-edition prints from the gallery.',
})
</script>

