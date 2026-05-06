import { handlePreflight, jsonResponse } from './_shared.mjs'
import { approveOrder, isOrderStoreConfigured } from './_orders.mjs'

export async function handler(event) {
  const origin = event.headers.origin || ''

  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight(origin)
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, origin, { error: 'Method not allowed' })
  }

  const adminToken = process.env.ADMIN_API_TOKEN
  const authHeader = event.headers.authorization || ''

  if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
    return jsonResponse(401, origin, { error: 'Unauthorized' })
  }

  try {
    const payload = JSON.parse(event.body || '{}')
    const orderId = String(payload.orderId || '')

    if (!orderId) {
      return jsonResponse(400, origin, { error: 'orderId is required.' })
    }

    if (!isOrderStoreConfigured()) {
      return jsonResponse(500, origin, {
        error: 'Order store is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      })
    }

    const updated = await approveOrder(orderId)

    return jsonResponse(200, origin, {
      ok: true,
      orderId,
      status: 'approved',
      order: updated,
    })
  } catch (error) {
    console.error('approve-order failed:', error)
    return jsonResponse(500, origin, { error: 'Unable to approve order.' })
  }
}
