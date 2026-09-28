import { describe, expect, it } from '@jest/globals'
import {
  authReducer,
  errorDeOperacion,
  sesionCerrada,
  sesionInicial,
  sesionNoRestaurada,
  sesionRestaurada,
  sesionSolicitada,
} from './authSlice'

const sesion = {
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

describe('authSlice', () => {
  it('arranca sin sesión, que es lo mismo que decir sin token en memoria', () => {
    expect(authReducer(undefined, { type: 'desconocida' })).toEqual(sesionInicial)
  })

  it('el estado inicial no tiene token de acceso', () => {
    expect(authReducer(undefined, { type: 'desconocida' }).accessToken).toBeNull()
  })

  it('guarda el token y el usuario al restaurar sesión', () => {
    const estado = authReducer(sesionInicial, sesionRestaurada(sesion))

    expect(estado.accessToken).toBe('token-1')
    expect(estado.user?.email).toBe('persona@ejemplo.com')
    expect(estado.status).toBe('autenticada')
  })

  it('guarda el token de CSRF que da el servidor', () => {
    // Sin esto, el token se quedaba en el cuerpo de la respuesta y no se usaba nunca: las
    // peticiones que dependen de la cookie de refresh salían sin cabecera y el backend las
    // rechazaba. El estado lo declaraba, y por eso el fallo no se veía al leerlo.
    const estado = authReducer(sesionInicial, sesionRestaurada(sesion))

    expect(estado.csrfToken).toBe('csrf-1')
  })

  it('olvida el token de CSRF al cerrar sesión, para no reusarlo', () => {
    const autenticada = authReducer(sesionInicial, sesionRestaurada(sesion))

    expect(authReducer(autenticada, sesionCerrada()).csrfToken).toBe('')
  })

  it('olvida el token al cerrar sesión, y no solo el usuario', () => {
    const autenticada = authReducer(sesionInicial, sesionRestaurada(sesion))

    const estado = authReducer(autenticada, sesionCerrada())

    expect(estado.accessToken).toBeNull()
    expect(estado.user).toBeNull()
    expect(estado.status).toBe('anonima')
  })

  it('el estado solo tiene estos campos, y el token es uno de ellos sin persistir nada', () => {
    const autenticada = authReducer(sesionInicial, sesionRestaurada(sesion))

    // El token vive en memoria porque en memoria es donde debe vivir. Lo que no
    // puede pasar es que acabe en localStorage, y la forma del estado es lo que
    // fija qué se podría persistir por accidente.
    expect(autenticada.accessToken).toBe('token-1')
    expect(Object.keys(authReducer(undefined, { type: 'desconocida' })).sort()).toEqual([
      'accessToken',
      'csrfToken',
      'error',
      'sesionSolicitada',
      'status',
      'user',
    ])
  })

  it('no convertir "no hay sesión" en un error visible, que es el estado de quien entra sin registrarse', () => {
    const estado = authReducer(sesionInicial, sesionNoRestaurada())

    expect(estado.status).toBe('anonima')
    expect(estado.error).toBeNull()
    expect(estado.accessToken).toBeNull()
  })

  it('recuerda que ya se pidió la sesión, para no pedirla en cada navegación', () => {
    const estado = authReducer(sesionInicial, sesionSolicitada())

    expect(estado.sesionSolicitada).toBe(true)
  })

  it('guarda el error de una operación fallida', () => {
    const estado = authReducer(sesionInicial, errorDeOperacion('No se pudo conectar'))

    expect(estado.error).toBe('No se pudo conectar')
  })
})
