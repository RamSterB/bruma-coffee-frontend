import { jest, describe, expect, it } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { CartDrawer } from './CartDrawer'
import { createTestStore } from '../../app/store'
import { httpClient } from '../../app/api/httpClient'
import { formatCop } from '../../lib/formatCurrency'
import { hydrateCart } from './cartSlice'
import type { CartItem, CartVariant } from './types'

jest.mock('../../app/api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))

const get = jest.mocked(httpClient.get)

/**
 * El formateador separa el símbolo del número con un espacio duro, y el
 * normalizador de Testing Library convierte los espacios en normales. Sin
 * igualar los dos, la comparación por texto exacto no encuentra nada.
 */
const dinero = (amount: number): string => formatCop(amount).replace(/\s/g, ' ')

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

/**
 * El carrito se siembra en el store antes de renderizar: el cajón resuelve al
 * montarse, y con el carrito vacío el thunk no llega a preguntar nada.
 */
const montar = (items: CartItem[] = []) => {
  const store = createTestStore()

  if (items.length > 0) {
    store.dispatch(hydrateCart(items))
  }

  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter>
          <CartDrawer open onClose={() => undefined} />
        </MemoryRouter>
      </Provider>,
    ),
  }
}

describe('CartDrawer', () => {
  it('invita a explorar el catálogo cuando no hay nada', () => {
    montar()

    expect(screen.getByText(/carrito está vacío/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver cafés/i })).toBeInTheDocument()
  })

  it('no pregunta nada al servidor si el carrito está vacío', () => {
    montar()

    expect(get).not.toHaveBeenCalled()
  })

  it('lista cada línea con su subtotal', async () => {
    // dos líneas con importes distintos: con una sola, el subtotal de la línea
    // y el total del carrito serían el mismo número y la comprobación no
    // distinguiría uno de otro
    get.mockResolvedValue([
      variante({ variantId: 'v1', price: 42000 }),
      variante({ variantId: 'v2', coffeeName: 'Huila', price: 55000 }),
    ])

    montar([
      { variantId: 'v1', quantity: 2 },
      { variantId: 'v2', quantity: 1 },
    ])

    expect(await screen.findByText('Nariño')).toBeInTheDocument()
    expect(screen.getByText('Huila')).toBeInTheDocument()
    expect(screen.getByText(dinero(84000))).toBeInTheDocument()
    expect(screen.getByText(dinero(55000))).toBeInTheDocument()
  })

  it('pregunta por las variantes que hay en el carrito', async () => {
    get.mockResolvedValue([variante()])

    montar([
      { variantId: 'v1', quantity: 1 },
      { variantId: 'v2', quantity: 1 },
    ])

    await screen.findByText('Nariño')

    expect(get).toHaveBeenCalledWith('/variants?variantIds=v1%2Cv2')
  })

  it('suma el subtotal de todas las líneas', async () => {
    get.mockResolvedValue([
      variante({ variantId: 'v1', price: 42000 }),
      variante({ variantId: 'v2', coffeeName: 'Huila', price: 42000 }),
    ])

    montar([
      { variantId: 'v1', quantity: 2 },
      { variantId: 'v2', quantity: 1 },
    ])

    expect(await screen.findByText(dinero(126000))).toBeInTheDocument()
  })

  it('dice que el IVA y el envío van aparte', async () => {
    get.mockResolvedValue([variante()])

    montar([{ variantId: 'v1', quantity: 1 }])

    expect(await screen.findByText(/iva y el envío/i)).toBeInTheDocument()
  })

  it('aumenta la cantidad de una línea', async () => {
    get.mockResolvedValue([variante({ stock: 10 })])
    const { store } = montar([{ variantId: 'v1', quantity: 2 }])
    await screen.findByText('Nariño')

    await userEvent.click(screen.getByRole('button', { name: 'Aumentar' }))

    expect(store.getState().cart.items).toEqual([{ variantId: 'v1', quantity: 3 }])
  })

  it('no deja subir más allá del stock', async () => {
    get.mockResolvedValue([variante({ stock: 2 })])
    const { store } = montar([{ variantId: 'v1', quantity: 2 }])
    await screen.findByText('Nariño')

    // el botón está deshabilitado, así que comprobamos el tope por disable
    expect(screen.getByRole('button', { name: 'Aumentar' })).toBeDisabled()
    expect(store.getState().cart.items).toEqual([{ variantId: 'v1', quantity: 2 }])
  })

  it('quita una línea del carrito', async () => {
    get.mockResolvedValue([variante()])
    const { store } = montar([{ variantId: 'v1', quantity: 1 }])
    await screen.findByText('Nariño')

    await userEvent.click(screen.getByRole('button', { name: 'Quitar del carrito' }))

    expect(store.getState().cart.items).toEqual([])
  })

  it('avisa cuando el servidor no deja resolver el carrito', async () => {
    get.mockRejectedValue(new Error('boom'))

    montar([{ variantId: 'v1', quantity: 1 }])

    expect(await screen.findByText(/no se pudo actualizar el carrito/i)).toBeInTheDocument()
  })

  it('avisa y ajusta cuando el stock ya no da para lo que había', async () => {
    get.mockResolvedValue([variante({ stock: 2 })])

    montar([{ variantId: 'v1', quantity: 5 }])

    expect(await screen.findByText(/ajustamos las cantidades/i)).toBeInTheDocument()
  })

  it('deja fuera la variante que el servidor no devolvió y lo dice', async () => {
    get.mockResolvedValue([])

    montar([{ variantId: 'v1', quantity: 1 }])

    expect(await screen.findByText(/ya no está disponible/i)).toBeInTheDocument()
  })
})
