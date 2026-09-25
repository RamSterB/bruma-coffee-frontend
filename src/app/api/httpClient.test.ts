import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './ApiError'
import { httpClient } from './httpClient'

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

describe('httpClient', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('devuelve el cuerpo JSON de una respuesta exitosa', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: 1, name: 'Geisha' }]))

    await expect(httpClient.get<CoffeeDto[]>('/coffee')).resolves.toEqual([{ id: 1, name: 'Geisha' }])
  })

  it('envía la ruta dentro del prefijo /api', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))

    await httpClient.get('/coffee')

    expect(fetchMock).toHaveBeenCalledWith('/api/coffee', expect.anything())
  })

  it('envía el cuerpo JSON en POST', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 7 }, { status: 201 }))

    await httpClient.post<CoffeeDto>('/coffee', { name: 'Geisha' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/coffee')
    expect(init?.body).toBe(JSON.stringify({ name: 'Geisha' }))
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
  })

  it('lanza ApiError con el status en un error del servidor', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'No encontrado' }, { status: 404 }),
    )

    await expect(httpClient.get('/coffee/99')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    })
  })

  it('usa el mensaje del backend cuando viene en la respuesta', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Café no encontrado' }, { status: 404 }))

    await expect(httpClient.get('/coffee/99')).rejects.toThrow('Café no encontrado')
  })

  it('usa un mensaje por defecto cuando el backend no manda mensaje', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 500 }))

    await expect(httpClient.get('/coffee')).rejects.toThrow(/500/)
  })

  it('no intenta interpretar un cuerpo vacío', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(httpClient.delete('/coffee/1')).resolves.toBeUndefined()
  })

  it('propaga un ApiError con status 0 cuando la red falla', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const error = await httpClient.get('/coffee').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(0)
  })

  it('envía el token de autorización cuando hay sesión', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))
    const token = 'jwt-de-prueba'

    await httpClient.get('/cart', { token })

    const [, init] = fetchMock.mock.calls[0]
    expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${token}`)
  })

  it('no envía cabecera Authorization si no hay token', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))

    await httpClient.get('/coffee')

    const [, init] = fetchMock.mock.calls[0]
    expect(new Headers(init?.headers).has('Authorization')).toBe(false)
  })
})

interface CoffeeDto {
  id: number
  name: string
}
