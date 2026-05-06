export type ProductType = 'print' | 'original'

export interface CatalogImage {
  src: string
  alt: string
  width?: number
  height?: number
}

export interface ProductVariant {
  id: string
  label: string
  stripePriceId: string
  priceCents: number
  currency: 'usd'
  whccSku?: string
  inStock: boolean
}

export interface GalleryProduct {
  id: string
  slug: string
  title: string
  description: string
  medium: string
  type: ProductType
  active: boolean
  image: CatalogImage
  variants: ProductVariant[]
}

export interface CartItem {
  productId: string
  productTitle: string
  productType: ProductType
  variantId: string
  variantLabel: string
  stripePriceId: string
  unitPriceCents: number
  quantity: number
  imageSrc: string
}
