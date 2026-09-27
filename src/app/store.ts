import { combineSlices, configureStore, createListenerMiddleware } from '@reduxjs/toolkit'
import { cartReducer, hydrateCart as hydrateCartAction } from '../features/cart/cartSlice'
import { coffeeDetailSlice } from '../features/coffee/coffeeDetailSlice'
import { coffeeSlice } from '../features/coffee/coffeeSlice'
import { loadCart, saveCart } from '../features/cart/cartStorage'
import { authReducer, restoreSession, signIn } from '../features/auth/authSlice'
import { syncLocalCartOnSignIn } from '../features/cart/cartSlice'

export const rootReducer = combineSlices(coffeeSlice, coffeeDetailSlice, {
  cart: cartReducer,
  auth: authReducer,
})

/**
 * El carrito se hidrata dentro de `createStore`, no en un `useEffect` del
 * layout: si el primer render saliera con el carrito vacío, habría un parpadeo
 * y, peor, el guardado automático de ese primer render pisaría lo que había.
 *
 * Vive en la fábrica y no solo en el store de la app a propósito: cualquier
 * consumidor de `createStore` tiene el mismo comportamiento, y basta uno que se
 * salte la hidratación para que la persistencia parezca intermitente.
 */
const hydrateCart = (): { cart: ReturnType<typeof cartReducer> } | undefined => {
  const items = loadCart()

  if (items.length === 0) {
    return undefined
  }

  return {
    cart: cartReducer(undefined, { type: hydrateCartAction.type, payload: items }),
  }
}

/**
 * El carrito del navegador se sube al servidor **siempre** que la sesión pasa a
 * estar activa, venga de donde venga: del formulario de acceso o de la
 * recuperación silenciosa al recargar. Si se dejara en manos de quien llama, el
 * carrito local se quedaría en el navegador justo en el caso de recargar, que es
 * donde más se nota perderlo.
 *
 * Solo se dispara al pasar de no tener sesión a tenerla, para no reenviar el
 * carrito en cada acción de la sesión.
 */
type EstadoDeLaApp = ReturnType<typeof rootReducer>

const alEntrarEnSesion = createListenerMiddleware<EstadoDeLaApp>()

alEntrarEnSesion.startListening({
  matcher: (accion) => signIn.fulfilled.match(accion) || restoreSession.fulfilled.match(accion),
  effect: async (_accion, listenerApi) => {
    // Se mira el estado en el momento de dispatchear y no en el del listener:
    // cuando corre el efecto, la sesión ya está activa en el store, así que
    // compararlo con el estado previo no distinguiría "acaba de entrar" de
    // "ya estaba dentro".
    if (listenerApi.getState().auth.status !== 'autenticada') {
      return
    }

    await listenerApi.dispatch(syncLocalCartOnSignIn())
  },
})

export const createStore = (preloadedState?: Partial<ReturnType<typeof rootReducer>>) => {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: (preloadedState ?? hydrateCart()) as ReturnType<typeof rootReducer> | undefined,
    middleware: (getDefault) => getDefault().prepend(alEntrarEnSesion.middleware),
  })

  // Solo `items` se persiste. Las líneas cruzadas con el catálogo y los avisos
  // son de esta sesión: volver a guardarlos dejaría precios viejos guardados.
  let ultimoGuardado = JSON.stringify(store.getState().cart.items)

  store.subscribe(() => {
    const items = store.getState().cart.items
    const serializado = JSON.stringify(items)

    if (serializado !== ultimoGuardado) {
      ultimoGuardado = serializado
      saveCart(items)
    }
  })

  return store
}

/**
 * Los tests empiezan siempre desde un carrito vacío. Si hidrataran, un test que
 * escribe en `localStorage` se lo dejaría al siguiente del mismo fichero.
 */
export const createTestStore = (preloadedState?: Partial<ReturnType<typeof rootReducer>>) =>
  createStore(
    preloadedState ?? {
      cart: cartReducer(undefined, { type: 'desconocida' }),
    },
  )

export const store = createStore()

export type AppStore = ReturnType<typeof createStore>
export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = AppStore['dispatch']
