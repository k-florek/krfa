<template>
  <div class="hero-section-wrapper">
    <div class="hero-section">
      <div class="hero-content">
        <p class="artist-label">About the Artist</p>
        <h1 class="watercolor-heading">Kelsey Raine</h1>
        <p>Kelsey is an emerging artist from Madison WI whose creative works seek to explore the emotional and physical connections in humanity and the natural world. Working in both watercolor and oil mediums, Kelsey captures the essence we share with each other and world around us.</p>
      </div>
    </div>
    <div class="hero-images">
      <img src="/img/photo/self-portrait-small.jpg" alt="self-portrait painted by Kelsey Raine" class="hero-img hero-img-1" />
      <img src="/img/photo/kelsey.jpg" alt="Kelsey Raine, visual artist from Madison WI" class="hero-img hero-img-2" />
      
    </div>
  </div>
</template>

<script lang="ts" setup>

</script>

<style scoped>
.artist-label {
  color: var(--color-text-muted);
  margin: 0 0 0.5rem 0;
}
.hero-section-wrapper {
  position: relative;
  overflow: visible;
  width: 100%;
}
.hero-section {
  background-color: var(--color-bg-body-dark);
  padding-top: 5rem;
  padding-bottom: 5rem;
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  z-index: 2;
  overflow: visible;
  width: 100%;
}
.hero-content {
  padding-left: 5rem;
  width: 40%;
  z-index: 2;
}

.hero-images {
  position: absolute;
  top: 8rem;
  right: 10rem;
  width: 50%;
  /* Remove height so images can overflow */
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  pointer-events: none;
  overflow: visible;
  z-index: 3;
}
.hero-img {
  position: absolute;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  border-radius: 16px;
  transition: transform 0.2s;
  pointer-events: auto;
}
.hero-img-1 {
  right: 10rem;
  width: 22rem;
  z-index: 2;
  transform: rotate(-6deg);
}
.hero-img-2 {
  top: -10rem;
  right: -3rem;
  width: 20rem;
  z-index: 1;
  transform: rotate(8deg);
}
@media (max-width: 1300px) {
  .hero-section {
    flex-direction: column;
    padding-left: 1rem;
    padding-right: 1rem;
    padding-bottom: 1rem;
  }
  .hero-content {
    width: 100%;
    padding-left: 0;
    margin-bottom: 2rem;
  }
  .hero-images {
    position: relative;
    width: 100%;
    min-width: 0;
    top: 0;
    right: 0;
    height: auto;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 2rem;
    padding: 0 1rem;
  }
  .hero-img {
    position: relative;
    transform: none;
    top: auto;
    right: auto;
    left: auto;
    bottom: auto;
  }
  .hero-img-1 {
    width: 45%;
    max-width: 300px;
    transform: rotate(-6deg);
  }
  .hero-img-2 {
    width: 45%;
    max-width: 300px;
    transform: rotate(8deg);
  }
}
</style>