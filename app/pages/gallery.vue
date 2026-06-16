<template>
  <section class="gallery-page">
    <div class="gallery-header">
      <div class="gallery-header-inner">
        <div class="site-headline">
          <NuxtLink to="/" class="site-brand">Kelsey Raine Art</NuxtLink>
          <NuxtLink to="/" class="back-home btn btn-outline-dark">Back to Home</NuxtLink>
        </div>
        <div class="gallery-title-row">
          <h1 class="watercolor-heading">Watercolor Prints</h1>
        </div>
      </div>
    </div>

    <div class="pixieset-embed">
      <iframe
        src="https://kelseyraineart.pixieset.com/watercolorprints/"
        frameborder="0"
        allowfullscreen
        title="Watercolor Prints Gallery"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Watercolor Prints',
  description: 'Browse and shop watercolor prints by Kelsey Raine Art.',
})

useHead({
  bodyAttrs: { style: 'overflow: hidden' },
})
</script>

