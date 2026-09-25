import { describe, expect, it } from 'vitest'
import { ApiError } from './ApiError'

describe('ApiError', () => {
  it('se identifica como error de red cuando el status es 0', () => {
    expect(new ApiError('sin conexión', 0).isNetworkError).toBe(true)
  })

  it('no es error de red cuando hay status HTTP', () => {
    expect(new ApiError('no encontrado', 404).isNetworkError).toBe(false)
  })

  it('se identifica como no autorizado con status 401', () => {
    expect(new ApiError('token inválido', 401).isUnauthorized).toBe(true)
  })

  it('no es no autorizado con otro status', () => {
    expect(new ApiError('prohibido', 403).isUnauthorized).toBe(false)
  })

  it('expone el status y el nombre', () => {
    const error = new ApiError('falló', 500)

    expect(error.status).toBe(500)
    expect(error.name).toBe('ApiError')
    expect(error).toBeInstanceOf(Error)
  })
})
