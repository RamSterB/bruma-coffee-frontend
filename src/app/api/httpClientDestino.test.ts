import { describe, expect, it, beforeEach, afterEach } from '@jest/globals'
import { httpClient } from './httpClient'

/**
 * En desarrollo el frontend y la API comparten origen, y la petición va a `/api`, que
 * es lo que el proxy de Vite traduce al backend.
 *
 * En producción **no**: el frontend lo sirve una distribución de CloudFront y la API
 * vive en otro origen, detrás de su balanceador. Si la ruta fuera relativa, la
 * petición acabaría en CloudFront y volvería el `index.html` de la SPA, y el cliente
 * reventaría al intentar leerlo como JSON. Con la URL configurada, va a donde debe.
 */
const URL_DE_LA_API = 'https://api.ejemplo.co'

const llamadas = (): string[] => {
  const hechas: string[] = []

  globalThis.fetch = ((entrada: RequestInfo | URL) => {
    hechas.push(String(entrada))

    return Promise.resolve(
      new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )
  }) as typeof fetch

  return hechas
}

const restaurarFetch = (original: typeof fetch) => {
  globalThis.fetch = original
}

describe('la direccion de la API', () => {
  const original = globalThis.fetch
  let hechas: string[]

  beforeEach(() => {
    hechas = llamadas()
  })

  afterEach(() => {
    restaurarFetch(original)
    delete (globalThis as { __API_ORIGIN__?: string }).__API_ORIGIN__
  })

  it('en desarrollo va a la ruta relativa, que es la que traduce el proxy', async () => {
    await httpClient.get('/coffee')

    expect(hechas[0]).toBe('/api/coffee')
  })

  it('en produccion va a la API de verdad, no a la pagina que la sirve', async () => {
    ;(globalThis as { __API_ORIGIN__?: string }).__API_ORIGIN__ = URL_DE_LA_API

    await httpClient.get('/orders')

    // La URL tiene que llevar las dos partes: el origen de la API y el prefijo de las
    // rutas. Poner solo el origen daria `/orders` en la raiz, que no existe.
    expect(hechas[0]).toBe(`${URL_DE_LA_API}/api/orders`)
  })

  it('una URL con barra final no produce una barra doble', async () => {
    ;(globalThis as { __API_ORIGIN__?: string }).__API_ORIGIN__ = `${URL_DE_LA_API}/`

    await httpClient.get('/coffee')

    expect(hechas[0]).toBe(`${URL_DE_LA_API}/api/coffee`)
  })

  it('una ruta sin barra inicial tambien funciona', async () => {
    ;(globalThis as { __API_ORIGIN__?: string }).__API_ORIGIN__ = URL_DE_LA_API

    await httpClient.get('auth/me')

    expect(hechas[0]).toBe(`${URL_DE_LA_API}/api/auth/me`)
  })

  it('sin configurar, sigue yendo a la ruta relativa', async () => {
    await httpClient.get('/coffee')

    expect(hechas[0]).toBe('/api/coffee')
  })
})
