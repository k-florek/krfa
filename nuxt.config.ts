// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  routeRules: {},
  runtimeConfig: {
    public: {
      checkoutApiBaseUrl: process.env.NUXT_PUBLIC_CHECKOUT_API_BASE_URL || '',
      netlifySiteUrl: process.env.NUXT_PUBLIC_NETLIFY_SITE_URL || '',
      checkoutSuccessPath: '/gallery/success',
      checkoutCancelPath: '/gallery/cancel'
    }
  },
  css: [
    '@/assets/css/index.css',
    '@/assets/fonts/Satoshi_Complete/Fonts/WEB/css/satoshi.css',
    '@/assets/fonts/Squidrock/squidrock.css',
    '@/assets/fonts/Refresh-Screen/refresh-screen.css'
  ],
  modules: ['@nuxt/content', '@nuxt/image', '@nuxt/ui'],
  app: {
    head: {
      htmlAttrs: {
        lang: 'en'
      },
      titleTemplate: '%s | Kelsey Raine Art',
      meta: [
        { name: 'description', content: 'Kelsey Raine is an emerging visual artist from Madison, WI, creating watercolor and oil paintings that explore emotional and physical connections in humanity and the natural world.' },
        { name: 'author', content: 'Kelsey Raine' },
        { property: 'og:site_name', content: 'Kelsey Raine Art' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://kelseyraineart.com' },
        { property: 'og:title', content: 'Kelsey Raine Art | Watercolor & Oil Paintings' },
        { property: 'og:description', content: 'Kelsey Raine is an emerging visual artist from Madison, WI, creating watercolor and oil paintings that explore emotional and physical connections in humanity and the natural world.' },
        { property: 'og:image', content: 'https://kelseyraineart.com/img/photo/kelsey.jpg' },
        { property: 'og:locale', content: 'en_US' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Kelsey Raine Art | Watercolor & Oil Paintings' },
        { name: 'twitter:description', content: 'Kelsey Raine is an emerging visual artist from Madison, WI, creating watercolor and oil paintings that explore emotional and physical connections in humanity and the natural world.' },
        { name: 'twitter:image', content: 'https://kelseyraineart.com/img/photo/kelsey.jpg' },
      ],
      link: [
        {
          rel: 'canonical',
          href: 'https://kelseyraineart.com'
        },
        {
          rel: 'stylesheet',
          href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css',
          integrity: 'sha512-2SwdPD6INVrV/lHTZbO2nodKhrnDdJK9/kg2XD1r9uGqPo1cUbujc+IYdlYdEErWNu69gVcYgdxlmVmzTWnetw==',
          crossorigin: 'anonymous',
          referrerpolicy: 'no-referrer'
        }
      ]
    }
  }
})