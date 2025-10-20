<template>
  <div>
    <h1>Product Catalog</h1>
    <ul>
      <li v-for="item in catalogItems" :key="item.id">
        {{ item.itemData.name }}
        <!-- Link to Square checkout page for this item -->
        <a :href="`https://squareup.com/store/your-store-name/product/${item.id}`" target="_blank">
          Buy on Square
        </a>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'

const catalogItems = ref([])

onMounted(async () => {
  const res = await fetch('/api/catalog')
  const data = await res.json()
  if (!data.error) catalogItems.value = data
})
</script>

<style>

</style>