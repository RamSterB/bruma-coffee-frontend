import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { CheckoutPage } from '../pages/CheckoutPage'
import { CoffeeDetailPage } from '../pages/CoffeeDetailPage'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/cafe/:id" element={<CoffeeDetailPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
