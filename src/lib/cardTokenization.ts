export interface CardTokenizationInput {
  number: string
  expMonth: string
  expYear: string
  cvc: string
  holderName: string
}

export interface CardGatewayClientConfig {
  /** La llave pública. Es la única credencial que puede vivir en el navegador. */
  publicKey: string
  baseUrl: string
}

type Resultado = { ok: true; value: string } | { ok: false; error: string }

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

const SOLO_NO_DIGITOS = /\D/g

/**
 * Lo que devuelve la pasarela, comprobado contra el sandbox. Los tres detalles que
 * importan **no se deducen**: el endpoint es en plural (`/tokens/cards`, y en
 * singular devuelve 404), el estado de éxito es `CREATED` y el token viene en
 * `data.id`, no en `data.token`. Los tres se Fallaron a la primera porque el
 * contrato se había escrito de memoria en vez de contra la respuesta real.
 */
interface TokenizationResponse {
  status?: string
  data?: {
    id?: string
    brand?: string
    last_four?: string
    /** El token caduca: en el sandbox, a los dos días. Por eso la orden se crea de inmediato. */
    validity_ends_at?: string
  }
  error?: { messages?: Record<string, string[]> }
}

/** El único estado que significa "token creado". Cualquier otro es un fallo. */
const CREADO = 'CREATED'

/**
 * Convierte una tarjeta en un token **desde el navegador**.
 *
 * Esta función es la razón de que el número no llegue nunca a nuestros servidores:
 * el POST va directo a la pasarela con la llave pública, y lo único que vuelve a
 * nuestra aplicación es el token. El backend no ve el número en ningún momento
 * (ADR-006).
 */
export const tokenizeCard = async (
  tarjeta: CardTokenizationInput,
  config: CardGatewayClientConfig,
  fetch: FetchLike = (url, init) => globalThis.fetch(url, init),
): Promise<Resultado> => {
  if (config.publicKey.length === 0) {
    return {
      ok: false,
      error: 'La tienda no tiene configurada la pasarela de pago. Escríbenos y lo arreglamos.',
    }
  }

  let respuesta: Response
  try {
    respuesta = await fetch(`${config.baseUrl}/tokens/cards`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.publicKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: tarjeta.number.replace(SOLO_NO_DIGITOS, ''),
        cvc: tarjeta.cvc.replace(SOLO_NO_DIGITOS, ''),
        exp_month: tarjeta.expMonth.replace(SOLO_NO_DIGITOS, ''),
        // El año va con dos dígitos, como está en el plástico. Mandar 2030 es un 422.
        exp_year: tarjeta.expYear.replace(SOLO_NO_DIGITOS, '').slice(-2),
        card_holder: tarjeta.holderName.trim().toUpperCase(),
      }),
    })
  } catch (error) {
    return {
      ok: false,
      error: `No pudimos comunicarnos con la pasarela: ${(error as Error).message}`,
    }
  }

  const cuerpo = (await respuesta.json().catch(() => ({}))) as TokenizationResponse
  const token = cuerpo.data?.id

  if (cuerpo.status === CREADO && typeof token === 'string' && token.length > 0) {
    return { ok: true, value: token }
  }

  return { ok: false, error: mensajeDeLaPasarela(cuerpo) }
}

/** El primer mensaje de la pasarela, y no el código: quien lee esto es quien compró. */
const mensajeDeLaPasarela = (cuerpo: TokenizationResponse): string => {
  const mensajes = cuerpo.error?.messages ?? {}
  const primero = Object.values(mensajes)
    .flat()
    .find((mensaje) => mensaje.length > 0)

  return primero ?? 'La tarjeta no se pudo validar. Revisa los datos e inténtalo otra vez.'
}
