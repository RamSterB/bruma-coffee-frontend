import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CheckoutModal } from './CheckoutModal'
import { createTestStore } from '../../app/store'
import { httpClient } from '../../app/api/httpClient'
import { sesionRestaurada, type Sesion } from '../auth/authSlice'
import { chooseOption } from '../../test/mui'
import { CART_STORAGE_KEY, saveCart } from '../cart/cartStorage'

jest.mock('../../app/api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))

jest.mock('../../lib/cardTokenization', () => ({
  tokenizeCard: jest.fn(),
}))

import { tokenizeCard } from '../../lib/cardTokenization'

const get = jest.mocked(httpClient.get)
const post = jest.mocked(httpClient.post)
const tokenizar = jest.mocked(tokenizeCard)

const VARIANTE = 'v1-caturra-250'

const DESGLOSE = {
  lines: [
    {
      variantId: VARIANTE,
      coffeeName: 'Caturra',
      unitPrice: 42000,
      quantity: 2,
      subtotal: 84000,
      weightGrams: 250,
    },
  ],
  subtotal: 84000,
  tax: 15960,
  shipping: 10000,
  total: 109960,
  isFreeShipping: false,
}

const SESION: Sesion = {
  accessToken: 'token-1',
  accessTokenExpiresIn: 900,
  csrfToken: 'csrf-1',
  user: {
    id: 'user-1',
    email: 'comprador@ejemplo.co',
    fullName: 'Persona Compradora',
    role: 'CUSTOMER',
    isEmailVerified: true,
  },
}

const ORDEN = {
  id: 'orden-1',
  orderNumber: 'BC-20260927-0001',
  status: 'PENDING',
  paymentStatus: 'PENDING',
  total: 109960,
  paymentReference: 'tx-1',
  items: [
    {
      variantId: VARIANTE,
      coffeeName: 'Caturra',
      weightGrams: 250,
      unitPrice: 42000,
      quantity: 2,
      lineTotal: 84000,
    },
  ],
}

const ESTADO_APROBADO = {
  id: 'orden-1',
  orderNumber: 'BC-20260927-0001',
  status: 'PAID',
  paymentStatus: 'APPROVED',
  total: 109960,
  delivery: { status: 'PENDING', carrier: null, trackingCode: null },
}

const CONFIG = {
  publicKey: 'pub_test_una',
  baseUrl: 'https://api.pruebas.proveedor.example/v1',
  environment: 'sandbox' as const,
}

/**
 * Los dos pasos que faltaban del proceso: **vaciar el carrito** al cobrar y **llevar
 * al producto** con el stock ya descontado. Los dos se comprueban en el mismo camino
 * que paga, porque por separado pasarían sin que nadie notara que no hacen nada.
 */
describe('CheckoutModal al terminar la compra', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    tokenizar.mockReset()
    tokenizar.mockResolvedValue({ ok: true, value: 'tok_test_123' })
    window.localStorage.clear()

    get.mockImplementation((ruta: string) => {
      if (ruta === '/payments/config') {
        return Promise.resolve(CONFIG) as never
      }
      if (ruta === '/geography/departments') {
        return Promise.resolve({ items: [{ id: 'd1', name: 'Cundinamarca' }] }) as never
      }
      if (ruta.startsWith('/geography/departments/')) {
        return Promise.resolve({ items: [{ id: 'c1', name: 'Bogotá' }] }) as never
      }
      if (ruta === '/cart/summary') {
        return Promise.resolve(DESGLOSE) as never
      }
      if (ruta === '/cart') {
        return Promise.resolve({ items: [] }) as never
      }
      if (ruta.startsWith('/orders/')) {
        return Promise.resolve(ESTADO_APROBADO) as never
      }

      return Promise.resolve({}) as never
    })
    post.mockImplementation((async (ruta: string) => {
      if (ruta === '/cart/shipping-quote') {
        return { ...DESGLOSE, shippingData: {}, persisted: false }
      }

      return ORDEN
    }) as never)
  })

  const montar = () => {
    const store = createTestStore({ auth: undefined })
    store.dispatch(sesionRestaurada(SESION))

    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/checkout']}>
          <Routes>
            <Route path="/checkout" element={<CheckoutModal open onClose={jest.fn()} />} />
            <Route path="/cafe/:id" element={<div data-testid="pantalla-de-cafe">Ficha</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    )
  }

  const pagar = async () => {
    await waitFor(() => expect(get).toHaveBeenCalledWith('/payments/config'))
    await userEvent.type(screen.getByLabelText(/n[uú]mero de tarjeta/i), '4111111111111111')
    await userEvent.type(screen.getByLabelText(/nombre en la tarjeta/i), 'PERSONA COMPRADORA')
    await userEvent.type(screen.getByLabelText(/vence/i), '12/30')
    await userEvent.type(screen.getByLabelText(/cvv/i), '123')
    await userEvent.type(screen.getByLabelText(/nombre de quien recibe/i), 'Persona Compradora')
    await userEvent.type(screen.getByLabelText(/n[uú]mero de documento/i), '1098765434')
    await userEvent.type(screen.getByLabelText(/tel[eé]fono/i), '3001234567')
    await userEvent.type(screen.getByLabelText(/direcci[oó]n/i), 'Carrera 7 con Calle 72')
    await chooseOption('Departamento', 'Cundinamarca')
    await chooseOption('Ciudad', 'Bogotá')
    await userEvent.click(screen.getByRole('button', { name: /ver el resumen/i }))
    await screen.findByText('Subtotal')
    await userEvent.click(screen.getByRole('button', { name: /^pagar$/i }))
    await screen.findByText(/BC-20260927-0001/)
  }

  it('el carrito guardado en el navegador desaparece al cobrar', async () => {
    // Con algo en el carrito guardado, como cuando alguien entra con el cajón de una
    // visita anterior. Si eso sobrevive a un pago, el cliente vuelve a abrir la tienda
    // con los mismos cafes y no sabe si se le cobran otra vez.
    saveCart([{ variantId: VARIANTE, quantity: 2 }])
    montar()

    await pagar()

    // `clearSavedCart` borra la clave entera, así que lo normal es que no haya nada
    // que leer. El `?? ''` convierte ese "no hay nada" en algo que se puede comparar.
    await waitFor(() =>
      expect(window.localStorage.getItem(CART_STORAGE_KEY) ?? '').not.toContain(VARIANTE),
    )
  })

  it('"Ver el café" lleva a la ficha del producto, que es el último paso del proceso', async () => {
    montar()
    await pagar()

    await userEvent.click(screen.getByRole('button', { name: /ver el caf[eé]/i }))

    // Antes este botón solo cerraba el modal: el paso 5 del proceso, que es volver al
    // producto con el stock ya descontado, no existía. Un botón que dice "Ver el café"
    // y no lleva al café es peor que no tenerlo.
    // Antes este botón solo cerraba el modal: el paso 5 del proceso, que es volver
    // al producto con el stock descontado, no existía. Un botón que dice "Ver el café"
    // y no lleva al café es peor que no tenerlo.
    expect(await screen.findByTestId('pantalla-de-cafe')).toBeInTheDocument()
    expect(screen.queryByLabelText(/n[uú]mero de tarjeta/i)).toBeNull()
  })
})
