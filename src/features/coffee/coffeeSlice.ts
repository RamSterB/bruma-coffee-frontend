import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { ApiError } from '../../app/api/ApiError'
import { httpClient } from '../../app/api/httpClient'

export interface Coffee {
  id: number
  name: string
  region: string
  price: number
}

export interface CoffeeState {
  items: Coffee[]
  loading: boolean
  error: string | null
}

const initialState: CoffeeState = {
  items: [],
  loading: false,
  error: null,
}

const toMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message
  }

  return 'Ocurrió un error inesperado'
}

export const fetchCoffees = createAsyncThunk<Coffee[], void, { state: { coffee: CoffeeState } }>(
  'coffee/fetchCoffees',
  async (_, { rejectWithValue }) => {
    try {
      return await httpClient.get<Coffee[]>('/coffee')
    } catch (error) {
      return rejectWithValue(toMessage(error))
    }
  },
  {
    condition: (_, { getState }) => !getState().coffee.loading,
  },
)

export const coffeeSlice = createSlice({
  name: 'coffee',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
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
        state.items = action.payload
      })
      .addCase(fetchCoffees.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string | undefined) ?? 'Error desconocido'
      })
  },
})

export const { clearError } = coffeeSlice.actions
