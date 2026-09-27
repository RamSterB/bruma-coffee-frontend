import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { httpClient } from '../../app/api/httpClient'
import { ApiError } from '../../app/api/ApiError'
import { createTestStore } from '../../app/store'
import { signIn, signUp } from './authSlice'

jest.mock('../../app/api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))

const post = jest.mocked(httpClient.post)

const sesion = {
  accessToken: 'token-1',
  accessTokenExpiresIn: 900,
  csrfToken: 'csrf-1',
  user: {
    id: 'user-1',
    email: 'persona@ejemplo.com',
    fullName: 'Persona Registrada',
    role: 'CUSTOMER',
    isEmailVerified: false,
  },
}

describe('inicio de sesión', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('guarda el token en memoria y marca la sesión como iniciada', async () => {
    post.mockResolvedValue(sesion)
    const store = createTestStore()

    await store.dispatch(signIn({ email: 'persona@ejemplo.com', password: 'BrumaCafe2026!' }))

    expect(store.getState().auth.accessToken).toBe('token-1')
    expect(store.getState().auth.status).toBe('autenticada')
    expect(store.getState().auth.user?.email).toBe('persona@ejemplo.com')
  })

  it('envía las credenciales a /auth/login sin mandar ninguna cabecera CSRF', async () => {
    post.mockResolvedValue(sesion)
    const store = createTestStore()

    await store.dispatch(signIn({ email: 'persona@ejemplo.com', password: 'BrumaCafe2026!' }))

    expect(post).toHaveBeenCalledWith('/auth/login', {
      email: 'persona@ejemplo.com',
      password: 'BrumaCafe2026!',
    })
  })

  it('enseña el mensaje del backend cuando las credenciales no cuadran', async () => {
    post.mockRejectedValue(new ApiError('Las credenciales no coinciden con ninguna cuenta', 401))
    const store = createTestStore()

    await store.dispatch(signIn({ email: 'persona@ejemplo.com', password: 'mala' }))

    expect(store.getState().auth.error).toBe('Las credenciales no coinciden con ninguna cuenta')
    expect(store.getState().auth.accessToken).toBeNull()
    expect(store.getState().auth.status).toBe('anonima')
  })

  it('no deja sesión a medias si el login falla', async () => {
    post.mockResolvedValue(sesion)
    const store = createTestStore()
    await store.dispatch(signIn({ email: 'a@b.com', password: 'x' }))

    post.mockRejectedValue(new ApiError('Las credenciales no coinciden con ninguna cuenta', 401))
    await store.dispatch(signIn({ email: 'a@b.com', password: 'y' }))

    expect(store.getState().auth.accessToken).toBeNull()
    expect(store.getState().auth.user).toBeNull()
  })
})

describe('registro', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('registra y deja la app en modo invitado, porque el registro no da sesión', async () => {
    post.mockResolvedValue({ message: 'Si ese correo puede registrarse, recibiras un mensaje' })
    const store = createTestStore()

    await store.dispatch(
      signUp({ email: 'nueva@ejemplo.com', password: 'BrumaCafe2026!', fullName: 'Persona Nueva' }),
    )

    expect(store.getState().auth.accessToken).toBeNull()
    expect(store.getState().auth.status).toBe('anonima')
  })

  it('enseña el mensaje del backend cuando la contraseña es corta', async () => {
    post.mockRejectedValue(new ApiError('La contraseña necesita al menos 8 caracteres', 400))
    const store = createTestStore()

    await store.dispatch(
      signUp({ email: 'nueva@ejemplo.com', password: 'corta', fullName: 'Persona Registrada' }),
    )

    expect(store.getState().auth.error).toBe('La contraseña necesita al menos 8 caracteres')
  })

  it('limpia el error anterior cuando se intenta otra vez', async () => {
    post.mockRejectedValue(new ApiError('La contraseña necesita al menos 8 caracteres', 400))
    const store = createTestStore()
    await store.dispatch(
      signUp({ email: 'nueva@ejemplo.com', password: 'corta', fullName: 'Persona Nueva' }),
    )

    post.mockResolvedValue({ message: 'Si ese correo puede registrarse, recibiras un mensaje' })
    await store.dispatch(
      signUp({ email: 'nueva@ejemplo.com', password: 'BrumaCafe2026!', fullName: 'Persona Nueva' }),
    )

    expect(store.getState().auth.error).toBeNull()
  })
})
