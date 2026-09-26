import { jest, describe, expect, it } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { createTestStore } from '../app/store'
import { httpClient } from '../app/api/httpClient'
import { hydrateCart } from '../features/cart/cartSlice'
import type { CartItem } from '../features/cart/types'

jest.mock('../app/api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))

const get = jest.mocked(httpClient.get)

const montar = (items: CartItem[] = []) => {
  const store = createTestStore()

  if (items.length > 0) {
    store.dispatch(hydrateCart(items))
  }

  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<p>pagina de inicio</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    ),
  }
}

describe('AppLayout', () => {
  it('abre el cajón desde el icono del carrito', async () => {
    montar()

    await userEvent.click(screen.getByRole('button', { name: /carrito/i }))

    expect(await screen.findByText('Tu carrito')).toBeInTheDocument()
  })

  it('enseña cuántas unidades hay en el carrito', () => {
    montar([{ variantId: 'v1', quantity: 3 }])

    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('no enseña contador con el carrito vacío', () => {
    montar()

    expect(screen.queryByRole('button', { name: /carrito/i })).toHaveTextContent('')
  })

  it('pregunta por el carrito solo al abrirlo', async () => {
    montar([{ variantId: 'v1', quantity: 1 }])

    expect(get).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: /carrito/i }))

    expect(get).toHaveBeenCalledWith('/variants?variantIds=v1')
  })

  it('deja volver al catálogo desde el cajón', async () => {
    montar()

    await userEvent.click(screen.getByRole('button', { name: /carrito/i }))
    await userEvent.click(await screen.findByRole('link', { name: /ver cafés/i }))

    expect(screen.getByText('pagina de inicio')).toBeInTheDocument()
  })

  it('mantiene la barra de herramientas en todas las páginas', () => {
    montar()

    expect(screen.getByRole('button', { name: /carrito/i })).toBeInTheDocument()
  })
})
