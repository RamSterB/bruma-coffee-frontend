import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RutaPrivada, RutaPublica } from './RouteGuards'

/**
 * Cada pantalla viene en su trozo, y se pide cuando hace falta.
 *
 * **El motivo no es debytes, es de ancho de banda.** Quien abre la tienda para mirar un
 * café no tiene por qué bajarse el modal de pago con sus siete campos, la tarjeta
 * dibujada y la tokenización. Con las siete pantallas en el paquete inicial, mirar el
 * catalogo carga tambien el checkout entero.
 *
 * La de inicio y la de "no encontrada" **se quedan en el paquete inicial a proposito**:
 * son la primera pantalla y el fallo de cualquier ruta mal escrita, y si vinieran
 * tambien en un trozo, abrir la tienda tendria que esperar un round trip para poder
 * pintar siquiera el catalogo, y un 404 dejaria un hueco en blanco.
 *
 * El precio del trato es que una ruta puede llegar vacia. Por eso hay un `Suspense` con
 * un indicador, y cinco pruebas que comprueban que cada pantalla aparece al pedirla.
 */
const CoffeeDetailPage = lazy(async () => ({
  default: (await import('../pages/CoffeeDetailPage')).CoffeeDetailPage,
}))
const SignInPage = lazy(async () => ({
  default: (await import('../pages/SignInPage')).SignInPage,
}))
const SignUpPage = lazy(async () => ({
  default: (await import('../pages/SignUpPage')).SignUpPage,
}))
const AccountPage = lazy(async () => ({
  default: (await import('../pages/AccountPage')).AccountPage,
}))
const MyOrdersPage = lazy(async () => ({
  default: (await import('../pages/MyOrdersPage')).MyOrdersPage,
}))

export function AppRoutes() {
  return (
    <Routes>
      <Route
        element={
          <Suspense fallback={<p role="status">Cargando…</p>}>
            <AppLayout />
          </Suspense>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/cafe/:id" element={<CoffeeDetailPage />} />
        {/* Con sesión ya abierta, la pantalla de acceso y la de registro sobran. */}
        <Route
          path="/entrar"
          element={
            <RutaPublica>
              <SignInPage />
            </RutaPublica>
          }
        />
        <Route
          path="/registro"
          element={
            <RutaPublica>
              <SignUpPage />
            </RutaPublica>
          }
        />
        {/* Estas dos no se pueden ver sin sesión, ni aunque se escriba la dirección a mano. */}
        <Route
          path="/cuenta"
          element={
            <RutaPrivada>
              <AccountPage />
            </RutaPrivada>
          }
        />
        <Route
          path="/mis-ordenes"
          element={
            <RutaPrivada>
              <MyOrdersPage />
            </RutaPrivada>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
