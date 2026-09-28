import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { CoffeeDetailPage } from '../pages/CoffeeDetailPage'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { SignInPage } from '../pages/SignInPage'
import { SignUpPage } from '../pages/SignUpPage'
import { AccountPage } from '../pages/AccountPage'
import { MyOrdersPage } from '../pages/MyOrdersPage'
import { RutaPrivada, RutaPublica } from './RouteGuards'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
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
