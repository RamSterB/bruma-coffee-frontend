import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { coffeeSlice } from '../features/coffee/coffeeSlice'

export const rootReducer = combineSlices(coffeeSlice)

export const createStore = (preloadedState?: Partial<ReturnType<typeof rootReducer>>) =>
  configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as ReturnType<typeof rootReducer> | undefined,
  })

export const createTestStore = () => createStore()

export const store = createStore()

export type AppStore = ReturnType<typeof createStore>
export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = AppStore['dispatch']
