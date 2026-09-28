import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { httpClient } from '../../app/api/httpClient'
import { ApiError } from '../../app/api/ApiError'
import { tokenizeCard } from '../../lib/cardTokenization'
import type { CardFormValues } from '../checkout/CardForm'
import type { ShippingData } from '../checkout/checkoutSlice'
import type { RootState } from '../../app/store'

/**
 * Configuración pública de la pasarela, preguntada al backend en vez de leída de
 * una variable de compilación. Así hay una sola fuente: si el bundle se compiló con
 * la URL de un ambiente y el backend quedó en otro, el token se crearía en un sitio
 * y el cobro en otro, y nada fallaría hasta la conciliación. Además el mismo build
 * sirve para los dos ambientes, que es lo que hace falta al desplegar.
 */
export interface GatewayConfig {
  publicKey: string
  baseUrl: string
  environment: 'sandbox' | 'production' | null
}

export interface CreatedOrder {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  paymentReference: string
  /** La primera variante comprada, para poder volver a su ficha. */
  items?: { variantId: string }[]
}

export interface OrderStatus {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  delivery: { status: string; carrier: string | null; trackingCode: string | null } | null
}

export interface PaymentState {
  status: 'idle' | 'tokenizing' | 'creating' | 'waiting' | 'done' | 'error'
  order: CreatedOrder | null
  finalStatus: OrderStatus | null
  gateway: GatewayConfig | null
  /** Variante comprada, para el paso de volver al producto con el stock descontado. */
  purchasedVariantId: string | null
  error: string | null
}

const inicial: PaymentState = {
  status: 'idle',
  order: null,
  finalStatus: null,
  gateway: null,
  purchasedVariantId: null,
  error: null,
}

/**
 * Paga la compra: tokeniza la tarjeta en el navegador y luego pide la orden.
 *
 * El orden importa y no es un detalle. Tokenizar primero significa que si la
 * tarjeta es inválida, **no se crea ninguna orden**: quien escribe un número
 * equivocado no deja un pedido pendiente en el sistema ni genera un intento de
 * cobro que alguien tendrá que cancelar a mano.
 */
/** La configuración pública de la pasarela, cacheada en el store. */
export const fetchGatewayConfig = createAsyncThunk<GatewayConfig, void, { rejectValue: string }>(
  'payment/fetchGatewayConfig',
  async (_, { rejectWithValue }) => {
    try {
      return await httpClient.get<GatewayConfig>('/payments/config')
    } catch {
      return rejectWithValue('La tienda no pudo cargar la configuración de pago')
    }
  },
)

/**
 * El formulario pide el vencimiento como `MM/AA`, que es como lo escribe la gente.
 * La pasarela quiere el mes y el año por separado, y el año **con dos dígitos**:
 * mandar 2030 en vez de 30 es un 422, no un cobro.
 */
const partesDelVencimiento = (expiry: string): { expMonth: string; expYear: string } => {
  const [mes = '', anio = ''] = expiry.split('/')

  return { expMonth: mes.trim(), expYear: anio.trim().slice(-2) }
}

export const payOrder = createAsyncThunk<
  CreatedOrder,
  { card: CardFormValues; shipping: ShippingData; email: string; gateway: GatewayConfig },
  { state: RootState; rejectValue: string }
>('payment/payOrder', async ({ card, shipping, email, gateway }, { getState, rejectWithValue }) => {
  const tokenizado = await tokenizeCard(
    {
      number: card.number,
      ...partesDelVencimiento(card.expiry),
      cvc: card.cvv,
      holderName: card.holder,
    },
    gateway,
  )

  if (!tokenizado.ok) {
    return rejectWithValue(tokenizado.error)
  }

  // **La cabecera de sesión va aquí y no se puede quitar.** Crear la orden es la única
  // parte de la compra que necesita saber quién compra, y sin esta cabecera el backend
  // contesta que la sesión no vale y no se cobra nada. Se olvidó aquí porque el resto de
  // los thunks sí la pasaban, y las pruebas de unitarias no lo vieron porque
  // `httpClient` estaba simulado.
  const token = getState().auth.accessToken

  return httpClient.post<CreatedOrder>(
    '/orders',
    {
      cardToken: tokenizado.value,
      email,
      shipping,
    },
    { token: token ?? undefined },
  )
})

/**
 * Consulta el estado de la orden. El backend responde desde la orden, que es la
 * fuente de verdad: su estado se escribió en la misma transacción que el stock.
 */
export const fetchOrderStatus = createAsyncThunk<
  OrderStatus,
  string,
  { state: RootState; rejectValue: string }
>('payment/fetchOrderStatus', async (orderId, { getState, rejectWithValue }) => {
  try {
    // **La cabecera de sesión va aquí y no se puede quitar.** Consultar el estado de una
    // orden es leer datos de quien compró: sin cabecera el backend responde 401 y la
    // pantalla de resultado se queda en "confirmando tu pago" para siempre, aunque el
    // pago se haya aprobado a los pocos segundos.
    const token = getState().auth.accessToken

    return await httpClient.get<OrderStatus>(`/orders/${orderId}`, { token: token ?? undefined })
  } catch (error) {
    return rejectWithValue(
      error instanceof ApiError ? error.message : 'No pudimos consultar el estado de la compra',
    )
  }
})

const paymentSlice = createSlice({
  name: 'payment',
  initialState: inicial,
  reducers: {
    paymentReset: () => inicial,
  },
  extraReducers: (constructor) =>
    constructor
      .addCase(fetchGatewayConfig.fulfilled, (state, action) => {
        state.gateway = action.payload
      })
      .addCase(payOrder.pending, (state) => {
        state.status = 'tokenizing'
        state.error = null
      })
      .addCase(payOrder.fulfilled, (state, action) => {
        state.status = 'waiting'
        state.order = action.payload
        state.purchasedVariantId = action.payload.items?.[0]?.variantId ?? null
        state.error = null
      })
      .addCase(payOrder.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.payload ?? 'No pudimos procesar el pago'
      })
      .addCase(fetchOrderStatus.fulfilled, (state, action) => {
        state.finalStatus = action.payload
        state.status = 'done'
      })
      .addCase(fetchOrderStatus.rejected, (state, action) => {
        state.error = action.payload ?? 'No pudimos consultar el estado de la compra'
      }),
})

export const { paymentReset } = paymentSlice.actions
export const paymentReducer = paymentSlice.reducer
