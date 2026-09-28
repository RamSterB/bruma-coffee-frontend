import { describe, expect, it } from '@jest/globals'
import { tokenizeCard, type CardTokenizationInput } from './cardTokenization'

/**
 * La tokenización ocurre **en el navegador** y es lo que hace que el número de
 * tarjeta no pase nunca por nuestros servidores. Estos tests usan un
 * `fetch` falso: la tokenización real necesita red y una tarjeta de prueba, y una
 * prueba que dependa de eso no es una prueba.
 */
const fetchFalso = (respuesta: unknown, status = 200) => {
  const llamadas: { url: string; init: RequestInit }[] = []
  const fetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
    llamadas.push({ url, init })

    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => respuesta,
    } as Response
  }

  return { fetch, llamadas }
}

const TARJETA: CardTokenizationInput = {
  number: '4111111111111111',
  expMonth: '12',
  expYear: '30',
  cvc: '123',
  holderName: 'PERSONA COMPRADORA',
}

/**
 * La respuesta real del sandbox, copiada de la que devuelve la pasarela. Se usa
 * esta y no una inventada: los tres detalles que importan (el plural del
 * endpoint, el estado `CREATED` y el token en `data.id`) no se deducen, se
 * comprueban.
 */
const EXITO = {
  status: 'CREATED',
  data: {
    id: 'tok_stagtest_5113_E523a6b17988dE98F1E0796530dBAe25',
    brand: 'VISA',
    last_four: '1111',
    validity_ends_at: '2026-09-30T02:34:45.059+00:00',
  },
}

const CONFIG = { publicKey: 'pub_test_una', baseUrl: 'https://api.pruebas.proveedor.example/v1' }

describe('tokenizeCard', () => {
  it('manda el número, el vencimiento, el código y el titular a la pasarela', async () => {
    const { fetch, llamadas } = fetchFalso(EXITO)

    await tokenizeCard(TARJETA, CONFIG, fetch)

    const cuerpo = JSON.parse(String(llamadas[0]?.init.body))
    expect(cuerpo.number).toBe('4111111111111111')
    expect(cuerpo.exp_month).toBe('12')
    // El año va con dos dígitos. Mandar 2030 es un 422 y no un cobro: la pasarela
    // espera el año como lo escribe el plástico.
    expect(cuerpo.exp_year).toBe('30')
    expect(cuerpo.cvc).toBe('123')
    expect(cuerpo.card_holder).toBe('PERSONA COMPRADORA')
  })

  it('autoriza con la llave pública, que es la única que puede ir en el navegador', async () => {
    const { fetch, llamadas } = fetchFalso(EXITO)

    await tokenizeCard(TARJETA, CONFIG, fetch)

    const cabeceras = llamadas[0]?.init.headers as Record<string, string>
    expect(cabeceras.Authorization).toBe('Bearer pub_test_una')
  })

  it('devuelve el token cuando la pasarela acepta la tarjeta', async () => {
    const { fetch } = fetchFalso(EXITO)

    const resultado = await tokenizeCard(TARJETA, CONFIG, fetch)

    expect(resultado).toEqual({
      ok: true,
      value: 'tok_stagtest_5113_E523a6b17988dE98F1E0796530dBAe25',
    })
  })

  it('devuelve un error legible si la tarjeta no se puede tokenizar', async () => {
    const { fetch } = fetchFalso({
      status: 'ERROR',
      data: { id: '' },
      error: { messages: { number: ['La tarjeta no es válida'] } },
    })

    const resultado = await tokenizeCard(TARJETA, CONFIG, fetch)

    expect(resultado.ok).toBe(false)
    if (resultado.ok) {
      return
    }
    expect(resultado.error).toMatch(/no es válida/i)
  })

  it('trata un fallo de red como error, sin dejar el botón colgado', async () => {
    const fetch = async (): Promise<Response> => {
      throw new Error('sin conexión')
    }

    const resultado = await tokenizeCard(TARJETA, CONFIG, fetch)

    expect(resultado.ok).toBe(false)
  })

  it('no lanza excepciones hacia arriba, aunque la respuesta venga vacía', async () => {
    const { fetch } = fetchFalso({})

    const resultado = await tokenizeCard(TARJETA, CONFIG, fetch)

    expect(resultado.ok).toBe(false)
  })

  it('normaliza el número quitando espacios y guiones antes de enviarlo', async () => {
    const { fetch, llamadas } = fetchFalso(EXITO)

    await tokenizeCard({ ...TARJETA, number: '4111 1111-1111 1111' }, CONFIG, fetch)

    expect(JSON.parse(String(llamadas[0]?.init.body)).number).toBe('4111111111111111')
  })

  it('el titular va en mayúsculas, que es como lo pide la pasarela', async () => {
    const { fetch, llamadas } = fetchFalso(EXITO)

    await tokenizeCard({ ...TARJETA, holderName: 'persona compradora' }, CONFIG, fetch)

    expect(JSON.parse(String(llamadas[0]?.init.body)).card_holder).toBe('PERSONA COMPRADORA')
  })

  it('el endpoint es en plural: /tokens/cards, y en singular devuelve 404', async () => {
    const { fetch, llamadas } = fetchFalso(EXITO)

    await tokenizeCard(TARJETA, CONFIG, fetch)

    expect(llamadas[0]?.url).toBe('https://api.pruebas.proveedor.example/v1/tokens/cards')
  })

  it('devuelve el token aunque la respuesta traiga la fecha de validez, que no interesa aquí', async () => {
    const { fetch } = fetchFalso(EXITO)

    const resultado = await tokenizeCard(TARJETA, CONFIG, fetch)

    expect(resultado.ok).toBe(true)
  })
})
