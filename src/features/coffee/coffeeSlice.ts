import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface Coffee {
  id: number
  name: string
  region: string
  price: number
}

interface CoffeeState {
  items: Coffee[]
  loading: boolean
  error: string | null
}

const initialState: CoffeeState = {
  items: [],
  loading: false,
  error: null,
}

export const fetchCoffees = createAsyncThunk<Coffee[], void>('coffee/fetchCoffees', async () => {
  const response = await fetch('/api/coffee')

  if (!response.ok) {
    throw new Error(`Error al obtener cafés: ${response.status}`)
  }

  return (await response.json()) as Coffee[]
})

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
      .addCase(fetchCoffees.fulfilled, (state, action: PayloadAction<Coffee[]>) => {
        state.loading = false
        state.items = action.payload
      })
      .addCase(fetchCoffees.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Error desconocido'
      })
  },
})

export const { clearError } = coffeeSlice.actions