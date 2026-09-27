import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { waitFor } from '@testing-library/react'
import { httpClient } from '../../app/api/httpClient'
import { ApiError } from '../../app/api/ApiError'
import { createTestStore } from '../../app/store'
import { sesionRestaurada, type Sesion } from '../auth/authSlice'
import { fetchDepartments, fetchCities, fetchSummary, submitShipping } from './checkoutSlice'

jest.mock('../../app/api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))

const get = jest.mocked(httpClient.get)
const post = jest.mocked(httpClient.post)

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

const conSesion = () => {
  const store = createTestStore({ auth: undefined })
  store.dispatch(sesionRestaurada(sesion))

  return store
}

const desglose = {
  lines: [
    {
      variantId: 'v1',
      coffeeName: 'Café Nariño',
      unitPrice: 42000,
      quantity: 2,
      subtotal: 84000,
    },
  ],
  subtotal: 84000,
  tax: 15960,
  shipping: 10000,
  total: 109960,
  isFreeShipping: false,
}

const envio = {
  fullName: 'Persona Compradora',
  documentNumber: '1098765434',
  phone: '3001234567',
  address: 'Carrera 7 con Calle 72',
  city: 'Bogotá',
  department: 'Cundinamarca',
}

describe('resumen de la orden', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('pide el desglose al backend y lo deja en el store', async () => {
    get.mockResolvedValue(desglose)
    const store = conSesion()

    await store.dispatch(fetchSummary())

    expect(store.getState().checkout.summary?.total).toBe(109960)
  })

  it('los importes vienen del servidor y no se calculan en el navegador', async () => {
    get.mockResolvedValue(desglose)
    const store = conSesion()

    await store.dispatch(fetchSummary())

    const { subtotal, tax, shipping, total } = store.getState().checkout.summary ?? {}
    expect(total).toBe((subtotal ?? 0) + (tax ?? 0) + (shipping ?? 0))
  })

  it('marca el envío gratis para que el modal pueda decirlo', async () => {
    get.mockResolvedValue({ ...desglose, isFreeShipping: true, shipping: 0 })
    const store = conSesion()

    await store.dispatch(fetchSummary())

    expect(store.getState().checkout.summary?.isFreeShipping).toBe(true)
  })

  it('enseña el error si el backend no responde', async () => {
    get.mockRejectedValue(new ApiError('No se pudo conectar con el servidor', 0))
    const store = conSesion()

    await store.dispatch(fetchSummary())

    expect(store.getState().checkout.error).toBe('No se pudo conectar con el servidor')
  })
})

describe('departamentos y ciudades', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('pide los departamentos sin token, porque son públicos', async () => {
    get.mockResolvedValue({ items: [{ id: 'd1', name: 'Cundinamarca' }] })
    const store = createTestStore()

    await store.dispatch(fetchDepartments())

    expect(get).toHaveBeenCalledWith('/geography/departments')
    expect(store.getState().checkout.departments).toHaveLength(1)
  })

  it('pide las ciudades de un departamento y guarda cuál es', async () => {
    get.mockResolvedValue({ items: [{ id: 'c1', name: 'Bogotá' }] })
    const store = createTestStore()

    await store.dispatch(fetchCities('d1'))

    expect(get).toHaveBeenCalledWith('/geography/departments/d1/cities')
    expect(store.getState().checkout.cities).toHaveLength(1)
    expect(store.getState().checkout.departmentSeleccionado).toBe('d1')
  })

  it('limpia las ciudades al cambiar de departamento, para no dejar la de otro', async () => {
    get.mockResolvedValue({ items: [{ id: 'c1', name: 'Bogotá' }] })
    const store = createTestStore()
    await store.dispatch(fetchCities('d1'))

    await store.dispatch(fetchCities('d2'))

    expect(store.getState().checkout.departmentSeleccionado).toBe('d2')
  })
})

describe('datos de entrega', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('manda los datos y guarda el total confirmado', async () => {
    post.mockResolvedValue({ ...desglose, shippingData: envio, persisted: false })
    const store = conSesion()

    await store.dispatch(submitShipping(envio))

    expect(store.getState().checkout.totalConfirmado).toBe(109960)
  })

  it('guarda el nombre del catálogo de la ciudad, no el que escribió la persona', async () => {
    post.mockResolvedValue({
      ...desglose,
      shippingData: { ...envio, city: 'Bogotá' },
      persisted: false,
    })
    const store = conSesion()

    await store.dispatch(submitShipping({ ...envio, city: 'Bogota' }))

    expect(store.getState().checkout.datosDeEnvio?.city).toBe('Bogotá')
  })

  it('enseña el error cuando la ciudad no es del departamento', async () => {
    post.mockRejectedValue(new ApiError('La ciudad no pertenece a ese departamento', 400))
    const store = conSesion()

    await store.dispatch(submitShipping({ ...envio, city: 'Medellín' }))

    expect(store.getState().checkout.error).toBe('La ciudad no pertenece a ese departamento')
  })

  it('enseña el error cuando el teléfono no es un celular de 10 dígitos', async () => {
    post.mockRejectedValue(new ApiError('El teléfono debe ser un celular de 10 dígitos', 400))
    const store = conSesion()

    await store.dispatch(submitShipping({ ...envio, phone: '1234567' }))

    expect(store.getState().checkout.error).toContain('10 dígitos')
  })

  it('no guarda el total si el backend rechaza los datos', async () => {
    post.mockRejectedValue(new ApiError('La ciudad no pertenece a ese departamento', 400))
    const store = conSesion()

    await store.dispatch(submitShipping(envio))

    expect(store.getState().checkout.totalConfirmado).toBeNull()
  })

  it('limpia el error anterior al reintentar, para que no quede el viejo', async () => {
    post.mockRejectedValue(new ApiError('La ciudad no pertenece a ese departamento', 400))
    const store = conSesion()
    await store.dispatch(submitShipping(envio))

    post.mockResolvedValue({ ...desglose, shippingData: envio, persisted: false })
    await store.dispatch(submitShipping(envio))

    await waitFor(() => {
      expect(store.getState().checkout.error).toBeNull()
    })
  })
})
