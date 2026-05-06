<template>
  <section class="checkout-status">
    <h1 class="watercolor-heading">Checkout Cancelled</h1>
    <p>Your cart has been saved. You can return to checkout whenever you are ready.</p>
    <div class="actions-row">
      <NuxtLink to="/gallery" class="btn btn-primary">Back to Gallery</NuxtLink>
      <NuxtLink to="/" class="btn btn-secondary">Back to Home</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Checkout Cancelled',
  description: 'Checkout was cancelled and no charge was made.',
})
</script>

