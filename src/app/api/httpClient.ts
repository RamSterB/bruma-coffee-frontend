import { ApiError } from './ApiError'

const API_PREFIX = '/api'
const NETWORK_ERROR_STATUS = 0

export interface RequestOptions {
  token?: string
  signal?: AbortSignal
}

const buildUrl = (path: string): string =>
  `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`

const buildHeaders = (body: unknown, token?: string): Headers => {
  const headers = new Headers({ Accept: 'application/json' })

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
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

const request = async <T>(method: string, path: string, body?: unknown, options: RequestOptions = {}): Promise<T> => {
  let response: Response

  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: buildHeaders(body, options.token),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options.signal,
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
  get: <T>(path: string, options?: RequestOptions): Promise<T> => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('POST', path, body, options),
  put: <T>(path: string, body: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('PUT', path, body, options),
  patch: <T>(path: string, body: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('PATCH', path, body, options),
  delete: <T = void>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>('DELETE', path, undefined, options),
}
