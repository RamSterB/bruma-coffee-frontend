import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { httpClient } from '../../app/api/httpClient'
import type { RootState } from '../../app/store'

export interface OrderListLine {
  variantId: string
  coffeeName: string
  weightGrams: number | null
  quantity: number
  lineTotal: number
}

export interface OrderListItem {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  createdAt: string
  items: OrderListLine[]
}

export interface OrdersState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  items: OrderListItem[]
  error: string | null
}

const inicial: OrdersState = { status: 'idle', items: [], error: null }

/**
 * El historial de compras de la persona conectada.
 *
 * Los importes y los estados llegan enteros del backend y se enseñan tal cual. Aquí no
 * se calcula nada: una lista que recalculara el total en el navegador podría no
 * coincidir con lo que se cobró.
 */
export const fetchMyOrders = createAsyncThunk<
  OrderListItem[],
  void,
  { state: RootState; rejectValue: string }
>('orders/fetchMy', async (_void, { getState, rejectWithValue }) => {
  const estado = getState()

  if (estado.auth.status !== 'autenticada') {
    return rejectWithValue('Necesitas iniciar sesión para ver tus compras.')
  }

  try {
    // El token va aquí explícitamente: el cliente HTTP no lo busca en el store, y una
    // petición sin cabecera de autorización vuelve con 401 aunque haya sesión.
    return await httpClient.get<OrderListItem[]>('/orders', {
      token: estado.auth.accessToken ?? undefined,
    })
  } catch {
    return rejectWithValue('No pudimos cargar tus compras. Inténtalo otra vez.')
  }
})

const ordersSlice = createSlice({
  name: 'orders',
  initialState: inicial,
  reducers: {},
  extraReducers: (constructor) =>
    constructor
      .addCase(fetchMyOrders.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        state.status = 'ready'
        state.items = action.payload
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.payload ?? 'No pudimos cargar tus compras.'
      }),
})

export const ordersReducer = ordersSlice.reducer
export const selectOrders = (estado: RootState): OrdersState => estado.orders
