<template>
  <section class="checkout-status">
    <h1 class="watercolor-heading">Checkout Cancelled</h1>
    <p>Your cart has been saved. You can return to checkout whenever you are ready.</p>
    <div class="actions">
      <NuxtLink to="/gallery" class="btn">Back to Gallery</NuxtLink>
      <NuxtLink to="/" class="btn secondary">Back to Home</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Checkout Cancelled',
  description: 'Checkout was cancelled and no charge was made.',
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
