import pg from 'pg'

const { Pool } = pg

const databaseUrl =
  process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL

let pool

function getPool() {
  if (!databaseUrl) {
    return null
  }

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 4,
    })
  }

  return pool
}

async function query(text, params = []) {
  const activePool = getPool()
  if (!activePool) {
    throw new Error('Netlify Database is not configured.')
  }

  return activePool.query(text, params)
}

export function isOrderStoreConfigured() {
  return !!databaseUrl
}

export async function upsertPendingOrder({
  stripeSessionId,
  amountTotal,
  currency,
  customerEmail,
  lineItems,
}) {
  if (!isOrderStoreConfigured()) {
    return { skipped: true, reason: 'Netlify Database is not configured.' }
  }

  const { rows } = await query(
    `
      insert into public.orders (
        stripe_session_id,
        status,
        amount_total,
        currency,
        customer_email,
        line_items
      )
      values ($1, 'pending_approval', $2, $3, $4, $5::jsonb)
      on conflict (stripe_session_id)
      do update set
        amount_total = excluded.amount_total,
        currency = excluded.currency,
        customer_email = excluded.customer_email,
        line_items = excluded.line_items,
        status = 'pending_approval'
      returning *
    `,
    [stripeSessionId, amountTotal, currency, customerEmail, JSON.stringify(lineItems || [])]
  )

  return { order: rows[0] }
}

export async function listOrdersByStatus(status) {
  const { rows } = await query(
    `
      select *
      from public.orders
      where status = $1
      order by created_at desc
    `,
    [status]
  )

  return rows
}

export async function approveOrder(orderId) {
  const { rows } = await query(
    `
      update public.orders
      set status = 'approved'
      where id = $1
        and status = 'pending_approval'
      returning *
    `,
    [orderId]
  )

  if (!rows[0]) {
    throw new Error('Order not found in pending_approval state.')
  }

  return rows[0]
}

export async function getApprovedOrder(orderId) {
  const { rows } = await query(
    `
      select *
      from public.orders
      where id = $1
        and status = 'approved'
      limit 1
    `,
    [orderId]
  )

  if (!rows[0]) {
    throw new Error('Approved order not found.')
  }

  return rows[0]
}

export async function markOrderSubmitted(orderId, externalId, rawResponse) {
  const { rows } = await query(
    `
      update public.orders
      set
        status = 'submitted_to_whcc',
        whcc_external_id = $2,
        whcc_response = $3::jsonb,
        whcc_last_error = null
      where id = $1
      returning *
    `,
    [orderId, externalId, JSON.stringify(rawResponse ?? null)]
  )

  if (!rows[0]) {
    throw new Error('Order not found while marking submitted.')
  }

  return rows[0]
}

export async function markOrderFailed(orderId, errorMessage) {
  const { rows } = await query(
    `
      update public.orders
      set
        status = 'approved',
        whcc_last_error = $2
      where id = $1
      returning *
    `,
    [orderId, errorMessage]
  )

  if (!rows[0]) {
    throw new Error('Order not found while marking failed submission.')
  }

  return rows[0]
}