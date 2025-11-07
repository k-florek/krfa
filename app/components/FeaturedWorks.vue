<template>
  <section class="featured-works">
    <h2 class="watercolor-heading">Featured Works</h2>
    
    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div v-else-if="loading" class="loading">
      Loading featured works...
    </div>

    <div v-else class="artwork-grid">
      <ArtworkCard 
        v-for="artwork in artworks" 
        :key="artwork.id"
        :title="artwork.title"
        :description="artwork.description"
        :image="artwork.image"
        :prints="artwork.prints"
      />
    </div>
  </section>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'

type ImageProp = {
  src: string
  alt?: string
  width?: number | string
  height?: number | string
  loading?: 'eager' | 'lazy'
  srcset?: string
}

interface PrintProp {
  size: string
  url: string
}

interface Artwork {
  id: string
  title: string
  description: string
  image: ImageProp
  prints?: PrintProp[]
}

const artworks = ref<Artwork[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const response = await fetch('/data/featured-works.json')
    
    if (!response.ok) {
      throw new Error('Failed to load featured works')
    }
    
    artworks.value = await response.json()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load featured works'
    console.error('Error loading featured works:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.featured-works {
  text-align: center;
  padding-top: 5rem;
  padding-bottom: 3rem;
  padding-left: 1rem;
  padding-right: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.featured-works h2 {
  margin-bottom: 2rem;
}

.artwork-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 2rem;
  justify-items: center;
}

.error {
  color: #d32f2f;
  padding: 1rem;
  margin: 1rem auto;
  max-width: 600px;
  border: 1px solid #d32f2f;
  border-radius: 8px;
  background-color: #ffebee;
}

.loading {
  padding: 2rem;
  color: var(--color-text-muted);
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .featured-works {
    padding-top: 3rem;
  }
  
  .artwork-grid {
    gap: 1.5rem;
  }
}
</style>