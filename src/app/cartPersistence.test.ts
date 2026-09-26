import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from './store'
import { addItem, resolveCart, selectCartCount, selectCartLines } from '../features/cart/cartSlice'
import { CART_SCHEMA_VERSION, CART_STORAGE_KEY } from '../features/cart/cartStorage'

const escribir = (valor: unknown): void => {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(valor))
}

describe('carrito persistido', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('arranca con lo que había en el navegador', () => {
    escribir({ version: CART_SCHEMA_VERSION, items: [{ variantId: 'v1', quantity: 3 }] })

    const store = createStore()

    expect(selectCartCount(store.getState())).toBe(3)
  })

  it('escribe en el navegador cada vez que cambia el carrito', () => {
    const store = createStore()

    store.dispatch(addItem({ variantId: 'v1', quantity: 2, stock: 10 }))

    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? 'null')).toEqual({
      version: CART_SCHEMA_VERSION,
      items: [{ variantId: 'v1', quantity: 2 }],
    })
  })

  it('no escribe nada mientras el carrito no cambia', () => {
    escribir({ version: CART_SCHEMA_VERSION, items: [{ variantId: 'v1', quantity: 1 }] })
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const store = createStore()

    store.dispatch(resolveCart.pending('d', undefined))

    expect(setItem).not.toHaveBeenCalled()
  })

  it('descarta un carrito guardado con otra versión de esquema', () => {
    escribir({ version: CART_SCHEMA_VERSION + 99, items: [{ variantId: 'v1', quantity: 3 }] })

    expect(selectCartCount(createStore().getState())).toBe(0)
  })

  it('arranca vacío si el navegador no tiene nada guardado', () => {
    const store = createStore()

    expect(selectCartCount(store.getState())).toBe(0)
    expect(selectCartLines(store.getState())).toEqual([])
  })
})
