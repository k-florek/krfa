<template>
  <section class="checkout-status">
    <h1 class="watercolor-heading">Editor Session Cancelled</h1>
    <p>Your edited item was not added to cart. You can return to the gallery and try again.</p>
    <div class="actions-row">
      <NuxtLink to="/gallery" class="btn btn-primary">Back to Gallery</NuxtLink>
      <NuxtLink to="/gallery/success" class="btn btn-secondary">View Cart</NuxtLink>
      <NuxtLink to="/" class="btn btn-secondary">Back to Home</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
const route = useRoute()
const PENDING_STORAGE_KEY = 'krfa-whcc-pending-launches-v1'

onMounted(() => {
  const checkoutId = String(route.query.checkout_id || '').trim()
  if (!checkoutId || import.meta.server) {
    return
  }

  try {
    const raw = window.localStorage.getItem(PENDING_STORAGE_KEY)
    if (!raw) {
      return
    }

    const launches = JSON.parse(raw)
    if (!launches || typeof launches !== 'object') {
      return
    }

    delete launches[checkoutId]
    window.localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(launches))
  } catch {
    // Ignore local storage cleanup failures.
  }
})

useSeoMeta({
  title: 'Editor Session Cancelled',
  description: 'The editor session was closed and no item was added to cart.',
})
</script>

