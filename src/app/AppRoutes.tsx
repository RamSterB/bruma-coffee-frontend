import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { CheckoutPage } from '../pages/CheckoutPage'
import { CoffeeDetailPage } from '../pages/CoffeeDetailPage'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { SignInPage } from '../pages/SignInPage'
import { SignUpPage } from '../pages/SignUpPage'
import { AccountPage } from '../pages/AccountPage'
import { MyOrdersPage } from '../pages/MyOrdersPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/cafe/:id" element={<CoffeeDetailPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/entrar" element={<SignInPage />} />
        <Route path="/registro" element={<SignUpPage />} />
        <Route path="/cuenta" element={<AccountPage />} />
        <Route path="/mis-ordenes" element={<MyOrdersPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
