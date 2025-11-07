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
    <p>{{ description }}</p>
    <div v-if="prints && prints.length" class="prints-buttons">
      <span v-for="print in prints" :key="print.size">
        <a :href="print.url" target="_blank" rel="noopener" class="print-btn">
          Purchase {{ print.size }} Print
        </a>
      </span>
    </div>
  </div>

  <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <button class="modal-close" @click="closeModal">&times;</button>
      <img
        :src="image.src"
        :alt="image.alt || title"
        class="modal-image"
      />
      <div v-if="prints && prints.length" class="prints-buttons-modal">
        <span v-for="print in prints" :key="print.size">
          <a :href="print.url" target="_blank" rel="noopener" class="print-btn">
            Purchase {{ print.size }} Print
          </a>
        </span>
      </div>
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

type PrintProp = {
  size: string
  url: string
}

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: Object as PropType<ImageProp>, required: true },
  prints: { type: Array as PropType<PrintProp[]>, required: false, default: () => [] }
} as const)

const showModal = ref(false)
function openModal() {
  showModal.value = true
}
function closeModal() {
  showModal.value = false
}
</script>

<style>
@import url("~/assets/css/artworkcard.css");

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover; 
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  position: relative;
  background: #fff;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.2);
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.modal-image {
  max-width: 80vw;
  max-height: 80vh;
  object-fit: contain;
}
.modal-close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #333;
}

.prints-buttons, .prints-buttons-modal {
  margin-top: 2rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}
.print-btn {
  background: #1976d2;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 500;
  transition: background 0.2s;
  border: none;
  cursor: pointer;
}
.print-btn:hover {
  background: #1565c0;
}
</style>