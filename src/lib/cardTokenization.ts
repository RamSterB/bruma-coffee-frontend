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

interface TokenizationResponse {
  status?: string
  data?: { token?: string }
  error?: { messages?: Record<string, string[]> }
}

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
    respuesta = await fetch(`${config.baseUrl}/tokens/card`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.publicKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: tarjeta.number.replace(SOLO_NO_DIGITOS, ''),
        exp_month: tarjeta.expMonth.replace(SOLO_NO_DIGITOS, ''),
        exp_year: tarjeta.expYear.replace(SOLO_NO_DIGITOS, ''),
        cvc: tarjeta.cvc.replace(SOLO_NO_DIGITOS, ''),
        holder_name: tarjeta.holderName.trim().toUpperCase(),
        // Sin esto la pasarela exige los términos de su propio formulario, que no
        // es el nuestro.
        terms_and_conditions: 'true',
        recipient: 'PAGO EN TIENDA',
      }),
    })
  } catch (error) {
    return {
      ok: false,
      error: `No pudimos comunicarnos con la pasarela: ${(error as Error).message}`,
    }
  }

  const cuerpo = (await respuesta.json().catch(() => ({}))) as TokenizationResponse
  const token = cuerpo.data?.token

  if (cuerpo.status === 'SUCCESS' && typeof token === 'string' && token.length > 0) {
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
