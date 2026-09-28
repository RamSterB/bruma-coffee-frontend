import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { payOrder, fetchOrderStatus, fetchGatewayConfig, paymentReset } from './paymentSlice'
import { tokenizeCard } from '../../lib/cardTokenization'

// El cliente HTTP se mockea el módulo entero, como en el resto de la suite: así el
// test no depende de cookies, de CSRF ni de nada que no sea el pago.
jest.mock('../../app/api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))
import type { ShippingData } from '../checkout/checkoutSlice'
import type { CardFormValues } from '../checkout/CardForm'
import type { GatewayConfig } from './paymentSlice'
import { httpClient } from '../../app/api/httpClient'
import { ApiError } from '../../app/api/ApiError'
import { configureStore } from '@reduxjs/toolkit'
import { paymentReducer } from './paymentSlice'

// El prefijo `mock` no es cosmetico: Jest solo permite referenciar variables que
// lo llevan dentro de la fábrica de un mock, por la inicialización ordering.
type ResultadoToken = { ok: true; value: string } | { ok: false; error: string }
type ArgsTokenizacion = [Parameters<typeof tokenizeCard>[0], Parameters<typeof tokenizeCard>[1]]

const mockTokenize = jest.fn<(...args: ArgsTokenizacion) => Promise<ResultadoToken>>()

// `jest.mocked` y no reasignar: el módulo se importa una vez y hay que conservar la
// forma que espera TypeScript, que si no el test deja de comprobar nada.
const post = jest.mocked(httpClient.post)
const get = jest.mocked(httpClient.get)
jest.mock('../../lib/cardTokenization', () => ({
  tokenizeCard: (...args: ArgsTokenizacion) => mockTokenize(...args),
}))

const ENV: {
  shipping: ShippingData
  email: string
  gateway: GatewayConfig
  card: CardFormValues
} = {
  shipping: {
    fullName: 'Persona Compradora',
    documentNumber: '1098765434',
    phone: '3001234567',
    address: 'Carrera 7 con Calle 72',
    city: 'Bogotá',
    department: 'Cundinamarca',
  },
  email: 'comprador@ejemplo.co',
  gateway: {
    publicKey: 'pub_test_una',
    baseUrl: 'https://sandbox.wompi.co/v1',
    environment: 'sandbox',
  },
  card: {
    number: '4111111111111111',
    holder: 'PERSONA COMPRADORA',
    expiry: '12/30',
    cvv: '123',
  },
}

const montar = () =>
  configureStore({ reducer: { payment: paymentReducer } }) as never as {
    dispatch: (accion: unknown) => unknown
    getState: () => { payment: ReturnType<typeof paymentReducer> }
  }

describe('paymentSlice', () => {
  beforeEach(() => {
    mockTokenize.mockReset()
    mockTokenize.mockResolvedValue({ ok: true, value: 'tok_test_123' })
    post.mockReset()
    get.mockReset()
  })

  it('tokeniza en el navegador y luego crea la orden con el token', async () => {
    const orden = {
      id: 'o1',
      orderNumber: 'BC-1',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      total: 1,
      paymentReference: 'tx-1',
    }
    post.mockResolvedValue(orden)
    const store = montar()

    await store.dispatch(payOrder(ENV))

    expect(mockTokenize).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith(
      '/orders',
      expect.objectContaining({ cardToken: 'tok_test_123' }),
    )
    expect(store.getState().payment.order).toEqual(orden)
  })

  it('no crea la orden si la tarjeta no se puede tokenizar', async () => {
    mockTokenize.mockResolvedValue({ ok: false, error: 'La tarjeta no es válida' })
    const store = montar()

    await store.dispatch(payOrder(ENV))

    // Es lo importante: una tarjeta mal escrita no deja un pedido pendiente ni un
    // intento de cobro que alguien tenga que cancelar después.
    expect(post).not.toHaveBeenCalled()
    expect(store.getState().payment.error).toBe('La tarjeta no es válida')
    expect(store.getState().payment.status).toBe('error')
  })

  it('el número de tarjeta nunca viaja en la petición a nuestro backend', async () => {
    post.mockResolvedValue({ id: 'o1' })
    const store = montar()

    await store.dispatch(payOrder(ENV))

    const [, cuerpo] = post.mock.calls[0] as [string, Record<string, unknown>]
    expect(JSON.stringify(cuerpo)).not.toContain('4111111111111111')
  })

  it('pasa a esperando la resolución cuando la orden se crea', async () => {
    post.mockResolvedValue({ id: 'o1' })
    const store = montar()

    await store.dispatch(payOrder(ENV))

    expect(store.getState().payment.status).toBe('waiting')
  })

  it('deja el estado final cuando la consulta responde APPROVED', async () => {
    const final = {
      id: 'o1',
      orderNumber: 'BC-1',
      status: 'PAID',
      paymentStatus: 'APPROVED',
      total: 1,
      delivery: { status: 'PENDING', carrier: null, trackingCode: null },
    }
    get.mockResolvedValue(final)
    const store = montar()

    await store.dispatch(fetchOrderStatus('o1'))

    expect(store.getState().payment.finalStatus).toEqual(final)
    expect(store.getState().payment.status).toBe('done')
  })

  it('muestra el mensaje del backend si la consulta falla', async () => {
    get.mockRejectedValue(new ApiError('No existe la orden', 404))
    const store = montar()

    await store.dispatch(fetchOrderStatus('o1'))

    expect(store.getState().payment.error).toBe('No existe la orden')
  })

  it('volver a empezar limpia el estado, para que la segunda compra no vea el primero', async () => {
    post.mockResolvedValue({ id: 'o1' })
    const store = montar()
    await store.dispatch(payOrder(ENV))

    store.dispatch(paymentReset())

    expect(store.getState().payment).toEqual({
      status: 'idle',
      order: null,
      finalStatus: null,
      gateway: null,
      purchasedVariantId: null,
      error: null,
    })
  })

  it('trae la configuración pública de la pasarela del backend, no del bundle', async () => {
    const config = {
      publicKey: 'pub_test_una',
      baseUrl: 'https://sandbox.wompi.co/v1',
      environment: 'sandbox' as const,
    }
    get.mockResolvedValue(config)
    const store = montar()

    await store.dispatch(fetchGatewayConfig())

    expect(get).toHaveBeenCalledWith('/payments/config')
    expect(store.getState().payment.gateway).toEqual(config)
  })

  it('avisa si la configuración de pago no se puede cargar', async () => {
    get.mockRejectedValue(new Error('sin red'))
    const store = montar()

    await store.dispatch(fetchGatewayConfig())

    expect(store.getState().payment.gateway).toBeNull()
  })

  it('usa la llave pública que dice el backend para tokenizar', async () => {
    post.mockResolvedValue({ id: 'o1' })
    const store = montar()

    await store.dispatch(
      payOrder({ ...ENV, gateway: { ...ENV.gateway, publicKey: 'pub_test_otra' } }),
    )

    // Solo dos argumentos: el `fetch` es el valor por defecto de la función, no algo
    // que el thunk le pase.
    expect(mockTokenize).toHaveBeenCalledWith(
      expect.objectContaining({ number: '4111111111111111' }),
      expect.objectContaining({ publicKey: 'pub_test_otra' }),
    )
  })

  it('parte el vencimiento en mes y año, que es lo que espera la pasarela', async () => {
    post.mockResolvedValue({ id: 'o1' })
    const store = montar()

    await store.dispatch(payOrder(ENV))

    expect(mockTokenize).toHaveBeenCalledWith(
      expect.objectContaining({
        expMonth: '12',
        // El año va con dos dígitos: la pasarela rechaza 2030.
        expYear: '30',
        cvc: '123',
        holderName: 'PERSONA COMPRADORA',
      }),
      expect.anything(),
    )
  })
})
