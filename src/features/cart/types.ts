/** Lo que se guarda en el navegador: el mínimo imprescindible. */
export interface CartItem {
  variantId: string
  quantity: number
}

/** Una variante tal y como la devuelve la API. */
export interface CartVariant {
  variantId: string
  coffeeId: string
  coffeeName: string
  weightGrams: number
  price: number
  stock: number
  isActive: boolean
}

/** Una línea del carrito ya cruzada con el catálogo: lo que se pinta. */
export interface CartLine {
  item: CartItem
  variant: CartVariant
  subtotal: number
  /** `true` cuando la cantidad se redujo porque no había stock. */
  adjusted: boolean
}
