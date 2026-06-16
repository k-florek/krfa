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
useSeoMeta({
  title: 'Editor Session Cancelled',
  description: 'The editor session was closed and no item was added to cart.',
})
</script>

