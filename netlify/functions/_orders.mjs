import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function isOrderStoreConfigured() {
  return !!(supabaseUrl && supabaseServiceRoleKey)
}

export async function upsertPendingOrder({
  stripeSessionId,
  amountTotal,
  currency,
  customerEmail,
  lineItems,
}) {
  const supabase = getClient()
  if (!supabase) {
    return { skipped: true, reason: 'Supabase is not configured.' }
  }

  const payload = {
    stripe_session_id: stripeSessionId,
    status: 'pending_approval',
    amount_total: amountTotal,
    currency,
    customer_email: customerEmail,
    line_items: lineItems,
  }

  const { data, error } = await supabase
    .from('orders')
    .upsert(payload, { onConflict: 'stripe_session_id' })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return { order: data }
}

export async function listOrdersByStatus(status) {
  const supabase = getClient()
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

export async function approveOrder(orderId) {
  const supabase = getClient()
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'approved' })
    .eq('id', orderId)
    .eq('status', 'pending_approval')
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function getApprovedOrder(orderId) {
  const supabase = getClient()
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('status', 'approved')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function markOrderSubmitted(orderId, externalId, rawResponse) {
  const supabase = getClient()
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'submitted_to_whcc',
      whcc_external_id: externalId,
      whcc_response: rawResponse,
      whcc_last_error: null,
    })
    .eq('id', orderId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function markOrderFailed(orderId, errorMessage) {
  const supabase = getClient()
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'approved',
      whcc_last_error: errorMessage,
    })
    .eq('id', orderId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}