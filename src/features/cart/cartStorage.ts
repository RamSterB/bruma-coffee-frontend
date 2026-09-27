import type { CartItem } from './types'

/**
 * La versión viaja dentro del propio valor guardado. Si un dia cambia la forma
 * de una línea, el esquema viejo se descarta en lugar de intentar migrarlo a
 * medias: un carrito es algo que se rehace en un minuto, y un error de lectura
 * al arrancar deja la tienda inservible.
 */
export const CART_SCHEMA_VERSION = 1

export const CART_STORAGE_KEY = 'bruma.cart'

/**
 * Que leer o escribir falle no puede tumbar la app. En una pestaña en modo
 * privado o con cookies bloqueadas, `localStorage` lanza ya al acceder a la
 * propiedad, antes de poder escribir nada, así que el acceso va protegido también
 * y no solo las operaciones de lectura y escritura.
 */
const STORAGE_POR_DEFECTO = (): Storage | undefined => {
  if (typeof window === 'undefined') {
    return undefined
  }

  try {
    return window.localStorage
  } catch {
    return undefined
  }
}
const conStorage = <T>(
  operacion: (storage: Storage) => T,
  porDefecto: T,
  storage: Storage | undefined = STORAGE_POR_DEFECTO(),
): T => {
  if (storage === undefined) {
    return porDefecto
  }

  try {
    return operacion(storage)
  } catch {
    return porDefecto
  }
}

const esLineaValida = (valor: unknown): valor is CartItem => {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const { variantId, quantity } = valor as Partial<CartItem>

  return (
    typeof variantId === 'string' &&
    variantId !== '' &&
    typeof quantity === 'number' &&
    Number.isInteger(quantity) &&
    quantity > 0
  )
}

export const saveCart = (
  items: CartItem[],
  storage: Storage | undefined = STORAGE_POR_DEFECTO(),
): void => {
  conStorage(
    (destino) =>
      destino.setItem(CART_STORAGE_KEY, JSON.stringify({ version: CART_SCHEMA_VERSION, items })),
    undefined,
    storage,
  )
}

export const loadCart = (storage: Storage | undefined = STORAGE_POR_DEFECTO()): CartItem[] => {
  return conStorage<CartItem[]>(
    (origen) => {
      const bruto = origen.getItem(CART_STORAGE_KEY)

      if (bruto === null) {
        return []
      }

      const guardado: unknown = JSON.parse(bruto)

      if (
        typeof guardado !== 'object' ||
        guardado === null ||
        (guardado as { version?: unknown }).version !== CART_SCHEMA_VERSION
      ) {
        return []
      }

      const items = (guardado as { items?: unknown }).items

      if (!Array.isArray(items)) {
        return []
      }

      return items.filter(esLineaValida)
    },
    [],
    storage,
  )
}

/**
 * Borra el carrito guardado en el navegador. Se usa al abrir sesión, porque a
 * partir de ese momento el carrito es de la cuenta y no del navegador: si se
 * dejara, al cerrar sesión volvería a aparecer como si fuera de un invitado que
 * no lo ha hecho.
 */
export const clearSavedCart = (storage: Storage | undefined = STORAGE_POR_DEFECTO()): void => {
  conStorage((destino) => destino.removeItem(CART_STORAGE_KEY), undefined, storage)
}
