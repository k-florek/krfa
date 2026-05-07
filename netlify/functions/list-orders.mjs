import { handlePreflight, jsonResponse } from './_shared.mjs'
import { isOrderStoreConfigured, listOrdersByStatus } from './_orders.mjs'
import { requireAdminSession } from './_auth-common.mjs'


export async function handler(event) {
  const origin = event.headers.origin || ''

  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight(origin)
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, origin, { error: 'Method not allowed' })
  }

  const auth = requireAdminSession(event)

  if (!auth.authorized) {
    return jsonResponse(401, origin, { error: 'Unauthorized', details: auth.error })
  }

  if (!isOrderStoreConfigured()) {
    return jsonResponse(500, origin, {
      error: 'Order store is not configured. Set NETLIFY_DATABASE_URL (or DATABASE_URL).',
    })
  }

  try {
    const status = String(event.queryStringParameters?.status || 'pending_approval')
    const orders = await listOrdersByStatus(status)

    return jsonResponse(200, origin, {
      ok: true,
      status,
      orders,
    })
  } catch (error) {
    console.error('list-orders failed:', error)
    return jsonResponse(500, origin, { error: 'Unable to list orders.' })
  }
}
