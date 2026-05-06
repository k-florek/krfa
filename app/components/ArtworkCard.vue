<template>
  <div class="card" @click="openModal">
    <div class="card-image-container">
      <img
        :src="image.src"
        :alt="image.alt || title"
        v-if="image.src"
        :width="image.width"
        :height="image.height"
        :loading="image.loading"
        :srcset="image.srcset"
        class="card-image"
      />
    </div>
    <h4>{{ title }}</h4>
  </div>

  <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <button class="modal-close" @click="closeModal">&times;</button>
      <img
        :src="image.src"
        :alt="image.alt || title"
        class="modal-image"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

type ImageProp = {
  src: string
  alt?: string
  width?: number | string
  height?: number | string
  loading?: 'eager' | 'lazy'
  srcset?: string
}

const props = defineProps({
  title: { type: String, required: true },
  image: { type: Object as PropType<ImageProp>, required: true },
} as const)

const showModal = ref(false)
function openModal() {
  showModal.value = true
}
function closeModal() {
  showModal.value = false
}
</script>

