<template>
  <div class="headline">
    <p class="site-brand">Kelsey Raine Art</p>
  </div>
</template>

<script lang="ts" setup>

</script>

<style scoped>
.site-brand {
  font-size: inherit;
  font-weight: inherit;
  margin: 0;
}

.headline {
  padding-left: 5rem;
  padding-top: 2rem;
  padding-bottom: 2rem;
}

@media (max-width: 768px) {
  .headline {
    padding-left: 0;
    text-align: center;
  }
}
</style>