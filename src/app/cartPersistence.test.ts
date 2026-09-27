import { jest, beforeEach, describe, expect, it } from '@jest/globals'
import { waitFor } from '@testing-library/react'
import { createStore } from './store'
import {
  addItem,
  addToCart,
  resolveCart,
  selectCartCount,
  selectCartLines,
} from '../features/cart/cartSlice'
import { signIn, signOut } from '../features/auth/authSlice'
import { httpClient } from './api/httpClient'
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
    const setItem = jest.spyOn(Storage.prototype, 'setItem')
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

  describe('con sesión abierta', () => {
    const sesion = {
      accessToken: 'token-1',
      accessTokenExpiresIn: 900,
      csrfToken: 'csrf-1',
      user: {
        id: 'user-1',
        email: 'persona@ejemplo.com',
        fullName: 'Persona Registrada',
        role: 'CUSTOMER',
        isEmailVerified: true,
      },
    }

    beforeEach(() => {
      jest
        .spyOn(httpClient, 'post')
        .mockImplementation((async (ruta: string) =>
          ruta === '/auth/login'
            ? sesion
            : { items: [], subtotal: 0, totalItems: 0, purchasableItems: 0 }) as never)
    })

    it('el carrito deja de guardarse en el navegador, porque ya es de la cuenta', async () => {
      escribir({ version: CART_SCHEMA_VERSION, items: [{ variantId: 'v1', quantity: 2 }] })
      const store = createStore()

      await store.dispatch(signIn({ email: 'persona@ejemplo.com', password: 'BrumaCafe2026!' }))

      await waitFor(() => {
        expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBeNull()
      })
    })

    it('al cambiar el carrito con sesión tampoco se escribe en el navegador', async () => {
      escribir({ version: CART_SCHEMA_VERSION, items: [{ variantId: 'v1', quantity: 2 }] })
      const store = createStore()
      await store.dispatch(signIn({ email: 'persona@ejemplo.com', password: 'BrumaCafe2026!' }))

      await store.dispatch(addToCart({ variantId: 'v1', quantity: 1, stock: 10 }))

      expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBeNull()
    })

    it('al cerrar sesión el carrito se queda con la cuenta y no vuelve al invitado', async () => {
      escribir({ version: CART_SCHEMA_VERSION, items: [{ variantId: 'v1', quantity: 2 }] })
      const store = createStore()
      await store.dispatch(signIn({ email: 'persona@ejemplo.com', password: 'BrumaCafe2026!' }))

      await store.dispatch(signOut())

      await waitFor(() => {
        expect(selectCartCount(store.getState())).toBe(0)
      })
      expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBeNull()
    })

    it('tras cerrar sesión y recargar, el carrito de la cuenta no vuelve a aparecer', async () => {
      escribir({ version: CART_SCHEMA_VERSION, items: [{ variantId: 'v1', quantity: 2 }] })
      const store = createStore()
      await store.dispatch(signIn({ email: 'persona@ejemplo.com', password: 'BrumaCafe2026!' }))
      await store.dispatch(signOut())
      await waitFor(() => {
        expect(selectCartCount(store.getState())).toBe(0)
      })

      // Esto es lo que hacia la prueba manual: al recargar, la copia del
      // navegador devolvia el carrito de la cuenta como si fuera de este
      // visitante, que no lo habia hecho.
      const despuesDeRecargar = createStore()

      expect(selectCartCount(despuesDeRecargar.getState())).toBe(0)
    })
  })
})
