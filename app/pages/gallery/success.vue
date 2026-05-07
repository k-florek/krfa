<template>
  <section class="checkout-status">
    <h1 class="watercolor-heading">Order Confirmed</h1>
    <p>
      Your design has been submitted to print. You will receive a confirmation email once
      your order is in production.
    </p>
    <div class="actions-row">
      <NuxtLink to="/gallery" class="btn btn-primary">Continue Shopping</NuxtLink>
      <NuxtLink to="/" class="btn btn-secondary">Back to Home</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Order Confirmed',
  description: 'Your print order has been submitted successfully.',
})
</script>

