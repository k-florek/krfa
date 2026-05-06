<template>
  <section class="checkout-status">
    <h1 class="watercolor-heading">Order Received</h1>
    <p>
      Thank you for your purchase. We have received your payment and will review the order before
      sending it to fulfillment.
    </p>
    <div class="actions-row">
      <NuxtLink to="/gallery" class="btn btn-primary">Continue Shopping</NuxtLink>
      <NuxtLink to="/" class="btn btn-secondary">Back to Home</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Checkout Success',
  description: 'Your order was received successfully.',
})
</script>

