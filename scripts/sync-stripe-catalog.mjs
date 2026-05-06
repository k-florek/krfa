import fs from 'node:fs/promises'
import path from 'node:path'
import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY. Set it before running sync:stripe-catalog.')
}

const stripe = new Stripe(stripeSecretKey)

function parseBoolean(value, fallback = true) {
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

function parseNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toType(value) {
  return value === 'original' ? 'original' : 'print'
}

const products = []
for await (const product of stripe.products.list({ active: true, limit: 100 })) {
  products.push(product)
}

const prices = []
for await (const price of stripe.prices.list({ active: true, limit: 100 })) {
  prices.push(price)
}

const catalog = products.map((product) => {
  const metadata = product.metadata || {}
  const matchingPrices = prices.filter(
    (entry) => typeof entry.product === 'string' && entry.product === product.id
  )

  const variants = matchingPrices
    .filter((entry) => entry.currency === 'usd' && entry.type === 'one_time')
    .sort((a, b) => (a.unit_amount || 0) - (b.unit_amount || 0))
    .map((entry) => ({
      id: entry.lookup_key || entry.id,
      label: entry.nickname || `${(entry.unit_amount || 0) / 100} USD`,
      stripePriceId: entry.id,
      priceCents: entry.unit_amount || 0,
      currency: 'usd',
      whccSku: entry.metadata?.whccSku || '',
      inStock: parseBoolean(entry.metadata?.inStock, true),
    }))

  return {
    id: metadata.id || product.id,
    slug: metadata.slug || product.id,
    title: product.name,
    description: product.description || '',
    medium: metadata.medium || 'Unknown',
    type: toType(metadata.type),
    active: parseBoolean(metadata.active, true),
    image: {
      src: metadata.imageSrc || product.images?.[0] || '',
      alt: metadata.imageAlt || product.name,
      width: parseNumber(metadata.imageWidth, 800),
      height: parseNumber(metadata.imageHeight, 800),
    },
    variants,
  }
})

const outputPath = path.resolve(process.cwd(), 'public/data/gallery-catalog.json')
await fs.writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')

console.log(`Synced ${catalog.length} products to ${outputPath}`)
