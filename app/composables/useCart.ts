import { computed, ref, watch } from 'vue'
import type { CartItem } from '@/types/gallery'

const STORAGE_KEY = 'krfa-cart-v1'

export function useCart() {
  const items = useState<CartItem[]>('cart-items', () => [])
  const isHydrated = ref(false)

  if (import.meta.client && !isHydrated.value) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[]
        if (Array.isArray(parsed)) {
          items.value = parsed
        }
      }
    } catch (error) {
      console.error('Failed to hydrate cart from localStorage:', error)
    } finally {
      isHydrated.value = true
    }
  }

  watch(
    items,
    (nextItems) => {
      if (!import.meta.client) {
        return
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems))
    },
    { deep: true }
  )

  const itemCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
  const subtotalCents = computed(() =>
    items.value.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0)
  )

  function addItem(item: CartItem) {
    const existing = items.value.find(
      (entry) => entry.productId === item.productId && entry.variantId === item.variantId
    )

    if (existing) {
      existing.quantity += item.quantity
      return
    }

    items.value.push(item)
  }

  function updateQuantity(productId: string, variantId: string, quantity: number) {
    const existing = items.value.find(
      (entry) => entry.productId === productId && entry.variantId === variantId
    )

    if (!existing) {
      return
    }

    if (quantity <= 0) {
      removeItem(productId, variantId)
      return
    }

    existing.quantity = quantity
  }

  function removeItem(productId: string, variantId: string) {
    items.value = items.value.filter(
      (entry) => !(entry.productId === productId && entry.variantId === variantId)
    )
  }

  function clearCart() {
    items.value = []
  }

  return {
    items,
    itemCount,
    subtotalCents,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  }
}
