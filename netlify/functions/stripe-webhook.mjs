import Stripe from 'stripe'
import { jsonResponse } from './_shared.mjs'
import { isOrderStoreConfigured, upsertPendingOrder } from './_orders.mjs'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

export async function handler(event) {
  const origin = event.headers.origin || ''

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, origin, { error: 'Method not allowed' })
  }

  if (!stripe || !stripeWebhookSecret) {
    return jsonResponse(500, origin, {
      error: 'Stripe webhook is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.',
    })
  }

  try {
    const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature']
    if (!signature) {
      return jsonResponse(400, origin, { error: 'Missing stripe-signature header.' })
    }

    const stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      stripeWebhookSecret
    )

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object

      const lineItemsResponse = await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 100,
      })

      const lineItems = lineItemsResponse.data.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        amountSubtotal: item.amount_subtotal,
        amountTotal: item.amount_total,
        currency: item.currency,
        priceId: item.price?.id || null,
        productId: typeof item.price?.product === 'string' ? item.price.product : null,
      }))

      if (isOrderStoreConfigured()) {
        await upsertPendingOrder({
          stripeSessionId: session.id,
          amountTotal: session.amount_total,
          currency: session.currency,
          customerEmail: session.customer_details?.email || null,
          lineItems,
        })
      }

      console.log('checkout.session.completed', {
        sessionId: session.id,
        amountTotal: session.amount_total,
        customerEmail: session.customer_details?.email,
        lineItemCount: lineItems.length,
        persisted: isOrderStoreConfigured(),
      })
    }

    return jsonResponse(200, origin, { received: true })
  } catch (error) {
    console.error('stripe-webhook failed:', error)
    return jsonResponse(400, origin, { error: 'Webhook signature verification failed.' })
  }
}
