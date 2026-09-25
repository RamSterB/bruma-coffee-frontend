import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { ApiError } from '../../app/api/ApiError'
import { httpClient } from '../../app/api/httpClient'
import { buildCoffeeQuery } from './coffeeQuery'
import type { CoffeeFilters } from './coffeeQuery'
import type { Coffee, PaginatedCoffees } from './types'
import type { PayloadAction } from '@reduxjs/toolkit'

export const DEFAULT_LIMIT = 12

export interface CoffeeState {
  items: Coffee[]
  total: number
  page: number
  totalPages: number
  filters: CoffeeFilters
  loading: boolean
  error: string | null
}

const initialState: CoffeeState = {
  items: [],
  total: 0,
  page: 1,
  totalPages: 0,
  filters: {},
  loading: false,
  error: null,
}

const toMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message
  }

  return 'Ocurrió un error inesperado'
}

const currentFilters = (state: { coffee: CoffeeState }): CoffeeFilters => state.coffee.filters

export const fetchCoffees = createAsyncThunk<
  PaginatedCoffees,
  void,
  { state: { coffee: CoffeeState } }
>('coffee/fetchCoffees', async (_, { getState, rejectWithValue }) => {
  const filters = currentFilters(getState())

  try {
    return await httpClient.get<PaginatedCoffees>(
      `/coffee${buildCoffeeQuery({ ...filters, page: getState().coffee.page, limit: DEFAULT_LIMIT })}`,
    )
  } catch (error) {
    return rejectWithValue(toMessage(error))
  }
})

export const coffeeSlice = createSlice({
  name: 'coffee',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setFilters: (state, action: PayloadAction<CoffeeFilters>) => {
      state.filters = action.payload
      state.page = 1
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCoffees.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCoffees.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.items
        state.total = action.payload.total
        state.page = action.payload.page
        state.totalPages = action.payload.totalPages
      })
      .addCase(fetchCoffees.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string | undefined) ?? 'Error desconocido'
      })
  },
})

export const { clearError, setFilters, setPage } = coffeeSlice.actions
