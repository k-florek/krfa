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
      <div v-if="selected" class="lightbox" @click.self="closeLightbox">
        <button class="lightbox-close" @click="closeLightbox" aria-label="Close">&times;</button>
        <img :src="selected.image.src" :alt="selected.image.alt || selected.title" class="lightbox-img" />
        <p class="lightbox-title">{{ selected.title }}</p>
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

<style scoped>
.featured-works {
  padding: 5rem 1rem 4rem;
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.featured-works h2 {
  margin-bottom: 2.5rem;
}

.masonry-grid {
  columns: 2;
  column-gap: 0.75rem;
}

.masonry-cell {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  cursor: pointer;
  background: var(--color-bg-body-dark);
  break-inside: avoid;
  margin-bottom: 0.75rem;
}

.bento-img {
  width: 100%;
  height: auto;
  display: block;
  transition: transform 0.4s ease;
}

.masonry-cell:hover .bento-img {
  transform: scale(1.04);
}

.masonry-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.55) 0%, transparent 50%);
  display: flex;
  align-items: flex-end;
  padding: 1.25rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.masonry-cell:hover .masonry-overlay {
  opacity: 1;
}

.masonry-title {
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* Lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.lightbox-img {
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
}

.lightbox-title {
  color: #fff;
  margin-top: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.lightbox-close {
  position: absolute;
  top: 1.25rem;
  right: 1.5rem;
  background: none;
  border: none;
  color: #fff;
  font-size: 2.5rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.lightbox-close:hover {
  opacity: 1;
}

.fw-error {
  color: #d32f2f;
  padding: 1rem;
  margin: 1rem auto;
  max-width: 600px;
  border: 1px solid #d32f2f;
  border-radius: 8px;
  background-color: #ffebee;
}

.fw-loading {
  padding: 2rem;
  color: var(--color-text-muted);
  font-size: 1.1rem;
}

@media (max-width: 540px) {
  .masonry-grid {
    columns: 1;
  }

  .masonry-overlay {
    opacity: 1;
  }
}
</style>