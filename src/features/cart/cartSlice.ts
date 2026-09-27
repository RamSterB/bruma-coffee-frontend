import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { ApiError } from '../../app/api/ApiError'
import { httpClient } from '../../app/api/httpClient'
import type { RootState } from '../../app/store'
import type { CartItem, CartLine, CartVariant } from './types'

export type CartStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface CartState {
  /** Lo único que se persiste: id de variante y cantidad. */
  items: CartItem[]
  /** `items` cruzado con el catálogo. No se persiste. */
  lines: CartLine[]
  status: CartStatus
  error: string | null
  notice: string | null
}

const initialState: CartState = {
  items: [],
  lines: [],
  status: 'idle',
  error: null,
  notice: null,
}

const UNEXPECTED_MESSAGE = 'No se pudo actualizar el carrito'

export interface ResolvedCart {
  /** Presente solo cuando hay sesión: entonces manda el servidor. */
  carritoDelServidor?: CartDelServidor
  variants: CartVariant[]
  /** Variantes cuya cantidad se redujo porque el stock ya no daba. */
  adjustments: string[]
  /** Variantes que la API no devolvió: ya no se pueden comprar. */
  removed: string[]
}

const clamp = (quantity: number, stock: number): number => Math.min(quantity, stock)

/**
 * Con qué variantes no se puede seguir comprando: las que la API no devolvió y
 * las que se quedaron sin stock. Una variante activa con stock cero sigue
 * viniendo en la respuesta, así que sin esta comprobación el carrito guardaría
 * una línea con cantidad cero y un subtotal de cero.
 */
const noSePuedeComprar = (variant: CartVariant | undefined): boolean =>
  variant === undefined || variant.stock === 0

/**
 * El cliente manda ids y cantidades, no precios. Resolver es la forma de que el
 * subtotal y el stock sean los del servidor en vez de lo que la persona recuerda
 * de la última visita.
 */
/**
 * Lo que devuelve el carrito del servidor. Es una línea por variante con el
 * precio y el stock ya resueltos, así que con sesión no hace falta preguntar al
 * catálogo: el servidor es la fuente y no hay dos verdades.
 */
export interface CartLineDelServidor {
  variantId: string
  coffeeId: string | null
  coffeeName: string | null
  weightGrams: number | null
  price: number
  stock: number
  quantity: number
  subtotal: number
  isPurchasable: boolean
}

export interface CartDelServidor {
  items: CartLineDelServidor[]
  subtotal: number
  totalItems: number
  purchasableItems: number
}

const conToken = (estado: RootState) =>
  estado.auth.accessToken === null ? {} : { token: estado.auth.accessToken }

const haySesion = (estado: RootState): boolean => estado.auth.status === 'autenticada'

/** Las líneas del servidor se convierten al mismo formato que pinta el cajón. */
const aLineas = (carrito: CartDelServidor): CartLine[] =>
  carrito.items.map((linea) => ({
    item: { variantId: linea.variantId, quantity: linea.quantity },
    variant: {
      variantId: linea.variantId,
      coffeeId: linea.coffeeId ?? '',
      coffeeName: linea.coffeeName ?? 'Café retirado',
      weightGrams: linea.weightGrams ?? 0,
      price: linea.price,
      stock: linea.stock,
      isActive: linea.isPurchasable,
    },
    subtotal: linea.subtotal,
    adjusted: false,
  }))

export const resolveCart = createAsyncThunk<
  ResolvedCart,
  void,
  { state: RootState; rejectValue: string }
