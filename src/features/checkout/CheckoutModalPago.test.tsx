import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { chooseOption } from '../../test/mui'
import { sesionRestaurada, type Sesion } from '../auth/authSlice'
import { CheckoutModal } from './CheckoutModal'
import { createTestStore } from '../../app/store'
import { httpClient } from '../../app/api/httpClient'

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

const DESGLOSE = {
  lines: [
    {
      variantId: 'v1',
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

const CONFIG = {
  publicKey: 'pub_test_una',
  baseUrl: 'https://api.pruebas.proveedor.example/v1',
  environment: 'sandbox' as const,
}

const ORDEN = {
  id: 'orden-1',
  orderNumber: 'BC-20260927-0001',
  status: 'PENDING',
  paymentStatus: 'PENDING',
  total: 109960,
  paymentReference: 'tx-1',
}

const rellenar = async () => {
  await userEvent.type(screen.getByLabelText(/n[uú]mero de tarjeta/i), '4111111111111111')
  await userEvent.type(screen.getByLabelText(/nombre en la tarjeta/i), 'Persona Compradora')
  await userEvent.type(screen.getByLabelText(/vence/i), '12/30')
  await userEvent.type(screen.getByLabelText(/cvv/i), '123')
  await userEvent.type(screen.getByLabelText(/nombre de quien recibe/i), 'Persona Compradora')
  await userEvent.type(screen.getByLabelText(/n[uú]mero de documento/i), '1098765434')
  await userEvent.type(screen.getByLabelText(/tel[eé]fono/i), '3001234567')
  await userEvent.type(screen.getByLabelText(/direcci[oó]n/i), 'Carrera 7 con Calle 72')
}

const montar = () => {
  const store = createTestStore({ auth: undefined })
  store.dispatch(sesionRestaurada(SESION))

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <CheckoutModal open onClose={jest.fn()} />
      </MemoryRouter>
    </Provider>,
  )
}

const irAlResumen = async () => {
  await chooseOption('Departamento', 'Cundinamarca')
  await chooseOption('Ciudad', 'Bogotá')
  await userEvent.click(screen.getByRole('button', { name: /ver el resumen/i }))
  await screen.findByText('Subtotal')
}

describe('CheckoutModal pagando', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    tokenizar.mockReset()
    tokenizar.mockResolvedValue({ ok: true, value: 'tok_test_123' })
    // El cliente HTTP es genérico en el tipo de respuesta, así que el doble tiene que
    // prometer `never`: es lo que hace que cada rama sea aceptable sin castear una
    // por una y perder el aviso de TypeScript.
    get.mockImplementation((ruta: string): Promise<never> => {
      if (ruta.includes('/cart/summary')) {
        return Promise.resolve(DESGLOSE) as never
      }
      if (ruta === '/cart') {
        // Tras cobrar, el modal vuelve a pedir el carrito para que se vea vacío.
        return Promise.resolve({ items: [] }) as never
      }
      if (ruta.includes('/payments/config')) {
        return Promise.resolve(CONFIG) as never
      }
      if (ruta === '/geography/departments') {
        return Promise.resolve({ items: [{ id: 'd1', name: 'Cundinamarca' }] }) as never
      }
      if (ruta.startsWith('/geography/departments/')) {
        return Promise.resolve({ items: [{ id: 'c1', name: 'Bogotá' }] }) as never
      }
      if (ruta.includes('/cart/shipping-quote')) {
        return Promise.resolve({ ...DESGLOSE, shippingData: {}, persisted: false }) as never
      }
      if (ruta.includes('/orders/')) {
        return Promise.resolve({
          id: 'orden-1',
          orderNumber: 'BC-20260927-0001',
          status: 'PAID',
          paymentStatus: 'APPROVED',
          total: 109960,
          delivery: { status: 'PENDING', carrier: null, trackingCode: null },
        }) as never
      }

      return Promise.resolve({}) as never
    })
    // Cada POST responde a lo suyo: la cotización de envío y la creación de la
    // orden son llamadas distintas, y devolver la misma cosa en las dos haría que
    // este test pasara por el motivo equivocado.
    post.mockImplementation((async (ruta: string) => {
      if (ruta === '/cart/shipping-quote') {
        return { ...DESGLOSE, shippingData: {}, persisted: false }
      }

      return ORDEN
    }) as never)
  })

  it('trae la configuracion de la pasarela antes de que se escriba la tarjeta', async () => {
    montar()

    await waitFor(() => expect(get).toHaveBeenCalledWith('/payments/config'))
  })

  it('tokeniza la tarjeta en el navegador y crea la orden con el token', async () => {
    montar()
    await waitFor(() => expect(get).toHaveBeenCalledWith('/payments/config'))
    await rellenar()
    await irAlResumen()

    await userEvent.click(screen.getByRole('button', { name: /^pagar$/i }))

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        '/orders',
        expect.objectContaining({ cardToken: 'tok_test_123' }),
      ),
    )
    expect(tokenizar).toHaveBeenCalledTimes(1)
  })

  it('el número de tarjeta no viaja en ninguna petición a nuestro backend', async () => {
    montar()
    await waitFor(() => expect(get).toHaveBeenCalledWith('/payments/config'))
    await rellenar()
    await irAlResumen()

    await userEvent.click(screen.getByRole('button', { name: /^pagar$/i }))

    await waitFor(() => expect(post).toHaveBeenCalledWith('/orders', expect.anything()))
    const llamada = post.mock.calls.find(([ruta]) => ruta === '/orders')
    const [, cuerpo] = llamada as [string, Record<string, unknown>]
    expect(JSON.stringify(cuerpo)).not.toContain('4111111111111111')
  })

  it('no crea la orden si la tarjeta no se puede tokenizar, y lo dice', async () => {
    tokenizar.mockResolvedValue({ ok: false, error: 'La tarjeta no es válida' })
    montar()
    await waitFor(() => expect(get).toHaveBeenCalledWith('/payments/config'))
    await rellenar()
    await irAlResumen()

    await userEvent.click(screen.getByRole('button', { name: /^pagar$/i }))

    expect(await screen.findByText(/la tarjeta no es válida/i)).toBeInTheDocument()
    // Lo que no debe pasar es que se cree la orden. La cotización de envío sí se
    // pidió antes, y esa no es la cuenta que importa.
    expect(post).not.toHaveBeenCalledWith('/orders', expect.anything())
  })

  it('muestra la pantalla de resultado con el número de orden y el pago aprobado', async () => {
    montar()
    await waitFor(() => expect(get).toHaveBeenCalledWith('/payments/config'))
    await rellenar()
    await irAlResumen()

    await userEvent.click(screen.getByRole('button', { name: /^pagar$/i }))

    expect(await screen.findByText(/BC-20260927-0001/)).toBeInTheDocument()
    expect(await screen.findByText(/aprobado/i)).toBeInTheDocument()
  })

  it('ofrece volver al producto, que es el último paso del proceso', async () => {
    montar()
    await waitFor(() => expect(get).toHaveBeenCalledWith('/payments/config'))
    await rellenar()
    await irAlResumen()

    await userEvent.click(screen.getByRole('button', { name: /^pagar$/i }))
    await screen.findByText(/BC-20260927-0001/)

    expect(
      screen.getByRole('button', { name: /ver el caf[eé]|volver al caf[eé]/i }),
    ).toBeInTheDocument()
  })
})
