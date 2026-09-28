import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { httpClient } from '../../app/api/httpClient'
import { createTestStore } from '../../app/store'
import { restoreSession, sesionRestaurada, signOut, type Sesion } from './authSlice'

jest.mock('../../app/api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))

const post = jest.mocked(httpClient.post)

const sesion: Sesion = {
  accessToken: 'token-1',
  accessTokenExpiresIn: 900,
  csrfToken: 'csrf-del-servidor',
  user: {
    id: 'user-1',
    email: 'persona@ejemplo.com',
    fullName: 'Persona Registrada',
    role: 'CUSTOMER',
    isEmailVerified: true,
  },
}

describe('las peticiones que dependen de la cookie de refresh', () => {
  beforeEach(() => {
    post.mockReset()
    post.mockResolvedValue(sesion)
  })

  it('el refresco manda el token CSRF que dio el servidor, no el de una cookie ajena', async () => {
    // **El token va en el cuerpo de la respuesta del inicio de sesión, no en una cookie
    // que la tienda pueda leer.** Con la tienda y la API en dominios distintos, que es como
    // está desplegado, la cookie CSRF pertenece al dominio de la API y `document.cookie`
    // no la ve: si se depende de ella, el refresco se rechaza con un 403, la sesión no se
    // recupera y quien recargaba la página se quedaba fuera sin saber por qué.
    const store = createTestStore()
    store.dispatch(sesionRestaurada(sesion))

    await store.dispatch(restoreSession())

    expect(post).toHaveBeenCalledWith('/auth/refresh', undefined, {
      csrf: 'csrf-del-servidor',
    })
  })

  it('el cierre de sesión también lo manda', async () => {
    const store = createTestStore()
    store.dispatch(sesionRestaurada(sesion))

    await store.dispatch(signOut())

    expect(post).toHaveBeenCalledWith('/auth/logout', undefined, { csrf: 'csrf-del-servidor' })
  })
})