>('cart/resolve', async (_void, { getState, rejectWithValue }) => {
  const estado = getState()

  if (haySesion(estado)) {
    try {
      const carrito = await httpClient.get<CartDelServidor>('/cart', conToken(estado))

      return { carritoDelServidor: carrito, variants: [], adjustments: [], removed: [] }
    } catch (error) {
      return rejectWithValue(error instanceof ApiError ? error.message : UNEXPECTED_MESSAGE)
    }
  }

  const items = estado.cart.items

  if (items.length === 0) {
    return { variants: [], adjustments: [], removed: [] }
  }

  const ids = [...new Set(items.map((item) => item.variantId))]

  try {
    const variants = await httpClient.get<CartVariant[]>(
      `/variants?variantIds=${encodeURIComponent(ids.join(','))}`,
    )

    const porId = new Map(variants.map((variant) => [variant.variantId, variant]))
    const adjustments = items
      .filter((item) => {
        const variant = porId.get(item.variantId)
        return variant !== undefined && variant.stock > 0 && item.quantity > variant.stock
      })
      .map((item) => item.variantId)

    const removed = items
      .filter((item) => noSePuedeComprar(porId.get(item.variantId)))
      .map((item) => item.variantId)

    return { variants, adjustments, removed }
  } catch (error) {
    return rejectWithValue(error instanceof ApiError ? error.message : UNEXPECTED_MESSAGE)
  }
})

interface AddItemPayload {
  variantId: string
  quantity: number
  stock: number
}

interface UpdateQuantityPayload {
  variantId: string
  quantity: number
  stock: number
}

/** Reemplaza las líneas cuando una resolución devuelve el mismo carrito. */
const withLines = (state: CartState, resolved: ResolvedCart): void => {
  const porId = new Map(resolved.variants.map((variant) => [variant.variantId, variant]))
  const ajustadas = new Set(resolved.adjustments)

  state.items = state.items
    .filter((item) => !noSePuedeComprar(porId.get(item.variantId)))
    .map((item) => ({ ...item, quantity: clamp(item.quantity, porId.get(item.variantId)!.stock) }))

  state.lines = state.items.flatMap((item) => {
    const variant = porId.get(item.variantId)

    if (variant === undefined) {
      return []
    }

    return [
      {
        item,
        variant,
        subtotal: variant.price * item.quantity,
        adjusted: ajustadas.has(item.variantId),
      },
    ]
  })
}

/**
 * Agregar al carrito. Sin sesión sigue siendo lo de siempre: se guarda en el
 * navegador y se resuelve contra el catálogo. Con sesión va contra el servidor,
 * que es quien corta la cantidad al stock y devuelve el precio.
 */
export const addToCart = createAsyncThunk<void, AddItemPayload, { state: RootState }>(
  'cart/add',
  async (datos, { dispatch, getState }) => {
    const estado = getState()

    if (!haySesion(estado)) {
      dispatch(cartSlice.actions.addItem(datos))
      await dispatch(resolveCart())

      return
    }

    const carrito = await httpClient.post<CartDelServidor>(
      '/cart/items',
      { variantId: datos.variantId, quantity: datos.quantity },
      conToken(estado),
    )

    dispatch(cartSlice.actions.delServidor(carrito))
  },
)

/** Cambiar la cantidad de una línea. Misma bifurcación que al agregar. */
export const changeQuantity = createAsyncThunk<void, UpdateQuantityPayload, { state: RootState }>(
  'cart/changeQuantity',
  async (datos, { dispatch, getState }) => {
    const estado = getState()

    if (!haySesion(estado)) {
      dispatch(cartSlice.actions.updateQuantity(datos))
      await dispatch(resolveCart())

      return
    }

    const carrito = await httpClient.patch<CartDelServidor>(
      `/cart/items/${datos.variantId}`,
      { quantity: datos.quantity },
      conToken(estado),
    )

    dispatch(cartSlice.actions.delServidor(carrito))
  },
)

export const removeFromCart = createAsyncThunk<void, string, { state: RootState }>(
  'cart/remove',
  async (variantId, { dispatch, getState }) => {
    const estado = getState()

    if (!haySesion(estado)) {
      dispatch(cartSlice.actions.removeItem(variantId))
      await dispatch(resolveCart())

      return
    }

    const carrito = await httpClient.delete<CartDelServidor>(
      `/cart/items/${variantId}`,
      conToken(estado),
    )

    dispatch(cartSlice.actions.delServidor(carrito))
  },
)

