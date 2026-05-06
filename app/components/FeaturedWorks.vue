<template>
  <section class="featured-works">
    <h2 class="watercolor-heading">Featured Works</h2>

    <div v-if="error" class="fw-error">{{ error }}</div>
    <div v-else-if="loading" class="fw-loading">Loading featured works...</div>

    <div v-else class="masonry-grid">
      <div
        v-for="artwork in artworks"
        :key="artwork.id"
        class="masonry-cell"
        @click="openLightbox(artwork)"
      >
        <img
          :src="artwork.image.src"
          :alt="artwork.image.alt || artwork.title"
          :loading="artwork.image.loading ?? 'lazy'"
          class="bento-img"
        />
        <div class="masonry-overlay">
          <span class="masonry-title">{{ artwork.title }}</span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="selected" class="modal-overlay" @click.self="closeLightbox">
        <div class="modal-content">
          <button class="modal-close" @click="closeLightbox" aria-label="Close">&times;</button>
          <img :src="selected.image.src" :alt="selected.image.alt || selected.title" class="modal-image" />
          <p class="modal-title">{{ selected.title }}</p>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'

interface ImageProp {
  src: string
  alt?: string
  width?: number | string
  height?: number | string
  loading?: 'eager' | 'lazy'
  srcset?: string
}

interface Artwork {
  id: string
  title: string
  description?: string
  image: ImageProp
}

const artworks = ref<Artwork[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const selected = ref<Artwork | null>(null)

onMounted(async () => {
  try {
    const response = await fetch('/data/featured-works.json')
    if (!response.ok) throw new Error('Failed to load featured works')
    artworks.value = await response.json()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load featured works'
  } finally {
    loading.value = false
  }
})

function openLightbox(artwork: Artwork) {
  selected.value = artwork
  document.body.style.overflow = 'hidden'
}

function closeLightbox() {
  selected.value = null
  document.body.style.overflow = ''
}

function rowSpan(image: ImageProp): number {
  const w = Number(image.width)
  const h = Number(image.height)
  if (!w || !h) return 30
  // grid-auto-rows: 10px; scale factor 35 gives ~350px for a square image
  return Math.ceil((h / w) * 35) + 1
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeLightbox()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>
