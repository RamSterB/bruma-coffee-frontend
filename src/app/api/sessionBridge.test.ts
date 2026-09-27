import { describe, expect, it } from '@jest/globals'
import { ApiError } from './ApiError'
import {
  createSessionBridge,
  type SesionDeBridge,
  type SessionBridge,
  type SessionBridgeDependencies,
} from './sessionBridge'

type Sesion = SesionDeBridge

/** Espera a que la condición se cumpla, en vez de contar ticks a ojo. */
const esperarA = async (condicion: () => boolean, limite = 100): Promise<void> => {
  for (let intento = 0; intento < limite; intento += 1) {
    if (condicion()) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  throw new Error('La condición no se cumplió')
}

/**
 * El puente entre la sesión en el store y el cliente HTTP. Lo que se prueba aquí
 * es lo caro de equivocar: que un 401 dispare **un** refresh y no uno por
 * petición, que no se entre en bucle, y que un token caducado sin refresh
 * válido termine en sesión cerrada y no en un reintento infinito.
 */
describe('createSessionBridge', () => {
  const montar = (
    dependencias: Partial<SessionBridgeDependencies> = {},
  ): {
    bridge: SessionBridge
    leidas: string[]
    tokens: (string | null)[]
    sesiones: (Sesion | null)[]
  } => {
    const leidas: string[] = []
    const tokens: (string | null)[] = ['token-viejo']
    const sesiones: (Sesion | null)[] = []
    let tokenActual: string | null = 'token-viejo'

    const bridge = createSessionBridge({
      getAccessToken: () => tokenActual,
      refreshSession: async () => {
        const sesion: Sesion = {
          accessToken: 'token-nuevo',
          accessTokenExpiresIn: 900,
          csrfToken: 'csrf',
          user: { id: 'user-1', email: 'persona@ejemplo.com' },
        }
        tokenActual = sesion.accessToken
        tokens.push(tokenActual)

        return sesion
      },
      onSessionRestored: (sesion: Sesion | null) => {
        sesiones.push(sesion)
      },
      onSignedOut: () => {
        tokenActual = null
        sesiones.push(null)
      },
      ...dependencias,
    })

    return { bridge, leidas, tokens, sesiones }
  }

  it('devuelve el token en memoria sin pedir nada al servidor', () => {
    const { bridge } = montar()

    expect(bridge.getAccessToken()).toBe('token-viejo')
  })

  it('reintenta la petición una vez con el token nuevo', async () => {
    const { bridge } = montar()
    const vistos: (string | null)[] = []
    let intentos = 0

    await bridge.retryAfterUnauthorized(async (token) => {
      intentos += 1
      vistos.push(token)

      if (intentos === 1) {
        throw new ApiError('La sesión no es válida', 401)
      }

      return 'ok'
    })

    expect(intentos).toBe(2)
    expect(vistos).toEqual(['token-viejo', 'token-nuevo'])
  })

  it('no refresca otra vez si el reintento también falla, que es el bucle que hay que evitar', async () => {
    let refrescos = 0
    const { bridge } = montar({
      refreshSession: async () => {
        refrescos += 1

        return {
          accessToken: 'token-nuevo',
          accessTokenExpiresIn: 900,
          csrfToken: 'csrf',
          user: { id: 'user-1', email: 'persona@ejemplo.com' },
        }
      },
    })

    await expect(
      bridge.retryAfterUnauthorized(async () => {
        throw new ApiError('La sesión no es válida', 401)
      }),
    ).rejects.toThrow()

    expect(refrescos).toBe(1)
  })

  it('cierra la sesión cuando el reintento vuelve a fallar con 401', async () => {
    const { bridge, sesiones } = montar()

    await expect(
      bridge.retryAfterUnauthorized(async () => {
        throw new ApiError('La sesión no es válida', 401)
      }),
    ).rejects.toThrow()

    // El refresh sí ocurrió (luego llega una sesión) y lo que importa es que al
    // final quede cerrada: el token nuevo tampoco valía.
    expect(sesiones.at(-1)).toBeNull()
  })

  it('varios 401 a la vez producen un solo refresh', async () => {
    let refrescos = 0
    const resolverRefresh: (() => void)[] = []
    const { bridge } = montar({
      refreshSession: async () => {
        refrescos += 1
        await new Promise<void>((resolve) => resolverRefresh.push(resolve))

        return {
          accessToken: 'token-nuevo',
          accessTokenExpiresIn: 900,
          csrfToken: 'csrf',
          user: { id: 'user-1', email: 'persona@ejemplo.com' },
        }
      },
    })

    const peticiones = [
      bridge.retryAfterUnauthorized(async () => {
        throw new ApiError('La sesión no es válida', 401)
      }),
      bridge.retryAfterUnauthorized(async () => {
        throw new ApiError('La sesión no es válida', 401)
      }),
      bridge.retryAfterUnauthorized(async () => {
        throw new ApiError('La sesión no es válida', 401)
      }),
    ]

    // Se espera a que las tres hayan llegado al refresh. Sin un solo vuelo habría
    // tres resolvers pendientes y una espera infinita; con uno, las tres esperan
    // al mismo.
    await esperarA(() => resolverRefresh.length >= 1)
    resolverRefresh.forEach((resolver) => resolver())

    await Promise.allSettled(peticiones)

    expect(refrescos).toBe(1)
  })

  it('propaga el error tal cual si no es un 401, sin tocar la sesión', async () => {
    const { bridge, sesiones } = montar()

    await expect(
      bridge.retryAfterUnauthorized(async () => {
        throw new ApiError('No se pudo conectar con el servidor', 0)
      }),
    ).rejects.toThrow('No se pudo conectar con el servidor')

    expect(sesiones).toEqual([])
  })

  it('deja pasar el resultado si la petición no falla', async () => {
    const { bridge } = montar()

    await expect(bridge.retryAfterUnauthorized(async () => 'ok')).resolves.toBe('ok')
  })

  it('el refresh devuelve la sesión para que el store la guarde', async () => {
    const { bridge, sesiones } = montar()

    await bridge.restore()

    expect(sesiones).toHaveLength(1)
    expect(sesiones[0]).toMatchObject({ accessToken: 'token-nuevo' })
  })

  it('si el refresh falla al arrancar, la sesión queda cerrada y no rota', async () => {
    const { bridge, sesiones } = montar({
      refreshSession: async () => {
        throw new ApiError('La sesión no es válida o ha caducado', 401)
      },
    })

    await bridge.restore()

    expect(sesiones).toEqual([null])
  })

  it('cerrar sesión llama al finalizador y olvida el token', async () => {
    const { bridge } = montar()

    bridge.clear()

    expect(bridge.getAccessToken()).toBeNull()
  })
})
