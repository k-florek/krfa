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

              <button class="btn btn-primary btn-block">
                Order Print
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
import type { GalleryProduct } from '@/types/gallery'
import { useCartStore } from '~/stores/cart'

const cart = useCartStore()

const catalog = ref<GalleryProduct[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const selectedFilter = ref<'all' | 'print' | 'original'>('all')
const selectedProduct = ref<GalleryProduct | null>(null)

const totalItems = computed(() => cart.totalItems)
const hasItems = computed(() => cart.totalItems > 0)
const subtotalCents = computed(() => cart.totalPrice * 100)

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
  await loadCatalog()
})

function openOrderModal(product: GalleryProduct) {
  if (product.type !== 'print') return
  selectedProduct.value = product
}

function closeOrderModal() {
  selectedProduct.value = null
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

