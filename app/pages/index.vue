<template>
  <div>
    <h1>Welcome to the homepage</h1>
    <ArtworkCard 
    title="Test"
    description="HI"
    :image=artworkImage
    />
  </div>
  <div>
    <SquareCatalog></SquareCatalog>
  </div>
</template>

<script lang="ts" setup>
import Sandhill from '/img/artwork/sandhill_crane.jpg'

const artworkImage = {
  src: Sandhill,
  alt: 'Sandhill Crane',
  width: 800,
  height: 600
}
</script>

<style>

</style>