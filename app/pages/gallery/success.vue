<template>
  <section class="checkout-status">
    <h1 class="watercolor-heading">Order Received</h1>
    <p>
      Thank you for your purchase. We have received your payment and will review the order before
      sending it to fulfillment.
    </p>
    <div class="actions">
      <NuxtLink to="/gallery" class="btn">Continue Shopping</NuxtLink>
      <NuxtLink to="/" class="btn secondary">Back to Home</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Checkout Success',
  description: 'Your order was received successfully.',
})
</script>

<style scoped>
.checkout-status {
  max-width: 820px;
  margin: 4rem auto;
  padding: 2rem;
  border: 1px solid var(--color-border-muted);
  border-radius: 14px;
  text-align: center;
  background: #fff;
}

.actions {
  margin-top: 1.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-block;
  background: #1d4ed8;
  color: #fff;
  border-radius: 8px;
  padding: 0.65rem 1rem;
}

.btn.secondary {
  background: #f3f4f6;
  color: #111827;
}
</style>
