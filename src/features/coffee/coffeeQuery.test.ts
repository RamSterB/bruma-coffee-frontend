import { describe, expect, it } from 'vitest'
import { buildCoffeeQuery } from './coffeeQuery'

describe('buildCoffeeQuery', () => {
  it('devuelve solo la paginación cuando no hay filtros', () => {
    expect(buildCoffeeQuery({ page: 1, limit: 12 })).toBe('?page=1&limit=12')
  })

  it('incluye la región cuando está definida', () => {
    expect(buildCoffeeQuery({ region: 'nariño', page: 1, limit: 12 })).toBe(
      '?region=nari%C3%B1o&page=1&limit=12',
    )
  })

  it('incluye proceso, tueste y búsqueda a la vez', () => {
    expect(
      buildCoffeeQuery({ process: 'natural', roastLevel: 'light', search: 'geisha', page: 2, limit: 6 }),
    ).toBe('?process=natural&roastLevel=light&search=geisha&page=2&limit=6')
  })

  it('codifica la búsqueda para que no rompa la URL', () => {
    expect(buildCoffeeQuery({ search: 'café & del este', page: 1, limit: 12 })).toBe(
      '?search=caf%C3%A9+%26+del+este&page=1&limit=12',
    )
  })

  it('omite los filtros vacíos en lugar de mandarlos como cadena vacía', () => {
    expect(buildCoffeeQuery({ region: undefined, process: undefined, search: '  ', page: 1, limit: 12 })).toBe(
      '?page=1&limit=12',
    )
  })
})