/**
 * El arranque de sesión. Se sube el carrito del navegador tal cual está: si el
 * servidor ya tenía uno, es él el que gana y lo que se sube se descarta entero.
 * Por eso la respuesta del servidor es la que se aplica y no la lista local, que
 * ya no describe lo que hay guardado.
 *
 * La cabecera CSRF es obligatoria aquí: el merge se apoya en la cookie de
 * sesión, y las cookies viajan solas, también si la petición la provoca otro
 * sitio.
 */
export const syncLocalCartOnSignIn = createAsyncThunk<void, void, { state: RootState }>(
  'cart/syncOnSignIn',
  async (_void, { dispatch, getState }) => {
    const estado = getState()
    const items = estado.cart.items

    if (!haySesion(estado)) {
      return
    }

    const carrito = await httpClient.post<CartDelServidor>(
      '/cart/merge',
      { items },
      { ...conToken(estado), csrf: true },
    )

    dispatch(cartSlice.actions.delServidor(carrito))
  },
)

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    hydrateCart: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload
      state.lines = []
      state.status = 'idle'
      state.error = null
      state.notice = null
    },
    addItem: (state, action: PayloadAction<AddItemPayload>) => {
      const { variantId, quantity, stock } = action.payload

      if (stock <= 0 || quantity <= 0) {
        return
      }

      const existente = state.items.find((item) => item.variantId === variantId)

      if (existente === undefined) {
        state.items.push({ variantId, quantity: clamp(quantity, stock) })
        return
      }

      existente.quantity = clamp(existente.quantity + quantity, stock)
    },
    updateQuantity: (state, action: PayloadAction<UpdateQuantityPayload>) => {
      const { variantId, quantity, stock } = action.payload
      const indice = state.items.findIndex((item) => item.variantId === variantId)

      if (indice === -1) {
        return
      }

      if (quantity <= 0) {
        state.items.splice(indice, 1)
        return
      }

      state.items[indice].quantity = clamp(quantity, stock)
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.variantId !== action.payload)
    },
    clearCart: (state) => {
      state.items = []
      state.lines = []
      state.notice = null
    },
    dismissNotice: (state) => {
      state.notice = null
    },
    /** El servidor contesta con el carrito entero: se sustituye todo por él. */
    delServidor: (state, action: PayloadAction<CartDelServidor>) => {
      state.items = action.payload.items.map((linea) => ({
        variantId: linea.variantId,
        quantity: linea.quantity,
      }))
      state.lines = aLineas(action.payload)
      state.status = 'ready'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(resolveCart.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(resolveCart.fulfilled, (state, action: PayloadAction<ResolvedCart>) => {
        state.status = 'ready'
        state.error = null

        if (action.payload.carritoDelServidor !== undefined) {
          cartSlice.caseReducers.delServidor(state, {
            ...action,
            payload: action.payload.carritoDelServidor,
          } as PayloadAction<CartDelServidor>)

          return
        }

        withLines(state, action.payload)

        if (action.payload.removed.length > 0) {
          state.notice = 'Se quitó del carrito una variante que ya no está disponible.'
        } else if (action.payload.adjustments.length > 0) {
          state.notice = 'Ajustamos las cantidades porque el stock cambió.'
        } else {
          state.notice = null
        }
      })
      .addCase(resolveCart.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.payload ?? UNEXPECTED_MESSAGE
      })
  },
})

export const { hydrateCart, addItem, updateQuantity, removeItem, clearCart, dismissNotice } =
  cartSlice.actions

export const cartReducer = cartSlice.reducer

export const selectCartCount = (state: RootState): number =>
  state.cart.items.reduce((total, item) => total + item.quantity, 0)

export const selectCartSubtotal = (state: RootState): number =>
  state.cart.lines.reduce((total, line) => total + line.subtotal, 0)

export const selectCartLines = (state: RootState): CartLine[] => state.cart.lines

export const selectCartIsEmpty = (state: RootState): boolean => state.cart.items.length === 0
