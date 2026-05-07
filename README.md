# Kelsey Raine Fine Art Website

Nuxt static site with a gallery shop frontend and Netlify function scaffolding for WHCC Editor + Order API ordering.

## Current Commerce Architecture

- Frontend: Nuxt static pages (GitHub Pages compatible)
- Catalog source for frontend: `public/data/gallery-catalog.json`
- Checkout: product selection in gallery → WHCC Editor launched via `/api/create-whcc-editor` → order confirmed in WHCC
- Backend (scaffold): Netlify Functions in `netlify/functions`
- Fulfillment strategy: direct WHCC ordering flow (no local order database)

## Run Locally

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment template and fill values:

```bash
cp .env.example .env
```

3. Start Nuxt dev server:

```bash
pnpm dev
```

Site runs at `http://localhost:3000`.

## New Pages

- `app/pages/gallery.vue`: Product listing, filter, and WHCC editor launch per print
- `app/pages/gallery/success.vue`: Post-checkout success state
- `app/pages/gallery/cancel.vue`: Post-checkout cancel state

## Catalog Management

Edit `public/data/gallery-catalog.json` to manage inventory and pricing displayed in the gallery.

Per variant, update:

- `label`
- `whccProductId`
- `whccDesignId`
- `priceCents`
- `whccSku`
- `inStock`

Notes:

- `inStock: false` disables checkout for that variant.
- Originals can exist in catalog now, but initial launch scope is prints-first.

## Netlify Function Endpoints

- `netlify/functions/create-whcc-editor.mjs` — creates a WHCC editor session and returns editor launch URL
- `netlify/functions/verify-admin.mjs`, `admin-session.mjs`, `admin-logout.mjs` — admin auth


## Environment Variables

Defined in `.env.example`:

- `NUXT_PUBLIC_CHECKOUT_API_BASE_URL`
- `SITE_URL`
- `ALLOWED_ORIGINS`
- `ADMIN_EMAILS`
- `ADMIN_SESSION_SECRET`
- `WHCC_EDITOR_API_BASE_URL`
- `WHCC_KEY`
- `WHCC_SECRET`
- `WHCC_ACCOUNT_ID`
- `WHCC_HTTP_TIMEOUT_MS` (optional, default 15000)

Notes:

- `ADMIN_SESSION_SECRET` should be a long random string and must be set for admin login/session to work.
- If `NUXT_PUBLIC_CHECKOUT_API_BASE_URL` is omitted, frontend requests fall back to same-origin `/api`.

## Deploy Notes

- GitHub Pages deployment stays static via `pnpm generate`.
- Netlify functions should be deployed as a separate backend service or combined deployment if you move hosting.
- On Netlify, Nuxt uses the `netlify-static` preset and outputs static assets to `dist`.
- Frontend must point `NUXT_PUBLIC_CHECKOUT_API_BASE_URL` to the live Netlify backend domain.

## Next Implementation Targets

1. Implement WHCC editor callback handler to capture completed editor state.
2. Implement WHCC export + order create + confirm sequence after editor completion.
3. Implement WHCC webhook handler for production/shipping status updates.
