import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../app/api/ApiError'
import { httpClient } from '../../app/api/httpClient'
import { createTestStore } from '../../app/store'
import { clearError, fetchCoffees, setFilters, setPage } from './coffeeSlice'
import type { PaginatedCoffees } from './types'

vi.mock('../../app/api/httpClient', () => ({
  httpClient: { get: vi.fn() },
}))

const getMock = vi.mocked(httpClient.get)

const buildPage = (overrides: Partial<PaginatedCoffees> = {}): PaginatedCoffees => ({
  items: [
    {
      id: 'cafe-1',
      name: 'Geisha del Huila',
      description: 'Lote de altura',
      roastLevel: 'light',
      process: 'washed',
      region: 'huila',
      tastingNotes: ['jasmín'],
      priceFrom: 48000,
      variants: [
        { id: 'v-1', weightGrams: 250, price: 48000, stock: 24, isActive: true },
      ],
      createdAt: '2026-09-25T00:00:00.000Z',
      updatedAt: '2026-09-25T00:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 12,
  totalPages: 1,
  ...overrides,
})

describe('coffeeSlice', () => {
  beforeEach(() => {
    getMock.mockReset()
  })

  it('pide la primera página sin filtros por defecto', async () => {
    getMock.mockResolvedValue(buildPage())

    await createTestStore().dispatch(fetchCoffees())

    expect(getMock).toHaveBeenCalledWith('/coffee?page=1&limit=12')
  })

  it('guarda los cafés y los metadatos de paginación', async () => {
    getMock.mockResolvedValue(buildPage({ total: 30, totalPages: 3, page: 2 }))
    const store = createTestStore()

    await store.dispatch(fetchCoffees())

    const state = store.getState().coffee
    expect(state.items).toHaveLength(1)
    expect(state.total).toBe(30)
    expect(state.totalPages).toBe(3)
    expect(state.page).toBe(2)
    expect(state.loading).toBe(false)
  })

  it('envía los filtros activos en la consulta', async () => {
    getMock.mockResolvedValue(buildPage())
    const store = createTestStore()

    store.dispatch(setFilters({ region: 'nariño', process: 'natural', search: 'geisha' }))
    await store.dispatch(fetchCoffees())

    expect(getMock).toHaveBeenCalledWith(
      '/coffee?region=nari%C3%B1o&process=natural&search=geisha&page=1&limit=12',
    )
  })

  it('vuelve a la primera página al cambiar de filtros', () => {
    const store = createTestStore()

    store.dispatch(setPage(3))
    store.dispatch(setFilters({ roastLevel: 'light' }))

    const state = store.getState().coffee
    expect(state.page).toBe(1)
    expect(state.filters).toEqual({ roastLevel: 'light' })
  })

  it('conserva la página seleccionada al paginar', async () => {
    getMock.mockResolvedValue(buildPage())
    const store = createTestStore()

    store.dispatch(setPage(2))
    await store.dispatch(fetchCoffees())

    expect(getMock).toHaveBeenCalledWith('/coffee?page=2&limit=12')
  })

  it('deja el estado en carga mientras la petición está en curso', async () => {
    let resolveRequest: (value: unknown) => void = () => undefined
    getMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve
      }),
    )
    const store = createTestStore()

    const pending = store.dispatch(fetchCoffees())
    expect(store.getState().coffee.loading).toBe(true)

    resolveRequest(buildPage())
    await pending
    expect(store.getState().coffee.loading).toBe(false)
  })

  it('guarda el mensaje de un ApiError', async () => {
    getMock.mockRejectedValue(new ApiError('Filtro inválido', 400))
    const store = createTestStore()

    await store.dispatch(fetchCoffees())

    expect(store.getState().coffee.error).toBe('Filtro inválido')
    expect(store.getState().coffee.loading).toBe(false)
  })

  it('usa un mensaje genérico ante un error desconocido', async () => {
    getMock.mockRejectedValue(new Error('boom'))
    const store = createTestStore()

    await store.dispatch(fetchCoffees())

    expect(store.getState().coffee.error).toBe('Ocurrió un error inesperado')
  })

  it('limpia el error con clearError', async () => {
    getMock.mockRejectedValue(new ApiError('Fallo previo', 500))
    const store = createTestStore()

    await store.dispatch(fetchCoffees())
    expect(store.getState().coffee.error).toBe('Fallo previo')

    store.dispatch(clearError())
    expect(store.getState().coffee.error).toBeNull()
  })
})
