// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: [
    '@/assets/css/global.css',
    '@/assets/fonts/Satoshi_Complete/Fonts/WEB/css/satoshi.css',
    '@/assets/fonts/Squidrock/squidrock.css',
    '@/assets/fonts/Refresh-Screen/refresh-screen.css'
  ],
  modules: ['@nuxt/content', '@nuxt/image', '@nuxt/ui']
})