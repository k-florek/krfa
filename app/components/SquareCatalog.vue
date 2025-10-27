<template>
  <div>
    <h1>Product Catalog</h1>
    
    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div v-else-if="catalogItems.length === 0" class="loading">
      Loading catalog items...
    </div>

    <ul v-else class="catalog-list">
      <li v-for="item in catalogItems" :key="item.id" class="catalog-item">
        <h2>{{ item.itemData.name }}</h2>
        <p v-if="item.itemData.description">{{ item.itemData.description }}</p>
        
        <div v-if="item.itemData.variations && item.itemData.variations.length > 0" class="variations">
          <h3>Variations:</h3>
          <ul>
            <li v-for="variation in item.itemData.variations" :key="variation.id">
              {{ variation.itemVariationData.name }}
              <span v-if="variation.itemVariationData.priceMoney" class="price">
                {{ variation.itemVariationData.priceMoney.currency }} {{ variation.itemVariationData.priceMoney.amount }}
              </span>
            </li>
          </ul>
        </div>

        <a :href="`https://kelsey-raine-fine-art.square.site/product/${item.itemData.name}/${item.id}`" 
           target="_blank" 
           class="buy-button">
          Buy on Square
        </a>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'

interface CatalogItemVariation {
  id: string;
  itemVariationData: { 
    name?: string;
    priceMoney?: {
      amount: string; // This will be our serialized BigInt
      currency: string;
    };
  };
}

interface CatalogItem {
  id: string;
  type: string;
  version: string;
  itemData: {
    name: string;
    description?: string;
    variations: CatalogItemVariation[];
  };
}

const catalogItems = ref<CatalogItem[]>([])
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const res = await fetch('/api/catalog')
    const data = await res.json()
    
    if (data.error) {
      error.value = data.error
      return
    }
    
    // Process the data to handle any remaining bigint strings if needed
    catalogItems.value = data.map((item: CatalogItem) => {
      if (item.itemData.variations) {
        item.itemData.variations = item.itemData.variations.map(variation => ({
          ...variation,
          priceMoney: variation.itemVariationData.priceMoney ? {
            ...variation.itemVariationData.priceMoney,
            // Convert cents to dollars for display if needed
            amount: (parseInt(variation.itemVariationData.priceMoney.amount) / 100).toFixed(2)
          } : undefined
        }))
      }
      return item
    })
  } catch (e) {
    error.value = 'Failed to load catalog items'
    console.error(e)
  }
})
</script>

<style scoped>
.error {
  color: red;
  padding: 1rem;
  margin: 1rem 0;
  border: 1px solid red;
  border-radius: 4px;
}

.loading {
  padding: 1rem;
  text-align: center;
  color: #666;
}

.catalog-list {
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
}

.catalog-item {
  border: 1px solid #ddd;
  padding: 1rem;
  border-radius: 8px;
}

.variations {
  margin: 1rem 0;
}

.variations ul {
  list-style: none;
  padding: 0;
}

.variations li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.price {
  font-weight: bold;
  color: #2c3e50;
}

.buy-button {
  display: inline-block;
  padding: 0.5rem 1rem;
  background-color: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  margin-top: 1rem;
}

.buy-button:hover {
  background-color: #3aa876;
}
</style>