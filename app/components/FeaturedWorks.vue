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
          :src="artwork.displayImage.src"
          :alt="artwork.displayImage.alt || artwork.title"
          loading="lazy"
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
          <img :src="selected.displayImage.src" :alt="selected.displayImage.alt || selected.title" class="modal-image" />
          <p class="modal-title">{{ selected.title }}</p>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import type { GalleryProduct } from '@/types/gallery'

const artworks = ref<GalleryProduct[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const selected = ref<GalleryProduct | null>(null)

onMounted(async () => {
  try {
    const response = await fetch('/data/gallery-catalog.json')
    if (!response.ok) throw new Error('Failed to load featured works')
    const catalog = (await response.json()) as GalleryProduct[]
    artworks.value = catalog.filter((item) => item.active && item.featuredwork === true && !item.hidden)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load featured works'
  } finally {
    loading.value = false
  }
})

function openLightbox(artwork: GalleryProduct) {
  selected.value = artwork
  document.body.style.overflow = 'hidden'
}

function closeLightbox() {
  selected.value = null
  document.body.style.overflow = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeLightbox()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>
