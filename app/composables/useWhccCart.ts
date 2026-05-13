import { watch } from 'vue'

export type WhccCartItem = {
  id: string
  checkoutId: string
  editorId: string
  productId: string
  variantId: string
  productTitle: string
  variantLabel: string
  quantity: number
  priceCents: number
  currency: 'usd'
  whccSku: string | null
  whccProductId: string
  whccDesignId: string
  addedAt: string
}

const STORAGE_KEY = 'krfa-whcc-cart-v1'

function normalizeCartItem(item: Partial<WhccCartItem>): WhccCartItem | null {
  const id = String(item.id || '').trim()
  const editorId = String(item.editorId || '').trim()

  if (!id || !editorId) {
    return null
  }

  const quantity = Number(item.quantity || 0)
  const priceCents = Number(item.priceCents || 0)

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return null
  }

  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    return null
  }

  return {
    id,
    checkoutId: String(item.checkoutId || '').trim(),
    editorId,
    productId: String(item.productId || '').trim(),
    variantId: String(item.variantId || '').trim(),
    productTitle: String(item.productTitle || '').trim(),
    variantLabel: String(item.variantLabel || '').trim(),
    quantity,
    priceCents,
    currency: 'usd',
    whccSku: item.whccSku ? String(item.whccSku) : null,
    whccProductId: String(item.whccProductId || '').trim(),
    whccDesignId: String(item.whccDesignId || '').trim(),
    addedAt: String(item.addedAt || new Date().toISOString()),
  }
}

export function useWhccCart() {
  const items = useState<WhccCartItem[]>('whcc-cart-items', () => [])
  const loaded = useState<boolean>('whcc-cart-loaded', () => false)

  const subtotalCents = computed(() => {
    return items.value.reduce((sum, item) => sum + item.priceCents * item.quantity, 0)
  })

  const totalItems = computed(() => {
    return items.value.reduce((sum, item) => sum + item.quantity, 0)
  })

  const hasItems = computed(() => items.value.length > 0)

  function loadFromStorage() {
    if (import.meta.server || loaded.value) {
      return
    }

    loaded.value = true

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        items.value = []
        return
      }

      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        items.value = []
        return
      }

      items.value = parsed
        .map((entry) => normalizeCartItem(entry))
        .filter((entry): entry is WhccCartItem => Boolean(entry))
    } catch {
      items.value = []
    }
  }

  function persistToStorage() {
    if (import.meta.server) {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
  }

  function addOrUpdateItem(rawItem: Partial<WhccCartItem>) {
    const item = normalizeCartItem(rawItem)
    if (!item) {
      return
    }

    const index = items.value.findIndex((entry) => entry.id === item.id)
    if (index >= 0) {
      items.value[index] = {
        ...items.value[index],
        ...item,
      }
      return
    }

    items.value = [item, ...items.value]
  }

  function removeItem(itemId: string) {
    items.value = items.value.filter((item) => item.id !== itemId)
  }

  function updateQuantity(itemId: string, quantity: number) {
    const normalizedQuantity = Number(quantity)
    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
      removeItem(itemId)
      return
    }

    items.value = items.value.map((item) => {
      if (item.id !== itemId) {
        return item
      }

      return {
        ...item,
        quantity: Math.floor(normalizedQuantity),
      }
    })
  }

  function clearCart() {
    items.value = []
  }

  if (import.meta.client) {
    loadFromStorage()
    watch(items, persistToStorage, { deep: true })
  }

  return {
    items,
    hasItems,
    subtotalCents,
    totalItems,
    addOrUpdateItem,
    removeItem,
    updateQuantity,
    clearCart,
    loadFromStorage,
  }
}
