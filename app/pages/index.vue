<template>
  <div>
    <Headline/>
  </div>
  <div>
    <HeroSection/>
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

</style>