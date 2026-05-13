export type ProductType = 'print' | 'original'

export interface CatalogImage {
  src: string
  alt: string
  width?: number
  height?: number
}

export interface PrintSource {
  aspectRatio: string
  src: string
  width?: number
  height?: number
}

export interface GalleryProduct {
  id: string
  slug: string
  sku: string
  title: string
  description: string
  medium: string
  type: ProductType
  active: boolean
  featuredwork?: boolean
  hidden?: boolean
  displayImage: CatalogImage
  printSources: PrintSource[]
}
