import { defineEventHandler } from 'h3'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { client: squareClient } = require('square')

const client = new squareClient({
  environment: 'production',
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
})

export default defineEventHandler(async () => {
  try {
    const response = await client.catalogApi.listCatalog(undefined, 'ITEM')
    return response.result.objects || []
  } catch (error: any) {
    return { error: error?.message || 'An error occurred' }
  }
})
