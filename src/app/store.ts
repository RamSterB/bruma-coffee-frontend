import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { coffeeSlice } from '../features/coffee/coffeeSlice'

export const rootReducer = combineSlices(coffeeSlice)

export const store = configureStore({
  reducer: rootReducer,
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch