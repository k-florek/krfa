import Stripe from 'stripe'
import { handlePreflight, jsonResponse } from './_shared.mjs'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

function normalizeLineItems(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => ({
      price: String(item?.stripePriceId || ''),
      quantity: Number(item?.quantity || 0),
      productId: String(item?.productId || ''),
      variantId: String(item?.variantId || ''),
      productTitle: String(item?.productTitle || ''),
      variantLabel: String(item?.variantLabel || ''),
    }))
    .filter((item) => item.price && item.quantity > 0)
}

export async function handler(event) {
  const origin = event.headers.origin || ''

  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight(origin)
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, origin, { error: 'Method not allowed' })
  }

  if (!stripe) {
    return jsonResponse(500, origin, {
      error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in Netlify environment.',
    })
  }

  try {
    const payload = JSON.parse(event.body || '{}')
    const lineItems = normalizeLineItems(payload.lineItems)

    if (!lineItems.length) {
      return jsonResponse(400, origin, { error: 'At least one valid line item is required.' })
    }

    const siteUrl = process.env.SITE_URL || 'http://localhost:3000'
    const successPath = payload.successPath || '/gallery/success'
    const cancelPath = payload.cancelPath || '/gallery/cancel'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems.map((entry) => ({
        price: entry.price,
        quantity: entry.quantity,
      })),
      success_url: `${siteUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}${cancelPath}`,
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      metadata: {
        source: 'krfa-gallery',
      },
    })

    return jsonResponse(200, origin, {
      checkoutUrl: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    console.error('create-checkout-session failed:', error)
    return jsonResponse(500, origin, { error: 'Unable to create checkout session.' })
  }
}
