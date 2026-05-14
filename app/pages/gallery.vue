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
                <p class="product-medium">Choose print size</p>
                <p v-if="whccCatalogLoading" class="status loading">Loading available print options...</p>
                <p v-else-if="whccCatalogError" class="checkout-error">{{ whccCatalogError }}</p>
                <p v-else-if="!matchedOptions.length" class="checkout-error">
                  No print options match this artwork's source aspect ratios.
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
                  <span class="size-option-label">{{ option.label }}</span>
                </label>
              </div>

              <div v-if="selectedOption && selectedOption.papers.length" class="size-options">
                <p class="product-medium">Choose paper type</p>
                <label
                  v-for="paper in selectedOption.papers"
                  :key="paper.id"
                  class="size-option"
                >
                  <input
                    type="radio"
                    name="matched-paper-option"
                    :value="paper.id"
                    v-model="selectedPaperId"
                  />
                  <span class="size-option-label">{{ paper.paperLabel }}</span>
                  <span class="size-option-price">{{ formatMoney(paper.unitPriceCents) }}</span>
                </label>
              </div>

              <div v-if="selectedOption" class="size-quantity-wrap">
                <label class="size-quantity-label" for="print-quantity">Quantity</label>
                <input
                  id="print-quantity"
                  class="size-quantity-input"
                  type="number"
                  inputmode="numeric"
                  :min="selectedOption.minQuantity"
                  :max="selectedOption.maxQuantity"
                  :value="selectedQuantity"
                  @input="onQuantityInput"
                  @blur="normalizeSelectedQuantity"
                />
              </div>

              <p v-if="selectedPaper" class="checkout-total">
                Estimated print subtotal:
                <strong>{{ formatMoney(selectedPaper.unitPriceCents * normalizedSelectedQuantity) }}</strong>
              </p>

              <button
                class="btn btn-primary btn-block"
                :disabled="!canLaunchEditor"
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
import { computed, onMounted, ref, watch } from 'vue'
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
const selectedPaperId = ref<string | null>(null)
const selectedQuantity = ref(1)
const whccCatalog = ref<WhccPrintVariation[]>([])
const matchedOptions = ref<MatchedPrintOption[]>([])
const PENDING_STORAGE_KEY = 'krfa-whcc-pending-launches-v1'
const ASPECT_RATIO_TOLERANCE = 0.01

type WhccPrintPaperOption = {
  id: string
  paperLabel: string
  paperAttributeUID: number
  unitPriceCents: number
}

type WhccPrintVariation = {
  id: string
  productUID: string
  productName: string
  productNodeId: number
  widthIn: number
  heightIn: number
  aspectRatio: string
  defaultQuantity: number
  minQuantity: number
  maxQuantity: number
  paperOptions: WhccPrintPaperOption[]
}

type MatchedPrintOption = {
  id: string
  label: string
  variantLabel: string
  whccProductId: string
  whccProductNodeId: number
  aspectRatio: string
  printSourceUrl: string
  defaultQuantity: number
  minQuantity: number
  maxQuantity: number
  papers: WhccPrintPaperOption[]
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
  selectedPaperId.value = null
  selectedQuantity.value = 1
  matchedOptions.value = []
  whccCatalogError.value = null
  editorError.value = null

  if (!product.printSources.length) {
    whccCatalogError.value = 'This artwork has no print sources configured.'
    return
  }

  try {
    const options = await loadWhccCatalog()
    matchedOptions.value = buildMatchedPrintOptions(product, options)
    selectedOptionId.value = matchedOptions.value[0]?.id || null
  } catch (catalogError) {
    whccCatalogError.value =
      catalogError instanceof Error ? catalogError.message : 'Unable to load WHCC catalog options.'
  }
}

function closeOrderModal() {
  selectedProduct.value = null
  selectedOptionId.value = null
  selectedPaperId.value = null
  selectedQuantity.value = 1
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
    const response = await fetch(getApiUrl('/api/whcc-print-options'))
    const payload = (await response.json()) as {
      options?: WhccPrintVariation[]
      error?: string
    }

    if (!response.ok || !Array.isArray(payload.options)) {
      throw new Error(payload.error || 'Unable to fetch WHCC print options.')
    }

    whccCatalog.value = payload.options
    return whccCatalog.value
  } finally {
    whccCatalogLoading.value = false
  }
}

