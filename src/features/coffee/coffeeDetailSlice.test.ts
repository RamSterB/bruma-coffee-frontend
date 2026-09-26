import { describe, expect, it } from '@jest/globals'
import { coffeeDetailReducer, fetchCoffeeById } from './coffeeDetailSlice'
import type { CoffeeDetailState } from './coffeeDetailSlice'

const estadoInicial = coffeeDetailReducer(undefined, { type: 'desconocida' })

describe('coffeeDetailSlice', () => {
  it('arranca sin café cargado, sin cargando y sin error', () => {
    expect(estadoInicial).toEqual({
      item: null,
      loading: false,
      error: null,
      notFound: false,
    } satisfies CoffeeDetailState)
  })

  it('al pedir un café pasa a cargando y limpia el error anterior', () => {
    const conError: CoffeeDetailState = {
      item: null,
      loading: false,
      error: 'algo falló',
      notFound: false,
    }

    const estado = coffeeDetailReducer(conError, { type: fetchCoffeeById.pending.type })

    expect(estado).toEqual({
      item: null,
      loading: true,
      error: null,
      notFound: false,
    } satisfies CoffeeDetailState)
  })

  it('guarda el café cuando la petición se resuelve', () => {
    const cafe = { id: 'cafe-1', name: 'Geisha del Huila' }

    const estado = coffeeDetailReducer(estadoInicial, {
      type: fetchCoffeeById.fulfilled.type,
      payload: cafe,
    })

    expect(estado.item).toBe(cafe)
    expect(estado.loading).toBe(false)
    expect(estado.error).toBeNull()
    expect(estado.notFound).toBe(false)
  })

  it('marca notFound cuando el backend responde 404, y no lo trata como error', () => {
    const estado = coffeeDetailReducer(estadoInicial, {
      type: fetchCoffeeById.rejected.type,
      payload: { message: 'No se encontró el café solicitado', notFound: true },
    })

    expect(estado.notFound).toBe(true)
    expect(estado.error).toBeNull()
    expect(estado.loading).toBe(false)
  })

  it('deja el mensaje de error cuando el fallo no es un 404', () => {
    const estado = coffeeDetailReducer(estadoInicial, {
      type: fetchCoffeeById.rejected.type,
      payload: { message: 'No se pudo conectar con el servidor', notFound: false },
    })

    expect(estado.notFound).toBe(false)
    expect(estado.error).toBe('No se pudo conectar con el servidor')
    expect(estado.loading).toBe(false)
  })

  it('usa un mensaje propio cuando el rechazo no trae motivo', () => {
    const estado = coffeeDetailReducer(estadoInicial, {
      type: fetchCoffeeById.rejected.type,
      payload: undefined,
    })

    expect(estado.error).toBe('No se pudo cargar el café')
    expect(estado.notFound).toBe(false)
  })
})
