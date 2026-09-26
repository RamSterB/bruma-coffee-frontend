import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { ApiError } from '../../app/api/ApiError'
import { httpClient } from '../../app/api/httpClient'
import type { Coffee } from './types'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface CoffeeDetailState {
  item: Coffee | null
  loading: boolean
  error: string | null
  notFound: boolean
}

const initialState: CoffeeDetailState = {
  item: null,
  loading: false,
  error: null,
  notFound: false,
}

const NOT_FOUND_MESSAGE = 'No se encontró el café solicitado'
const UNEXPECTED_MESSAGE = 'No se pudo cargar el café'

/**
 * Un 404 no es un fallo: es un resultado válido que la ficha debe saber
 * distinguir para mostrar su mensaje propio en vez de un error genérico.
 */
const toRejection = (error: unknown): { message: string; notFound: boolean } => {
  if (error instanceof ApiError) {
    return error.status === 404
      ? { message: error.message || NOT_FOUND_MESSAGE, notFound: true }
      : { message: error.message, notFound: false }
  }

  return { message: UNEXPECTED_MESSAGE, notFound: false }
}

export const fetchCoffeeById = createAsyncThunk<
  Coffee,
  string,
  { rejectValue: { message: string; notFound: boolean } }
>('coffeeDetail/fetchById', async (id, { rejectWithValue }) => {
  try {
    return await httpClient.get<Coffee>(`/coffee/${id}`)
  } catch (error) {
    return rejectWithValue(toRejection(error))
  }
})

export const coffeeDetailSlice = createSlice({
  name: 'coffeeDetail',
  initialState,
  reducers: {
    clearDetail: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCoffeeById.pending, (state) => {
        state.loading = true
        state.error = null
        state.notFound = false
      })
      .addCase(fetchCoffeeById.fulfilled, (state, action: PayloadAction<Coffee>) => {
        state.loading = false
        state.item = action.payload
        state.error = null
        state.notFound = false
      })
      .addCase(fetchCoffeeById.rejected, (state, action) => {
        state.loading = false
        state.item = null
        state.notFound = action.payload?.notFound ?? false
        // un 404 no es un error: la ficha lo muestra como "no encontrado"
        state.error = state.notFound ? null : action.payload?.message ?? UNEXPECTED_MESSAGE
      })
  },
})

export const { clearDetail } = coffeeDetailSlice.actions

export const coffeeDetailReducer = coffeeDetailSlice.reducer