function buildMatchedPrintOptions(product: GalleryProduct, products: WhccPrintVariation[]) {
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
      const optionId = `${matchedProduct.id}:${source.aspectRatio}:${source.src}`
      options.push({
        id: optionId,
        variantLabel: matchedProduct.productName,
        label: `${matchedProduct.productName} (${matchedProduct.widthIn}x${matchedProduct.heightIn})`,
        whccProductId: matchedProduct.productUID,
        whccProductNodeId: matchedProduct.productNodeId,
        aspectRatio: source.aspectRatio,
        printSourceUrl: toAbsoluteAssetUrl(source.src),
        defaultQuantity: matchedProduct.defaultQuantity,
        minQuantity: matchedProduct.minQuantity,
        maxQuantity: matchedProduct.maxQuantity,
        papers: matchedProduct.paperOptions,
      })
    }
  }

  return options.sort((a, b) => {
    if (a.papers[0]?.unitPriceCents !== b.papers[0]?.unitPriceCents) {
      return (a.papers[0]?.unitPriceCents || 0) - (b.papers[0]?.unitPriceCents || 0)
    }

    return a.label.localeCompare(b.label)
  })
}

const selectedOption = computed(() => {
  if (!selectedOptionId.value) {
    return null
  }

  return matchedOptions.value.find((option) => option.id === selectedOptionId.value) || null
})

const selectedPaper = computed(() => {
  if (!selectedOption.value || !selectedPaperId.value) {
    return null
  }

  return selectedOption.value.papers.find((paper) => paper.id === selectedPaperId.value) || null
})

const normalizedSelectedQuantity = computed(() => {
  if (!selectedOption.value) {
    return 1
  }

  const parsed = Number(selectedQuantity.value)
  if (!Number.isFinite(parsed)) {
    return selectedOption.value.defaultQuantity
  }

  const normalized = Math.floor(parsed)
  return Math.min(selectedOption.value.maxQuantity, Math.max(selectedOption.value.minQuantity, normalized))
})

const canLaunchEditor = computed(() => {
  return Boolean(
    selectedOption.value
    && selectedPaper.value
    && normalizedSelectedQuantity.value >= (selectedOption.value?.minQuantity || 1)
    && normalizedSelectedQuantity.value <= (selectedOption.value?.maxQuantity || 50)
    && !editorLoading.value
    && !whccCatalogLoading.value
  )
})

watch(selectedOptionId, () => {
  if (!selectedOption.value) {
    selectedPaperId.value = null
    selectedQuantity.value = 1
    return
  }

  selectedPaperId.value = selectedOption.value.papers[0]?.id || null
  selectedQuantity.value = selectedOption.value.defaultQuantity
})

function onQuantityInput(event: Event) {
  const target = event.target as HTMLInputElement | null
  selectedQuantity.value = Number.parseInt(target?.value || '0', 10)
}

function normalizeSelectedQuantity() {
  selectedQuantity.value = normalizedSelectedQuantity.value
}

async function launchEditor() {
  if (!selectedProduct.value || !selectedOptionId.value) return
  const product = selectedProduct.value
  if (product.type !== 'print') return

  const chosenOption = matchedOptions.value.find((option) => option.id === selectedOptionId.value)
  const chosenPaper = selectedPaper.value

  if (!chosenOption) {
    editorError.value = 'Please choose a print option.'
    return
  }

  if (!chosenPaper) {
    editorError.value = 'Please choose a paper type.'
    return
  }

  if (!chosenOption.printSourceUrl) {
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
            variantId: `${chosenOption.id}:${chosenPaper.id}`,
            productType: product.type,
            productTitle: product.title,
            variantLabel: `${chosenOption.variantLabel} - ${chosenPaper.paperLabel}`,
            quantity: normalizedSelectedQuantity.value,
            whccSku: product.sku,
            whccProductUID: chosenOption.whccProductId,
            whccProductNodeId: chosenOption.whccProductNodeId,
            whccPaperAttributeUID: chosenPaper.paperAttributeUID,
            whccPaperLabel: chosenPaper.paperLabel,
            printSourceUrl: chosenOption.printSourceUrl,
            aspectRatio: chosenOption.aspectRatio,
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
      variantId: `${chosenOption.id}:${chosenPaper.id}`,
      productTitle: product.title,
      variantLabel: `${chosenOption.variantLabel} - ${chosenPaper.paperLabel}`,
      quantity: normalizedSelectedQuantity.value,
      priceCents: chosenPaper.unitPriceCents,
      currency: 'usd',
      whccSku: product.sku || null,
      whccProductId: chosenOption.whccProductId,
      whccProductNodeId: chosenOption.whccProductNodeId,
      whccPaperAttributeUID: chosenPaper.paperAttributeUID,
      whccPaperLabel: chosenPaper.paperLabel,
      whccDesignId: `${product.slug}-${chosenOption.aspectRatio.replace(':', 'x')}`,
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
  whccProductNodeId?: number
  whccPaperAttributeUID?: number
  whccPaperLabel?: string
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

