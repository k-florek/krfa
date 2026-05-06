<template>
  <div>
    <Headline/>
  </div>
  <div>
    <HeroSection/>
  </div>
  <div class="gallery-cta-section">
    <div class="social-links">
      <a 
        href="https://www.facebook.com/profile.php?id=61581490420802" 
        target="_blank" 
        rel="noopener noreferrer"
        aria-label="Visit our Facebook page"
        class="social-link facebook"
      >
        <i class="fa-brands fa-facebook"></i>
      </a>
      <a 
        href="https://www.instagram.com/kelseyraineart" 
        target="_blank" 
        rel="noopener noreferrer"
        aria-label="Visit our Instagram page"
        class="social-link instagram"
      >
        <i class="fa-brands fa-instagram"></i>
      </a>
      <a 
        href="https://bsky.app/profile/kelseyraineart.com" 
        target="_blank" 
        rel="noopener noreferrer"
        aria-label="Visit our Bluesky profile"
        class="social-link bluesky"
      >
        <i class="fa-brands fa-bluesky"></i>
      </a>
    </div>
    <NuxtLink to="/gallery" class="gallery-cta-button">
      Shop Gallery
    </NuxtLink>
  </div>
  <div>
    <FeaturedWorks/>
  </div>
  <div>
    <Footer/>
  </div>
</template>

<script lang="ts" setup>
useSeoMeta({
  title: 'Watercolor & Oil Paintings',
  description: 'Kelsey Raine is an emerging visual artist from Madison, WI, creating watercolor and oil paintings that explore emotional and physical connections in humanity and the natural world.',
  ogTitle: 'Kelsey Raine Art | Watercolor & Oil Paintings',
  ogDescription: 'Kelsey Raine is an emerging visual artist from Madison, WI, creating watercolor and oil paintings that explore emotional and physical connections in humanity and the natural world.',
  ogImage: 'https://kelseyraineart.com/img/photo/kelsey.jpg',
  ogUrl: 'https://kelseyraineart.com',
  twitterCard: 'summary_large_image',
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: 'Kelsey Raine',
        url: 'https://kelseyraineart.com',
        jobTitle: 'Visual Artist',
        description: 'Emerging artist from Madison, WI creating watercolor and oil paintings that explore emotional and physical connections in humanity and the natural world.',
        image: 'https://kelseyraineart.com/img/photo/kelsey.jpg',
        sameAs: [
          'https://www.instagram.com/kelseyraineart',
          'https://www.facebook.com/profile.php?id=61581490420802',
          'https://bsky.app/profile/kelseyraineart.com',
        ],
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Madison',
          addressRegion: 'WI',
          addressCountry: 'US',
        },
      }),
    },
  ],
})
</script>

<style>
.gallery-cta-section {
  background-color: #000;
  padding: 4rem 2rem;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: 200px;
}

.gallery-cta-section .social-links {
  grid-column: 1;
  justify-content: flex-start;
  padding-left: 8em;
}

.gallery-cta-section .gallery-cta-button {
  grid-column: 2;
}

.gallery-cta-button {
  background-color: white;
  color: #000;
  padding: 1rem 2.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  text-decoration: none;
  border: 2px solid white;
  border-radius: 4px;
  transition: all 0.3s ease;
  display: inline-block;
  cursor: pointer;
}

.gallery-cta-button:hover {
  background-color: transparent;
  color: white;
}

/* Social Links */
.social-links {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: var(--color-bg-body);
  color: var(--color-text-primary);
  font-size: 1.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px var(--color-shadow-soft);
  text-decoration: none;
}

.social-link:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 16px var(--color-shadow-soft);
}

.social-link.instagram:hover {
  background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
  color: white;
}

.social-link.bluesky:hover {
  background-color: #1285fe;
  color: white;
}

.social-link.facebook:hover {
  background-color: #1877f2;
  color: white;
}
</style>