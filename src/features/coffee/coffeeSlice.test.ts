import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../app/api/ApiError'
import { httpClient } from '../../app/api/httpClient'
import { createTestStore } from '../../app/store'
import { coffeeSlice, fetchCoffees } from './coffeeSlice'

vi.mock('../../app/api/httpClient', () => ({
  httpClient: { get: vi.fn() },
}))

const getMock = vi.mocked(httpClient.get)

describe('coffeeSlice', () => {
  beforeEach(() => {
    getMock.mockReset()
  })

  it('pide los cafés por el cliente HTTP tipado', async () => {
    getMock.mockResolvedValue([{ id: 1, name: 'Geisha', region: 'Huila', price: 28.5 }])

    await createTestStore().dispatch(fetchCoffees())

    expect(getMock).toHaveBeenCalledWith('/coffee')
  })

  it('guarda los cafés recibidos', async () => {
    const coffees = [{ id: 1, name: 'Geisha', region: 'Huila', price: 28.5 }]
    getMock.mockResolvedValue(coffees)
    const store = createTestStore()

    await store.dispatch(fetchCoffees())

    expect(store.getState().coffee.items).toEqual(coffees)
  })

  it('deja el estado en carga mientras la petición está en curso', async () => {
    let resolveRequest: (value: unknown) => void = () => undefined
    getMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve
      }),
    )
    const store = createTestStore()

    const promise = store.dispatch(fetchCoffees())
    expect(store.getState().coffee.loading).toBe(true)
    expect(store.getState().coffee.error).toBeNull()

    resolveRequest([])
    await promise
    expect(store.getState().coffee.loading).toBe(false)
  })

  it('guarda el mensaje de error del backend', async () => {
    getMock.mockRejectedValue(new ApiError('Café no encontrado', 404))

    const store = createTestStore()
    await store.dispatch(fetchCoffees())

    expect(store.getState().coffee.error).toBe('Café no encontrado')
    expect(store.getState().coffee.loading).toBe(false)
  })

  it('muestra un mensaje legible cuando falla la red', async () => {
    getMock.mockRejectedValue(new ApiError('No se pudo conectar con el servidor', 0))

    const store = createTestStore()
    await store.dispatch(fetchCoffees())

    expect(store.getState().coffee.error).toBe('No se pudo conectar con el servidor')
  })

  it('limpia el error con clearError', () => {
    const store = createTestStore()
    store.dispatch(fetchCoffees())
    store.dispatch(coffeeSlice.actions.clearError())

    expect(store.getState().coffee.error).toBeNull()
  })
})
