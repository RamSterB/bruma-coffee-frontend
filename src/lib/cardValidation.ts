export type CardBrand = 'VISA' | 'MASTERCARD' | 'DESCONOCIDA'

const SOLO_DIGITOS = /\D/g

const digitosDe = (valor: string): string => valor.replace(SOLO_DIGITOS, '')

/**
 * Detecta la marca leyendo los primeros dígitos, que es lo que se conoce en
 * cuanto se empieza a escribir. El BIN va antes que el Luhn a propósito: para
 * pintar el logo no hace falta que el número sea válido, solo que sus primeros
 * dígitos digan a qué red pertenece.
 */
export const cardBrandFromNumber = (valor: string): CardBrand => {
  const digitos = digitosDe(valor)

  if (digitos.startsWith('4')) {
    return 'VISA'
  }

  // 51 a 55 es el rango clásico de Mastercard y el 2 el rango nuevo, que es el
  // que emite la mayoría de bancos hoy. Con solo el 2 no basta: el 23 también
  // empieza por 2, y hay que separar el 2 de la Mastercard del resto.
  if (/^5[1-5]/.test(digitos) || /^2[2-7]/.test(digitos)) {
    return 'MASTERCARD'
  }

  return 'DESCONOCIDA'
}

export const isSupportedBrand = (marca: CardBrand): boolean =>
  marca === 'VISA' || marca === 'MASTERCARD'

/** El algoritmo de Luhn, que es el que usa la gente para comprobar un número. */
export const passesLuhn = (digitos: string): boolean => {
  if (digitos.length === 0) {
    return false
  }

  let suma = 0
  let duplicar = false

  for (let indice = digitos.length - 1; indice >= 0; indice -= 1) {
    const digito = digitos.charCodeAt(indice) - 48

    if (digito < 0 || digito > 9) {
      return false
    }

    let valor = digito

    if (duplicar) {
      valor *= 2

      if (valor > 9) {
        valor -= 9
      }
    }

    suma += valor
    duplicar = !duplicar
  }

  return suma % 10 === 0
}

export const validateCard = (valor: string): boolean => {
  const digitos = digitosDe(valor)

  if (!/^\d+$/.test(valor.replace(/[\s-]/g, ''))) {
    return false
  }

  return digitos.length >= 13 && digitos.length <= 19 && passesLuhn(digitos)
}

/** Agrupa de cuatro en cuatro mientras se escribe, que es como se lee un número. */
export const formatCardNumber = (valor: string): string => {
  const digitos = digitosDe(valor).slice(0, 19)

  return digitos.replace(/(.{4})/g, '$1 ').trim()
}

const MESES_VALIDOS = Array.from({ length: 12 }, (_, indice) => indice + 1)

/**
 * La fecha es mes/año y caduca **al final** del mes indicado, así que el mes en
 * curso todavía vale. Se exige un dígito de mes porque "1/30" se lee de dos
 * maneras y adivinar mal expira la tarjeta antes de tiempo.
 */
export const validateExpiry = (valor: string): boolean => {
  const encontrado = /^(\d{2})\/(\d{2})$/.exec(valor.trim())

  if (encontrado === null) {
    return false
  }

  const mes = Number(encontrado[1])
  const anio = 2000 + Number(encontrado[2])

  if (!MESES_VALIDOS.includes(mes)) {
    return false
  }

  const ahora = new Date()
  const anioActual = ahora.getFullYear()
  const mesActual = ahora.getMonth() + 1

  if (anio > anioActual) {
    return true
  }

  return anio === anioActual && mes >= mesActual
}

/**
 * Tres dígitos. El American Express usa cuatro, y no lo aceptamos: no se procesa,
 * y aceptarlo sería prometer un pago que la pasarela va a rechazar.
 */
export const validateCvv = (valor: string): boolean => /^\d{3}$/.test(valor.trim())
