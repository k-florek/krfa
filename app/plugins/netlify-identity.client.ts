/**
 * Global Netlify Identity plugin
 *
 * Loads the Netlify Identity widget on every page so that OAuth redirects
 * (which land on the site root with #access_token=...) are handled correctly.
 * When a login event fires outside of /admin/login, the user is redirected
 * there to complete the session-cookie exchange.
 */

declare global {
  interface Window {
    netlifyIdentity: any
  }
}

export default defineNuxtPlugin(() => {
  const route = useRoute()
  const config = useRuntimeConfig()

  const initListeners = () => {
    // When running locally, the widget cannot auto-detect the Netlify site.
    // Point it at the production (or branch) Identity service explicitly.
    if (config.public.netlifySiteUrl) {
      window.netlifyIdentity.init({ APIUrl: `${config.public.netlifySiteUrl}/.netlify/identity` })
    }
    // Handle the case where the login event fires after we register the listener
    window.netlifyIdentity.on('login', () => {
      if (route.path !== '/admin/login') {
        navigateTo('/admin/login')
      }
    })

    // Fallback: if login fired before the listener was attached (can happen
    // when the widget processes #access_token= synchronously during init),
    // check for a current user and redirect if we're sitting on the hash page.
    if (window.location.hash.includes('access_token')) {
      const user = window.netlifyIdentity.currentUser()
      if (user && route.path !== '/admin/login') {
        navigateTo('/admin/login')
      }
    }
  }

  if (window.netlifyIdentity) {
    initListeners()
  } else {
    const script = document.createElement('script')
    script.src = 'https://identity.netlify.com/v1/netlify-identity-widget.js'
    script.async = true
    script.onload = initListeners
    document.head.appendChild(script)
  }
})
