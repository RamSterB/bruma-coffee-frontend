import { describe, expect, it } from 'vitest'
import { cartReducer, resolveCart } from './cartSlice'
import type { CartState } from './cartSlice'
import type { CartVariant } from './types'

const estadoInicial = cartReducer(undefined, { type: 'desconocida' })

const variante = (overrides: Partial<CartVariant> = {}): CartVariant => ({
  variantId: 'v1',
  coffeeId: 'c1',
  coffeeName: 'Nariño',
  weightGrams: 250,
  price: 42000,
  stock: 10,
  isActive: true,
  ...overrides,
})

describe('cartSlice', () => {
  it('arranca con el carrito vacío', () => {
    expect(estadoInicial.items).toEqual([])
    expect(estadoInicial.lines).toEqual([])
    expect(estadoInicial.status).toBe('idle')
    expect(estadoInicial.notice).toBeNull()
  })

  it('añade una variante que no estaba', () => {
    const estado = cartReducer(estadoInicial, {
      type: 'cart/addItem',
      payload: { variantId: 'v1', quantity: 1, stock: 10 },
    })

    expect(estado.items).toEqual([{ variantId: 'v1', quantity: 1 }])
  })

  it('suma a la cantidad si la variante ya estaba', () => {
    const conUna = cartReducer(estadoInicial, {
      type: 'cart/addItem',
      payload: { variantId: 'v1', quantity: 1, stock: 10 },
    })

    const estado = cartReducer(conUna, {
      type: 'cart/addItem',
      payload: { variantId: 'v1', quantity: 2, stock: 10 },
    })

    expect(estado.items).toEqual([{ variantId: 'v1', quantity: 3 }])
  })

  it('nunca supera el stock disponible', () => {
    const estado = cartReducer(estadoInicial, {
      type: 'cart/addItem',
      payload: { variantId: 'v1', quantity: 9, stock: 4 },
    })

    expect(estado.items).toEqual([{ variantId: 'v1', quantity: 4 }])
  })

  it('no añade nada si no hay stock', () => {
    const estado = cartReducer(estadoInicial, {
      type: 'cart/addItem',
      payload: { variantId: 'v1', quantity: 1, stock: 0 },
    })

    expect(estado.items).toEqual([])
  })

  it('cambia la cantidad respetando el stock', () => {
    const conTres: CartState = { ...estadoInicial, items: [{ variantId: 'v1', quantity: 3 }] }

    const estado = cartReducer(conTres, {
      type: 'cart/updateQuantity',
      payload: { variantId: 'v1', quantity: 2, stock: 10 },
    })

    expect(estado.items).toEqual([{ variantId: 'v1', quantity: 2 }])
  })

  it('quita la línea si la cantidad llega a cero', () => {
    const conTres: CartState = { ...estadoInicial, items: [{ variantId: 'v1', quantity: 3 }] }

    const estado = cartReducer(conTres, {
      type: 'cart/updateQuantity',
      payload: { variantId: 'v1', quantity: 0, stock: 10 },
    })

    expect(estado.items).toEqual([])
  })

  it('elimina la variante indicada', () => {
    const conDos: CartState = {
      ...estadoInicial,
      items: [
        { variantId: 'v1', quantity: 1 },
        { variantId: 'v2', quantity: 2 },
      ],
    }

    const estado = cartReducer(conDos, { type: 'cart/removeItem', payload: 'v1' })

    expect(estado.items).toEqual([{ variantId: 'v2', quantity: 2 }])
  })

  it('vacía el carrito', () => {
    const conDos: CartState = {
      ...estadoInicial,
      items: [{ variantId: 'v1', quantity: 1 }],
      lines: [
        {
          item: { variantId: 'v1', quantity: 1 },
          variant: variante(),
          subtotal: 42000,
          adjusted: false,
        },
      ],
    }

    const estado = cartReducer(conDos, { type: 'cart/clearCart' })

    expect(estado.items).toEqual([])
    expect(estado.lines).toEqual([])
  })

  it('al resolver deja las líneas cruzadas con precio y stock', () => {
    const conItem: CartState = { ...estadoInicial, items: [{ variantId: 'v1', quantity: 2 }] }

    const estado = cartReducer(conItem, {
      type: resolveCart.fulfilled.type,
      payload: { variants: [variante({ price: 42000, stock: 10 })], adjustments: [], removed: [] },
    })

    expect(estado.status).toBe('ready')
    expect(estado.lines).toEqual([
      {
        item: { variantId: 'v1', quantity: 2 },
        variant: variante(),
        subtotal: 84000,
        adjusted: false,
      },
    ])
  })

  it('ajusta a la baja las cantidades que ya no tienen stock', () => {
    const conItem: CartState = { ...estadoInicial, items: [{ variantId: 'v1', quantity: 5 }] }

    const estado = cartReducer(conItem, {
      type: resolveCart.fulfilled.type,
      payload: { variants: [variante({ stock: 2 })], adjustments: ['v1'], removed: [] },
    })

    expect(estado.items).toEqual([{ variantId: 'v1', quantity: 2 }])
    expect(estado.lines[0]?.adjusted).toBe(true)
  })

  it('deja fuera la variante que se quedó sin stock', () => {
    const conItem: CartState = { ...estadoInicial, items: [{ variantId: 'v1', quantity: 3 }] }

    const estado = cartReducer(conItem, {
      type: resolveCart.fulfilled.type,
      payload: { variants: [variante({ stock: 0 })], adjustments: [], removed: ['v1'] },
    })

    expect(estado.items).toEqual([])
    expect(estado.lines).toEqual([])
    expect(estado.notice).toMatch(/ya no está disponible/i)
  })

  it('deja fuera las variantes que la API no devolvió', () => {
    const conItem: CartState = { ...estadoInicial, items: [{ variantId: 'v1', quantity: 1 }] }

    const estado = cartReducer(conItem, {
      type: resolveCart.fulfilled.type,
      payload: { variants: [], adjustments: [], removed: ['v1'] },
    })

    expect(estado.items).toEqual([])
    expect(estado.lines).toEqual([])
    expect(estado.notice).toMatch(/ya no está disponible/i)
  })

  it('avisa cuando ha tenido que ajustar cantidades', () => {
    const conItem: CartState = { ...estadoInicial, items: [{ variantId: 'v1', quantity: 5 }] }

    const estado = cartReducer(conItem, {
      type: resolveCart.fulfilled.type,
      payload: { variants: [variante({ stock: 1 })], adjustments: ['v1'], removed: [] },
    })

    expect(estado.notice).toMatch(/stock/i)
  })

  it('no deja aviso si nada se ajustó', () => {
    const conItem: CartState = { ...estadoInicial, items: [{ variantId: 'v1', quantity: 1 }] }

    const estado = cartReducer(conItem, {
      type: resolveCart.fulfilled.type,
      payload: { variants: [variante()], adjustments: [], removed: [] },
    })

    expect(estado.notice).toBeNull()
  })

  it('guarda el error si la resolución falla', () => {
    const estado = cartReducer(estadoInicial, {
      type: resolveCart.rejected.type,
      payload: 'No se pudo resolver el carrito',
    })

    expect(estado.status).toBe('error')
    expect(estado.error).toBe('No se pudo resolver el carrito')
  })
})
