<template>
  <div class="headline">
    <NuxtLink to="/" class="site-brand">Kelsey Raine Art</NuxtLink>
    <nav class="headline-nav" aria-label="Primary">
      <NuxtLink to="/" class="nav-link" active-class="is-active">Home</NuxtLink>
      <NuxtLink to="/gallery" class="nav-link" active-class="is-active">Gallery Shop</NuxtLink>
    </nav>
  </div>
</template>

<script lang="ts" setup>

</script>

<style scoped>
.site-brand {
  font-size: inherit;
  font-weight: inherit;
  margin: 0;
  color: inherit;
}

.headline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-left: 5rem;
  padding-right: 5rem;
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.headline-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.nav-link {
  border: 1px solid var(--color-border-muted);
  border-radius: 999px;
  color: var(--color-text-primary);
  padding: 0.35rem 0.8rem;
  text-decoration: none;
}

.nav-link.is-active {
  background: #14213d;
  color: #fff;
  border-color: #14213d;
}

@media (max-width: 768px) {
  .headline {
    padding-left: 0;
    padding-right: 0;
    text-align: center;
    flex-direction: column;
    gap: 0.8rem;
  }
}
</style>