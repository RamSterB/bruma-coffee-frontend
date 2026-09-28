import { ApiError } from './ApiError'
import { origenDeLaApi } from './apiOrigin'

const API_PREFIX = '/api'
const NETWORK_ERROR_STATUS = 0

export interface RequestOptions {
  token?: string
  signal?: AbortSignal
  /**
   * Añade `X-CSRF-Token`, que es lo que piden refresh y logout: son peticiones que se
   * apoyan en la cookie de refresh, y una cookie viaja sola aunque la provoke otro sitio.
   *
   * **Con un valor, manda ese valor. Con `true`, lee la cookie.** Y no es lo mismo: la
   * cookie es del dominio de la API, y `document.cookie` solo ve las del sitio donde está
   * la página. Con la tienda y la API en dominios distintos, como está desplegado, desde
   * la tienda la cookie no se ve y el valor tiene que venir de donde sí se ve, que es el
   * cuerpo del inicio de sesión.
   */
  csrf?: boolean | string
}

/** Nombre de la cookie que el backend deja legible a propósito, junto a la httpOnly. */
export const CSRF_COOKIE = 'csrf_token'

/**
 * La ruta, con el origen delante solo si hay uno configurado.
 *
 * Sin origen (desarrollo) queda `/api/...` y lo traduce el proxy. Con origen
 * (produccion) queda la direccion de la API, porque alli la tienda y la API no
 * comparten dominio. Ver `apiOrigin.ts` para por que es obligatorio separarlos.
 */
const buildUrl = (path: string): string => {
  const ruta = path.startsWith('/') ? path : `/${path}`

  return `${origenDeLaApi()}${API_PREFIX}${ruta}`
}

/**
 * Lee el valor de una cookie desde `document.cookie`. Devuelve `null` si no está,
 * que es el caso de quien no tiene sesión, y en ese caso no se manda cabecera
 * ninguna: mandar una vacía sería peor que no mandarla, porque el servidor
 * compararía dos vacíos y los daría por iguales.
 */
export const readCookie = (name: string): string | null => {
  if (typeof document === 'undefined') {
    return null
  }

  for (const parte of document.cookie.split(';')) {
    const separador = parte.indexOf('=')

    if (separador < 0) {
      continue
    }

    if (parte.slice(0, separador).trim() === name) {
      return decodeURIComponent(parte.slice(separador + 1).trim())
    }
  }

  return null
}

const buildHeaders = (body: unknown, token?: string, csrf: boolean | string = false): Headers => {
  const headers = new Headers({ Accept: 'application/json' })

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (csrf) {
    const valor = typeof csrf === 'string' ? csrf : readCookie(CSRF_COOKIE)

    if (valor !== null && valor !== '') {
      headers.set('X-CSRF-Token', valor)
    }
  }

  return headers
}

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { message?: string | string[] } | null
    const message = payload?.message

    if (Array.isArray(message)) {
      return message.join(', ')
    }

    if (typeof message === 'string' && message !== '') {
      return message
    }
  } catch {
    // el cuerpo no era JSON: se usa el mensaje por defecto
  }

  return `Error ${response.status}`
}

const request = async <T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> => {
  let response: Response

  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: buildHeaders(body, options.token, options.csrf),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options.signal,
      // Sin esto la cookie de refresh no viaja y no hay sesión que recuperar al
      // recargar: el token de acceso sí lleva su cabecera, pero el refresh no.
      credentials: 'include',
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }

    throw new ApiError('No se pudo conectar con el servidor', NETWORK_ERROR_STATUS)
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const httpClient = {
  get: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>('GET', path, undefined, options),
  post: <T>(path: string, body: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('POST', path, body, options),
  put: <T>(path: string, body: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('PUT', path, body, options),
  patch: <T>(path: string, body: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('PATCH', path, body, options),
  delete: <T = void>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>('DELETE', path, undefined, options),
}
