import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { waitFor } from '@testing-library/react'
import { httpClient } from '../../app/api/httpClient'
import { createTestStore } from '../../app/store'
import { restoreSession, sesionRestaurada, signIn, type Sesion } from '../auth/authSlice'
import {
  addToCart,
  hydrateCart,
  changeQuantity,
  removeFromCart,
  resolveCart,
  syncLocalCartOnSignIn,
} from './cartSlice'

jest.mock('../../app/api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))

const get = jest.mocked(httpClient.get)
const post = jest.mocked(httpClient.post)
const patch = jest.mocked(httpClient.patch)
const del = jest.mocked(httpClient.delete)

const sesion: Sesion = {
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

const carritoDelServidor = (items: { variantId: string; quantity: number; price: number }[]) => ({
  items: items.map((item) => ({
    variantId: item.variantId,
    coffeeId: 'coffee-1',
    coffeeName: 'Café Nariño',
    weightGrams: 250,
    price: item.price,
    stock: 10,
    quantity: item.quantity,
    subtotal: item.price * item.quantity,
    isPurchasable: true,
  })),
  subtotal: items.reduce((total, item) => total + item.price * item.quantity, 0),
  totalItems: items.length,
  purchasableItems: items.length,
})

const conSesion = () => {
  const store = createTestStore({ auth: undefined })
  store.dispatch(sesionRestaurada(sesion))

  return store
}

describe('carrito con sesión', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    patch.mockReset()
    del.mockReset()
  })

  it('lee el carrito del servidor, no el del navegador', async () => {
    get.mockResolvedValue(carritoDelServidor([{ variantId: 'v1', quantity: 2, price: 1000 }]))
    const store = conSesion()

    await store.dispatch(resolveCart())

    expect(get).toHaveBeenCalledWith('/cart', { token: 'token-1' })
    expect(store.getState().cart.items).toEqual([{ variantId: 'v1', quantity: 2 }])
  })

  it('pinta las líneas con el precio que da el servidor, sin preguntar al catálogo', async () => {
    get.mockResolvedValue(carritoDelServidor([{ variantId: 'v1', quantity: 2, price: 1000 }]))
    const store = conSesion()

    await store.dispatch(resolveCart())

    expect(store.getState().cart.lines[0]?.variant.coffeeName).toBe('Café Nariño')
    expect(store.getState().cart.lines[0]?.subtotal).toBe(2000)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('envía el token al pedir el carrito del servidor', async () => {
    get.mockResolvedValue(carritoDelServidor([]))
    const store = conSesion()

    await store.dispatch(resolveCart())

    expect(get).toHaveBeenCalledWith('/cart', { token: 'token-1' })
  })

  it('al agregar manda al servidor en vez de guardarlo en el navegador', async () => {
    post.mockResolvedValue(carritoDelServidor([{ variantId: 'v1', quantity: 2, price: 1000 }]))
    const store = conSesion()

    await store.dispatch(addToCart({ variantId: 'v1', quantity: 2, stock: 10 }))

    expect(post).toHaveBeenCalledWith(
      '/cart/items',
      { variantId: 'v1', quantity: 2 },
      {
        token: 'token-1',
      },
    )
    expect(store.getState().cart.items).toEqual([{ variantId: 'v1', quantity: 2 }])
  })

  it('al cambiar la cantidad usa PATCH con el identificador de la variante en la ruta', async () => {
    patch.mockResolvedValue(carritoDelServidor([{ variantId: 'v1', quantity: 3, price: 1000 }]))
    const store = conSesion()

    await store.dispatch(changeQuantity({ variantId: 'v1', quantity: 3, stock: 10 }))

    expect(patch).toHaveBeenCalledWith('/cart/items/v1', { quantity: 3 }, { token: 'token-1' })
  })

  it('al quitar una línea usa DELETE y no manda csrf, porque va con el token', async () => {
    del.mockResolvedValue(carritoDelServidor([]))
    const store = conSesion()

    await store.dispatch(removeFromCart('v1'))

    expect(del).toHaveBeenCalledWith('/cart/items/v1', { token: 'token-1' })
  })

  it('sin sesión sigue trabajando contra el navegador, sin llamar al servidor', async () => {
    const store = createTestStore()

    await store.dispatch(addToCart({ variantId: 'v1', quantity: 2, stock: 10 }))

    expect(post).not.toHaveBeenCalled()
    expect(store.getState().cart.items).toEqual([{ variantId: 'v1', quantity: 2 }])
  })

  it('sube el carrito del navegador al entrar, y a partir de ahí manda el servidor', async () => {
    post.mockResolvedValue(carritoDelServidor([{ variantId: 'v1', quantity: 2, price: 1000 }]))
    const store = createTestStore()

    await store.dispatch(addToCart({ variantId: 'v1', quantity: 2, stock: 10 }))
    store.dispatch(sesionRestaurada(sesion))
    post.mockClear()

    await store.dispatch(syncLocalCartOnSignIn())

    expect(post).toHaveBeenCalledWith(
      '/cart/merge',
      { items: [{ variantId: 'v1', quantity: 2 }] },
      { token: 'token-1', csrf: true },
    )
    expect(store.getState().cart.items).toEqual([{ variantId: 'v1', quantity: 2 }])
  })

  it('el merge con CSRF es la única razón de mandar esa cabecera', async () => {
    post.mockResolvedValue(carritoDelServidor([]))
    const store = conSesion()

    await store.dispatch(syncLocalCartOnSignIn())

    expect(post).toHaveBeenCalledWith('/cart/merge', { items: [] }, expect.anything())
  })

  it('el merge ocurre solo al pasar a haber sesión, sin que nadie lo pida', async () => {
    // Un solo mock no sirve: /auth/login devuelve una sesión y /cart/merge un
    // carrito. Si ambos devolvieran lo mismo, el login nowouldaría una sesión
    // válida y no habría nada que sincronizar.
    post.mockImplementation((async (ruta: string) =>
      ruta === '/auth/login'
        ? sesion
        : carritoDelServidor([{ variantId: 'v1', quantity: 1, price: 1000 }])) as never)
    const store = createTestStore()

    await store.dispatch(signIn({ email: 'persona@ejemplo.com', password: 'BrumaCafe2026!' }))
    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        '/cart/merge',
        { items: [] },
        { token: 'token-1', csrf: true },
      )
    })
  })

  it('recuperar la sesión al recargar también sube el carrito, porque el local sigue ahí', async () => {
    post.mockImplementation((async (ruta: string) =>
      ruta === '/auth/refresh'
        ? sesion
        : carritoDelServidor([{ variantId: 'v1', quantity: 2, price: 1000 }])) as never)
    const store = createTestStore()
    store.dispatch(hydrateCart([{ variantId: 'v1', quantity: 2 }]))
    post.mockClear()

    await store.dispatch(restoreSession())

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        '/cart/merge',
        { items: [{ variantId: 'v1', quantity: 2 }] },
        { token: 'token-1', csrf: true },
      )
    })
  })
})
