import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { ApiError } from '../../app/api/ApiError'
import { httpClient } from '../../app/api/httpClient'
import type { RootState } from '../../app/store'

export interface SummaryLine {
  variantId: string
  coffeeName: string
  unitPrice: number
  quantity: number
  subtotal: number
}

/**
 * El desglose llega entero desde el backend. El frontend no calcula nada: si
 *calculara el IVA o el envío, cada visitante vería un total y el cobro sería otro.
 */
export interface OrderSummary {
  lines: SummaryLine[]
  subtotal: number
  tax: number
  shipping: number
  total: number
  isFreeShipping: boolean
}

export interface ShippingData {
  fullName: string
  documentNumber: string
  phone: string
  address: string
  city: string
  department: string
}

export interface ShippingQuote extends OrderSummary {
  shippingData: ShippingData
  persisted: boolean
}

export interface DepartmentOption {
  id: string
  name: string
}

export interface CityOption {
  id: string
  name: string
}

export type CheckoutStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface CheckoutState {
  summary: OrderSummary | null
  totalConfirmado: number | null
  datosDeEnvio: ShippingData | null
  departments: DepartmentOption[]
  cities: CityOption[]
  /** Con qué departamento se está eligiendo la ciudad, para no mezclar listas. */
  departmentSeleccionado: string | null
  status: CheckoutStatus
  error: string | null
}

const initialState: CheckoutState = {
  summary: null,
  totalConfirmado: null,
  datosDeEnvio: null,
  departments: [],
  cities: [],
  departmentSeleccionado: null,
  status: 'idle',
  error: null,
}

const mensaje = (error: unknown, porDefecto: string): string =>
  error instanceof ApiError ? error.message : porDefecto

export const fetchSummary = createAsyncThunk<
  OrderSummary,
  void,
  { state: RootState; rejectValue: string }
>('checkout/fetchSummary', async (_void, { getState, rejectWithValue }) => {
  const token = getState().auth.accessToken

  try {
    return await httpClient.get<OrderSummary>('/cart/summary', { token: token ?? undefined })
  } catch (error) {
    return rejectWithValue(mensaje(error, 'No se pudo cargar el resumen de la orden'))
  }
})

export const submitShipping = createAsyncThunk<
  ShippingQuote,
  ShippingData,
  { state: RootState; rejectValue: string }
>('checkout/submitShipping', async (datos, { getState, rejectWithValue }) => {
  const token = getState().auth.accessToken

  try {
    return await httpClient.post<ShippingQuote>('/cart/shipping-quote', datos, {
      token: token ?? undefined,
    })
  } catch (error) {
    return rejectWithValue(mensaje(error, 'No se pudieron validar los datos de entrega'))
  }
})

export const fetchDepartments = createAsyncThunk<DepartmentOption[], void, { rejectValue: string }>(
  'checkout/fetchDepartments',
  async (_void, { rejectWithValue }) => {
    try {
      // Sin token a propósito: la lista es pública y se pide antes de entrar.
      const respuesta = await httpClient.get<{ items: DepartmentOption[] }>(
        '/geography/departments',
      )

      // `?? []` porque la respuesta viene de la red y una forma inesperada no
      // puede dejar la página en blanco: un desplegable sin opciones se ve
      // vacío, y una pantalla en blanco no se ve nada.
      return respuesta.items ?? []
    } catch (error) {
      return rejectWithValue(mensaje(error, 'No se pudieron cargar los departamentos'))
    }
  },
)

export const fetchCities = createAsyncThunk<CityOption[], string, { rejectValue: string }>(
  'checkout/fetchCities',
  async (departmentId, { rejectWithValue }) => {
    try {
      const respuesta = await httpClient.get<{ items: CityOption[] }>(
        `/geography/departments/${departmentId}/cities`,
      )

      return respuesta.items ?? []
    } catch (error) {
      return rejectWithValue(mensaje(error, 'No se pudieron cargar las ciudades'))
    }
  },
)

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    reiniciarCheckout: (state) => {
      state.totalConfirmado = null
      state.datosDeEnvio = null
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSummary.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchSummary.fulfilled, (state, action) => {
        state.status = 'ready'
        state.summary = action.payload
        state.error = null
      })
      .addCase(fetchSummary.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.payload ?? 'No se pudo cargar el resumen de la orden'
      })
      .addCase(submitShipping.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(submitShipping.fulfilled, (state, action) => {
        state.status = 'ready'
        // El nombre de la ciudad es el del catálogo, no el que se escribió: la
        // respuesta es la fuente de verdad, igual que el precio.
        state.datosDeEnvio = action.payload.shippingData
        state.totalConfirmado = action.payload.total
        state.summary = {
          lines: action.payload.lines,
          subtotal: action.payload.subtotal,
          tax: action.payload.tax,
          shipping: action.payload.shipping,
          total: action.payload.total,
          isFreeShipping: action.payload.isFreeShipping,
        }
        state.error = null
      })
      .addCase(submitShipping.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.payload ?? 'No se pudieron validar los datos de entrega'
      })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.departments = action.payload
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.error = action.payload ?? 'No se pudieron cargar los departamentos'
      })
      .addCase(fetchCities.fulfilled, (state, action) => {
        state.cities = action.payload
      })
      .addCase(fetchCities.pending, (state, action) => {
        state.departmentSeleccionado = action.meta.arg
        state.cities = []
      })
      .addCase(fetchCities.rejected, (state, action) => {
        state.error = action.payload ?? 'No se pudieron cargar las ciudades'
      })
  },
})

export const { reiniciarCheckout } = checkoutSlice.actions

export const checkoutReducer = checkoutSlice.reducer

export const selectSummary = (state: RootState): OrderSummary | null => state.checkout.summary
export const selectDepartments = (state: RootState): DepartmentOption[] =>
  state.checkout.departments
export const selectCities = (state: RootState): CityOption[] => state.checkout.cities
export const selectDatosDeEnvio = (state: RootState): ShippingData | null =>
  state.checkout.datosDeEnvio
export const selectTotalConfirmado = (state: RootState): number | null =>
  state.checkout.totalConfirmado
