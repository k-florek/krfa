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

      <div v-if="error" class="status error">
        <span>{{ error }}</span>
        <button class="btn btn-secondary" @click="loadCatalog">Retry</button>
      </div>
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
            <img :src="selectedProduct.image.src" :alt="selectedProduct.image.alt" class="size-modal-img" />
            <div class="size-modal-info">
              <p class="product-type">Print</p>
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
                class="btn btn-primary btn-block"
                :disabled="!selectedVariantId || editorLoading"
                @click="launchEditor"
              >
                {{ editorLoading ? 'Opening editor...' : 'Customize & Order' }}
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

const config = useRuntimeConfig()
const catalog = ref<GalleryProduct[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const editorLoading = ref(false)
const editorError = ref<string | null>(null)
const selectedFilter = ref<'all' | 'print' | 'original'>('all')
const selectedProduct = ref<GalleryProduct | null>(null)
const selectedVariantId = ref<string | null>(null)

const filterOptions = [
  { label: 'All', value: 'all' as const },
  { label: 'Prints', value: 'print' as const },
  { label: 'Originals', value: 'original' as const },
]

const filteredProducts = computed(() => {
  if (selectedFilter.value === 'all') {
    return catalog.value.filter((product) => product.active)
  }
  return catalog.value.filter(
    (product) => product.active && product.type === selectedFilter.value
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
  await loadCatalog()
})

function openOrderModal(product: GalleryProduct) {
  if (product.type !== 'print') {
    return
  }

  selectedProduct.value = product
  const firstInStock = product.variants.find((v) => v.inStock)
  selectedVariantId.value = firstInStock?.id ?? null
  editorError.value = null
}

function closeOrderModal() {
  selectedProduct.value = null
  selectedVariantId.value = null
  editorError.value = null
}

function hasWhccMapping(variant: GalleryProduct['variants'][number]) {
  return !!variant.whccProductId && !!variant.whccDesignId
}

async function launchEditor() {
  if (!selectedProduct.value || !selectedVariantId.value) return
  const product = selectedProduct.value
  if (product.type !== 'print') return

  const variant = product.variants.find((v) => v.id === selectedVariantId.value)
  if (!variant || !variant.inStock) return

  if (!hasWhccMapping(variant)) {
    editorError.value = 'This print is not fully configured for WHCC ordering yet.'
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
            variantId: variant.id,
            productType: product.type,
            productTitle: product.title,
            variantLabel: variant.label,
            quantity: 1,
            whccProductId: variant.whccProductId,
            whccDesignId: variant.whccDesignId,
            whccSku: variant.whccSku,
          },
        ],
      }),
    })

    const payload = (await response.json()) as { editorUrl?: string; error?: string }

    if (!response.ok || !payload.editorUrl) {
      throw new Error(payload.error || 'Failed to open editor')
    }

    window.location.href = payload.editorUrl
  } catch (launchError) {
    editorError.value =
      launchError instanceof Error ? launchError.message : 'Unable to open editor'
  } finally {
    editorLoading.value = false
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
  description: 'Buy open-edition prints from the gallery.',
})
</script>

