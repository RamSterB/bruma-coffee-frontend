import { describe, expect, it } from '@jest/globals'
import {
  cardBrandFromNumber,
  formatCardNumber,
  isSupportedBrand,
  validateCard,
  validateCvv,
  validateExpiry,
} from './cardValidation'

/**
 * Números de prueba que pasan Luhn, para no tener que inventarlos en cada test.
 * Los dos primeros dígitos son los que deciden la marca, así que sirven
 * justamente para probar la detección.
 */
const VISA = '4111111111111111'
const MASTERCARD = '5500005555555559'
const MASTERCARD_2 = '2223003122003222'

describe('cardBrandFromNumber', () => {
  it('reconoce Visa por el 4', () => {
    expect(cardBrandFromNumber(VISA)).toBe('VISA')
  })

  it('reconoce Mastercard por el 5', () => {
    expect(cardBrandFromNumber(MASTERCARD)).toBe('MASTERCARD')
  })

  it('reconoce Mastercard por el 2', () => {
    expect(cardBrandFromNumber(MASTERCARD_2)).toBe('MASTERCARD')
  })

  it('detecta la marca con pocos dígitos, que es como se escribe', () => {
    expect(cardBrandFromNumber('4')).toBe('VISA')
    expect(cardBrandFromNumber('55')).toBe('MASTERCARD')
  })

  it('con espacios o guiones, porque la gente los escribe', () => {
    expect(cardBrandFromNumber('4111 1111 1111 1111')).toBe('VISA')
    expect(cardBrandFromNumber('4111-1111-1111-1111')).toBe('VISA')
  })

  it('devuelve desconocido cuando los primeros dígitos no dicen nada', () => {
    expect(cardBrandFromNumber('9999999999999999')).toBe('DESCONOCIDA')
  })

  it('devuelve desconocido con la tarjeta vacía, no adivina', () => {
    expect(cardBrandFromNumber('')).toBe('DESCONOCIDA')
  })
})

describe('isSupportedBrand', () => {
  it('acepta Visa y Mastercard', () => {
    expect(isSupportedBrand('VISA')).toBe(true)
    expect(isSupportedBrand('MASTERCARD')).toBe(true)
  })

  it('rechaza una marca que no procesamos, que solo puede ser la desconocida', () => {
    // El tipo no admite otras marcas a proposito: si algum dia se acepta otra,
    // hay que ampliar el tipo y la lista de aqui a la vez, no solo una de las dos.
    expect(isSupportedBrand('DESCONOCIDA')).toBe(false)
  })
})

describe('validateCard', () => {
  it('acepta un número válido', () => {
    expect(validateCard(VISA)).toBe(true)
  })

  it('rechaza un número que no pasa Luhn', () => {
    // El último dígito cambia y la suma deja de cuadrar.
    expect(validateCard('4111111111111112')).toBe(false)
  })

  it('rechaza un número demasiado corto', () => {
    expect(validateCard('411111111111')).toBe(false)
  })

  it('rechaza un número con letras mezcladas', () => {
    expect(validateCard('4111 1111 1111 111a')).toBe(false)
  })

  it('rechaza la tarjeta vacía', () => {
    expect(validateCard('')).toBe(false)
  })
})

describe('formatCardNumber', () => {
  it('agrupa de cuatro en cuatro mientras se escribe', () => {
    expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111')
  })

  it('va agrupando un número a medias, que es como se ve al escribir', () => {
    expect(formatCardNumber('41111')).toBe('4111 1')
  })

  it('respeta los espacios que ya traía, sin duplicarlos', () => {
    expect(formatCardNumber('4111 1111')).toBe('4111 1111')
  })

  it('no rompe con los guiones de por medio', () => {
    expect(formatCardNumber('4111-1111-1111-1111')).toBe('4111 1111 1111 1111')
  })
})

describe('validateExpiry', () => {
  it('acepta un mes futuro', () => {
    expect(validateExpiry('12/30')).toBe(true)
  })

  it('acepta el mes en curso, porque caduca al final del mes', () => {
    const ahora = new Date()
    const mes = `${ahora.getMonth() + 1}`.padStart(2, '0')

    expect(validateExpiry(`${mes}/${`${ahora.getFullYear()}`.slice(2)}`)).toBe(true)
  })

  it('rechaza un mes pasado', () => {
    expect(validateExpiry('01/20')).toBe(false)
  })

  it('rechaza un mes que no existe', () => {
    expect(validateExpiry('13/30')).toBe(false)
  })

  it('rechaza un mes de un solo dígito, que se presta a confusiones', () => {
    expect(validateExpiry('1/30')).toBe(false)
  })

  it('rechaza un formato que no es mes/año', () => {
    expect(validateExpiry('2030-12')).toBe(false)
    expect(validateExpiry('diciembre')).toBe(false)
  })
})

describe('validateCvv', () => {
  it('acepta tres dígitos, que es lo de Visa y Mastercard', () => {
    expect(validateCvv('123')).toBe(true)
  })

  it('rechaza cuatro dígitos', () => {
    expect(validateCvv('1234')).toBe(false)
  })

  it('rechaza dos dígitos', () => {
    expect(validateCvv('12')).toBe(false)
  })

  it('rechaza letras', () => {
    expect(validateCvv('12a')).toBe(false)
  })
})
