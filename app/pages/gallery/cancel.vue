<template>
  <section class="checkout-status">
    <h1 class="watercolor-heading">Order Cancelled</h1>
    <p>Your editor session was closed and no order was placed.</p>
    <div class="actions-row">
      <NuxtLink to="/gallery" class="btn btn-primary">Back to Gallery</NuxtLink>
      <NuxtLink to="/" class="btn btn-secondary">Back to Home</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Order Cancelled',
  description: 'The editor session was closed and no order was placed.',
})
</script>

