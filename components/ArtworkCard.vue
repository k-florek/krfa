<template>
  <div class="card">
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
    <p class="card-title">{{ title }}</p>
    <p class="card-des">{{ description }}</p>
  </div>
</template>

<script lang="ts" setup>
type ImageProp = {
  src: string
  alt?: string
  width?: number | string
  height?: number | string
  loading?: 'eager' | 'lazy'
  srcset?: string
}

const props = defineProps<{
  title: string
  description: string
  image: ImageProp
}>({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: Object as () => ImageProp,
    required: true
  }
})
</script>

<style>
@import url("assets/css/artworkcard.css");

.card-image {
  display: block;
  width: 100%;
  height: auto;
}
</style>