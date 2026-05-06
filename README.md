# Kelsey Raine Fine Art Website

Nuxt static site with a gallery shop frontend, Stripe checkout handoff, and Netlify function scaffolding for webhook/approval/WHCC flow.

## Current Commerce Architecture

- Frontend: Nuxt static pages (GitHub Pages compatible)
- Catalog source for frontend: `public/data/gallery-catalog.json`
- Cart persistence: localStorage via `useCart`
- Checkout: POST to backend API (`/api/create-checkout-session`) then redirect to Stripe Checkout
- Backend (scaffold): Netlify Functions in `netlify/functions`
- Fulfillment strategy: manual approval gate before WHCC submission

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

- `app/pages/gallery.vue`: Product listing, filter, cart, Stripe checkout handoff
- `app/pages/gallery/success.vue`: Post-checkout success state
- `app/pages/gallery/cancel.vue`: Post-checkout cancel state
- `app/pages/admin/orders.vue`: Internal review page for approvals and WHCC submission

## Catalog Management

Edit `public/data/gallery-catalog.json` to manage inventory and pricing displayed in the gallery.

Per variant, update:

- `label`
- `stripePriceId`
- `priceCents`
- `whccSku`
- `inStock`

Notes:

- `inStock: false` disables checkout for that variant.
- Originals can exist in catalog now, but initial launch scope is prints-first.

## Netlify Function Endpoints (Scaffold)

- `netlify/functions/create-checkout-session.mjs`
- `netlify/functions/stripe-webhook.mjs`
- `netlify/functions/approve-order.mjs`
- `netlify/functions/submit-whcc-order.mjs`
- `netlify/functions/list-orders.mjs`

The checkout + webhook paths are implemented for Stripe test mode. Approval and WHCC submission now use a Supabase-backed order store.

## Stripe Catalog Sync

You can populate `public/data/gallery-catalog.json` from Stripe products/prices:

```bash
pnpm sync:stripe-catalog
```

Stripe metadata fields used by the sync script:

- Product metadata: `id`, `slug`, `medium`, `type`, `active`, `imageSrc`, `imageAlt`, `imageWidth`, `imageHeight`
- Price metadata: `whccSku`, `inStock`

## Environment Variables

Defined in `.env.example`:

- `NUXT_PUBLIC_CHECKOUT_API_BASE_URL`
- `SITE_URL`
- `ALLOWED_ORIGINS`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ADMIN_API_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHCC_API_BASE_URL`
- `WHCC_API_KEY`

## Supabase Schema

Apply the SQL in `supabase/orders.sql` before enabling webhooks/approval flow.

Equivalent schema:

```sql
create table if not exists public.orders (
	id uuid primary key default gen_random_uuid(),
	stripe_session_id text unique not null,
	status text not null default 'pending_approval',
	amount_total integer,
	currency text,
	customer_email text,
	line_items jsonb,
	whcc_external_id text,
	whcc_response jsonb,
	whcc_last_error text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
```

Recommended statuses:

- `pending_approval`
- `approved`
- `submitted_to_whcc`

## Deploy Notes

- GitHub Pages deployment stays static via `pnpm generate`.
- Netlify functions should be deployed as a separate backend service or combined deployment if you move hosting.
- Frontend must point `NUXT_PUBLIC_CHECKOUT_API_BASE_URL` to the live Netlify backend domain.

## Next Implementation Targets

1. Add order row-level access policy and a dedicated internal admin auth strategy.
2. Expand WHCC payload mapping to exact product/template IDs required by your account.
3. Add retries + exponential backoff queueing for WHCC submission failures.
