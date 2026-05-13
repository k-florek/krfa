# Kelsey Raine Fine Art Website

Nuxt static site with a gallery shop frontend and Netlify function scaffolding for WHCC Editor + Order API ordering.

## Current Commerce Architecture

- Frontend: Nuxt static pages (GitHub Pages compatible)
- Catalog source for frontend: `public/data/gallery-catalog.json`
- Checkout flow:
  1. Product selection in gallery
  2. Launch WHCC Editor via `/api/create-whcc-editor`
  3. Return to `/gallery/success` and add completed editor item to local cart
  4. Submit cart with shipping via `/api/submit-whcc-order` (WHCC Order Submit API)
- Backend: Netlify Functions in `netlify/functions`
- Fulfillment strategy: direct WHCC submit flow (no local order database)

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

## Key Pages

- `app/pages/gallery.vue`: Product listing, filter, WHCC editor launch, and cart summary
- `app/pages/gallery/success.vue`: Cart review, shipping collection, and final order submit
- `app/pages/gallery/cancel.vue`: Editor cancel state and recovery actions

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
- `netlify/functions/whcc-editor-complete.mjs` — validates completed editor return payload and materializes a cart item
- `netlify/functions/submit-whcc-order.mjs` — exports editor IDs and submits the final order via WHCC Order Submit API
- `netlify/functions/verify-admin.mjs`, `admin-session.mjs`, `admin-logout.mjs` — admin auth shell


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
- `WHCC_ORDER_API_BASE_URL`
- `WHCC_ORDER_KEY`
- `WHCC_ORDER_SECRET`
- `WHCC_SHIP_FROM_NAME`
- `WHCC_SHIP_FROM_ADDR1`
- `WHCC_SHIP_FROM_ADDR2` (optional)
- `WHCC_SHIP_FROM_CITY`
- `WHCC_SHIP_FROM_STATE`
- `WHCC_SHIP_FROM_ZIP`
- `WHCC_SHIP_FROM_COUNTRY`
- `WHCC_SHIP_FROM_PHONE`
- `WHCC_HTTP_TIMEOUT_MS` (optional, default 15000)

Notes:

- `ADMIN_SESSION_SECRET` should be a long random string and must be set for admin login/session to work.
- If `NUXT_PUBLIC_CHECKOUT_API_BASE_URL` is omitted, frontend requests fall back to same-origin `/api`.

## Deploy Notes

- GitHub Pages deployment stays static via `pnpm generate`.
- Netlify functions should be deployed as a separate backend service or combined deployment if you move hosting.
- On Netlify, Nuxt uses the `netlify-static` preset and outputs static assets to `dist`.
- Frontend must point `NUXT_PUBLIC_CHECKOUT_API_BASE_URL` to the live Netlify backend domain.

## Notes

- Local cart state is browser-local and intentionally not persisted to a database.
- WHCC webhook status syncing is not yet implemented in this repository.
