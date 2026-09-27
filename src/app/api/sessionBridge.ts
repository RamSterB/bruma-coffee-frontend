import { ApiError } from './ApiError'

/** Lo mínimo de una sesión que el puente necesita conocer. */
export interface SesionDeBridge {
  accessToken: string
  accessTokenExpiresIn: number
  csrfToken: string
  user: unknown
}

export interface SessionBridgeDependencies {
  /** El token vive solo en memoria; de aquí se lee, nunca del almacenamiento. */
  getAccessToken: () => string | null
  refreshSession: () => Promise<SesionDeBridge>
  onSessionRestored: (sesion: SesionDeBridge | null) => void
  onSignedOut: () => void
}

export interface SessionBridge {
  getAccessToken(): string | null
  /** Envuelve una petición: ante un 401, refresca una vez y reintenta. */
  retryAfterUnauthorized<T>(peticion: (token: string | null) => Promise<T>): Promise<T>
  /** Recupera la sesión al arrancar, en silencio. */
  restore(): Promise<void>
  clear(): void
}

const es401 = (error: unknown): boolean => error instanceof ApiError && error.isUnauthorized

/**
 * El puente entre la sesión que vive en el store y las peticiones HTTP.
 *
 * Lo delicate es que ante un 401 solo se refresca **una vez por tanda**, y que el
 * refresh nunca se reintenta a sí mismo. Sin esas dos reglas, un token caducado
 * con el refresh caducado también dispara una cadena de reintentos que termina
 *soitiendo al navegador, o peor, se queda reintentando en silencio.
 *
 * El refresh en curso se comparte entre las peticiones que lo esperan: si cinco
 * peticiones reciben un 401 a la vez, sale un solo refresh y las cinco reintentan
 * con el token nuevo. Con cinco refreshes, cuatro de ellos rotarían un token que
 * la respuesta del primero ya invalidó, y el usuario acabaría con la sesión
 * cerrada sin motivo.
 */
export const createSessionBridge = (dependencias: SessionBridgeDependencies): SessionBridge => {
  let refreshEnCurso: Promise<SesionDeBridge> | null = null

  const refrescar = (): Promise<SesionDeBridge> => {
    refreshEnCurso ??= dependencias.refreshSession().finally(() => {
      refreshEnCurso = null
    })

    return refreshEnCurso
  }

  const cerrarSesion = (): void => {
    dependencias.onSignedOut()
  }

  return {
    getAccessToken: () => dependencias.getAccessToken(),

    async retryAfterUnauthorized<T>(peticion: (token: string | null) => Promise<T>): Promise<T> {
      const primerIntento = await attempt(peticion, dependencias.getAccessToken())

      if (!primerIntento.fallo401) {
        return primerIntento.valor as T
      }

      let sesion: SesionDeBridge

      try {
        sesion = await refrescar()
      } catch {
        // Sin refresh válido no hay nada que reintentar: la sesión se cierra y el
        // error original sube, que es el que explica qué pasó.
        cerrarSesion()

        throw primerIntento.error
      }

      dependencias.onSessionRestored(sesion)

      const segundoIntento = await attempt(peticion, sesion.accessToken)

      if (segundoIntento.fallo401) {
        // El token nuevo tampoco vale. Reintentar otra vez sería el bucle.
        cerrarSesion()

        throw segundoIntento.error
      }

      return segundoIntento.valor as T
    },

    async restore(): Promise<void> {
      try {
        const sesion = await refrescar()
        dependencias.onSessionRestored(sesion)
      } catch {
        dependencias.onSessionRestored(null)
      }
    },

    clear(): void {
      cerrarSesion()
    },
  }
}

interface Intento<T> {
  valor?: T
  error?: unknown
  fallo401: boolean
}

const attempt = async <T>(
  peticion: (token: string | null) => Promise<T>,
  token: string | null,
): Promise<Intento<T>> => {
  try {
    return { valor: await peticion(token), fallo401: false }
  } catch (error) {
    if (es401(error)) {
      return { error, fallo401: true }
    }

    throw error
  }
}
