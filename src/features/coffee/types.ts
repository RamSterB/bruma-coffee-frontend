export interface CoffeeVariant {
  id: string
  weightGrams: number
  price: number
  stock: number
  isActive: boolean
}

export interface Coffee {
  id: string
  name: string
  description: string
  roastLevel: string
  process: string
  region: string
  tastingNotes: string[]
  priceFrom: number | null
  variants: CoffeeVariant[]
  createdAt: string
  updatedAt: string
}

export interface PaginatedCoffees {
  items: Coffee[]
  total: number
  page: number
  limit: number
  totalPages: number
}
