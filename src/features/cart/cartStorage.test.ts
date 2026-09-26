import { jest, beforeEach, describe, expect, it } from '@jest/globals'
import { CART_SCHEMA_VERSION, CART_STORAGE_KEY, loadCart, saveCart } from './cartStorage'

const almacenamientoFalso = (): Storage => {
  let datos: string | null = null

  return {
    getItem: jest.fn(() => datos),
    setItem: jest.fn((_clave: string, valor: string) => {
      datos = valor
    }),
    removeItem: jest.fn(() => {
      datos = null
    }),
    clear: jest.fn(() => {
      datos = null
    }),
    key: jest.fn(() => null),
    length: 1,
  } as unknown as Storage
}

describe('cartStorage', () => {
  let storage: Storage

  beforeEach(() => {
    storage = almacenamientoFalso()
  })

  it('guarda solo el id de la variante y la cantidad, con la versión del esquema', () => {
    saveCart([{ variantId: 'v1', quantity: 2 }], storage)

    expect(storage.setItem).toHaveBeenCalledWith(
      CART_STORAGE_KEY,
      JSON.stringify({ version: CART_SCHEMA_VERSION, items: [{ variantId: 'v1', quantity: 2 }] }),
    )
  })

  it('recupera lo que se guardó', () => {
    saveCart([{ variantId: 'v1', quantity: 2 }], storage)

    expect(loadCart(storage)).toEqual([{ variantId: 'v1', quantity: 2 }])
  })

  it('devuelve un carrito vacío si no hay nada guardado', () => {
    expect(loadCart(storage)).toEqual([])
  })

  it('descarta el contenido si el esquema es de otra versión', () => {
    storage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        version: CART_SCHEMA_VERSION + 1,
        items: [{ variantId: 'v1', quantity: 2 }],
      }),
    )

    expect(loadCart(storage)).toEqual([])
  })

  it('descarta el contenido si no es JSON válido', () => {
    storage.setItem(CART_STORAGE_KEY, 'esto no es json')

    expect(loadCart(storage)).toEqual([])
  })

  it('descarta las líneas con datos imposibles en vez de confiar en ellas', () => {
    storage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        version: CART_SCHEMA_VERSION,
        items: [
          { variantId: 'v1', quantity: 2 },
          { variantId: '', quantity: 1 },
          { variantId: 'v2', quantity: 0 },
          { variantId: 'v3', quantity: -4 },
          { variantId: 'v4', quantity: 1.5 },
          { variantId: 5, quantity: 1 },
          'no soy una linea',
        ],
      }),
    )

    expect(loadCart(storage)).toEqual([{ variantId: 'v1', quantity: 2 }])
  })

  it('funciona sin almacenamiento disponible, que es lo que pasa en modo privado', () => {
    const sinStorage = (() => {
      throw new Error('access denied')
    }) as unknown as Storage

    expect(loadCart(sinStorage)).toEqual([])
    expect(() => saveCart([{ variantId: 'v1', quantity: 1 }], sinStorage)).not.toThrow()
  })

  it('aguanta que el navegador lance al entregar el almacenamiento', () => {
    // Con cookies bloqueadas, leer `window.localStorage` ya lanza, antes de
    // poder probarlo como método. Sin esto, la tienda no arrancaba.
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('access denied')
      },
    })

    try {
      expect(loadCart()).toEqual([])
      expect(() => saveCart([{ variantId: 'v1', quantity: 1 }])).not.toThrow()
    } finally {
      if (original === undefined) {
        delete (window as { localStorage?: Storage }).localStorage
      } else {
        Object.defineProperty(window, 'localStorage', original)
      }
    }
  })
})
