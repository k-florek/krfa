import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { handlePreflight, jsonResponse } from './_shared.mjs'

const CACHE_TTL_MS = 5 * 60 * 1000
const DATA_PATH = resolve(process.cwd(), 'public/data/whcc-product-variations.json')

let cachedOptions = null
let cachedAt = 0

function normalizePositiveInteger(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return Math.floor(parsed)
}

function normalizeAspectRatio(value) {
  const ratio = String(value || '').trim()
  if (!ratio) {
    return ''
  }

  if (!ratio.includes(':')) {
    const parsed = Number.parseFloat(ratio)
    return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : ''
  }

  const parts = ratio.split(':').map((part) => Number.parseFloat(part))
  if (parts.length !== 2) {
    return ''
  }

  const [width, height] = parts
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return ''
  }

  return `${width}:${height}`
}

function normalizePaperOption(option, variationId) {
  const id = String(option?.id || '').trim()
  const paperLabel = String(option?.paperLabel || '').trim()
  const paperAttributeUID = normalizePositiveInteger(option?.paperAttributeUID)
  const unitPriceCents = normalizePositiveInteger(option?.unitPriceCents)
  const active = option?.active !== false

  if (!active || !id || !paperLabel || !paperAttributeUID || unitPriceCents === null) {
    return null
  }

  return {
    id,
    key: `${variationId}:${id}`,
    paperLabel,
    paperAttributeUID,
    unitPriceCents,
  }
}

function normalizeVariation(variation) {
  const id = String(variation?.id || '').trim()
  const productUID = String(variation?.productUID || '').trim()
  const productName = String(variation?.productName || '').trim()
  const productNodeId = normalizePositiveInteger(variation?.productNodeId)
  const widthIn = Number(variation?.widthIn)
  const heightIn = Number(variation?.heightIn)
  const aspectRatio = normalizeAspectRatio(variation?.aspectRatio)
  const defaultQuantity = normalizePositiveInteger(variation?.defaultQuantity) || 1
  const minQuantity = normalizePositiveInteger(variation?.minQuantity) || 1
  const maxQuantity = normalizePositiveInteger(variation?.maxQuantity) || 50
  const sortOrder = Number.isFinite(Number(variation?.sortOrder)) ? Number(variation.sortOrder) : 0
  const active = variation?.active !== false

  if (
    !active
    || !id
    || !productUID
    || !productName
    || !productNodeId
    || !Number.isFinite(widthIn)
    || widthIn <= 0
    || !Number.isFinite(heightIn)
    || heightIn <= 0
    || !aspectRatio
  ) {
    return null
  }

  const paperOptions = Array.isArray(variation?.paperOptions)
    ? variation.paperOptions
      .map((option) => normalizePaperOption(option, id))
      .filter(Boolean)
    : []

  if (!paperOptions.length) {
    return null
  }

  const clampedMin = Math.max(1, minQuantity)
  const clampedMax = Math.max(clampedMin, maxQuantity)
  const clampedDefault = Math.min(clampedMax, Math.max(clampedMin, defaultQuantity))

  return {
    id,
    productUID,
    productName,
    productNodeId,
    widthIn,
    heightIn,
    aspectRatio,
    sortOrder,
    defaultQuantity: clampedDefault,
    minQuantity: clampedMin,
    maxQuantity: clampedMax,
    paperOptions,
  }
}

async function loadOptions() {
  if (cachedOptions && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedOptions
  }

  const raw = await readFile(DATA_PATH, 'utf8')
  const payload = JSON.parse(raw)
  const variations = Array.isArray(payload?.variations) ? payload.variations : []

  const normalized = variations
    .map((variation) => normalizeVariation(variation))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder
      }

      if (a.widthIn !== b.widthIn) {
        return a.widthIn - b.widthIn
      }

      return a.heightIn - b.heightIn
    })

  const seenVariationIds = new Set()
  const duplicateVariation = normalized.find((item) => {
    if (seenVariationIds.has(item.id)) {
      return true
    }

    seenVariationIds.add(item.id)
    return false
  })

  if (duplicateVariation) {
    throw new Error(`Duplicate variation id found: ${duplicateVariation.id}`)
  }

  const seenPaperKeys = new Set()
  const duplicatePaper = normalized
    .flatMap((variation) => variation.paperOptions)
    .find((paper) => {
      if (seenPaperKeys.has(paper.key)) {
        return true
      }

      seenPaperKeys.add(paper.key)
      return false
    })

  if (duplicatePaper) {
    throw new Error(`Duplicate paper option key found: ${duplicatePaper.key}`)
  }

  cachedOptions = normalized.map(({ sortOrder, ...variation }) => variation)
  cachedAt = Date.now()
  return cachedOptions
}

export async function handler(event) {
  const origin = event.headers.origin || ''

  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight(origin)
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, origin, { error: 'Method not allowed' })
  }

  try {
    const options = await loadOptions()
    return jsonResponse(200, origin, {
      ok: true,
      options,
    })
  } catch (error) {
    console.error('whcc-print-options failed:', error)
    return jsonResponse(500, origin, {
      error: error instanceof Error ? error.message : 'Unable to load print options.',
    })
  }
}
