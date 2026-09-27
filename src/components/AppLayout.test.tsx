import { jest, describe, expect, it, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { createTestStore } from '../app/store'
import { httpClient } from '../app/api/httpClient'
import { ApiError } from '../app/api/ApiError'
import { hydrateCart } from '../features/cart/cartSlice'
import type { CartItem } from '../features/cart/types'

jest.mock('../app/api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))

const get = jest.mocked(httpClient.get)
const post = jest.mocked(httpClient.post)

const sesion = {
  accessToken: 'token-1',
  accessTokenExpiresIn: 900,
  csrfToken: 'csrf-1',
  user: {
    id: 'user-1',
    email: 'persona@ejemplo.com',
    fullName: 'Persona Registrada',
    role: 'CUSTOMER',
    isEmailVerified: true,
  },
}

const montar = (items: CartItem[] = [], storePrevio = createTestStore()) => {
  const store = storePrevio

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
  describe('sesión', () => {
    beforeEach(() => {
      post.mockReset()
    })

    it('recupera la sesión al montar, sin que la persona tenga que hacer nada', async () => {
      post.mockResolvedValue(sesion)
      const { store } = montar()

      await waitFor(() => {
        expect(store.getState().auth.accessToken).toBe('token-1')
      })
    })

    it('pide la sesión una sola vez aunque el layout se vuelva a montar', async () => {
      post.mockResolvedValue(sesion)
      const { store } = montar()
      await waitFor(() => expect(store.getState().auth.accessToken).toBe('token-1'))

      post.mockClear()
      montar([], store)

      expect(post).not.toHaveBeenCalled()
    })

    it('abre en modo invitado si no hay sesión, sin enseñar un error', async () => {
      post.mockRejectedValue(new ApiError('La sesión no es válida o ha caducado', 401))
      const { store } = montar()

      await waitFor(() => {
        expect(store.getState().auth.status).toBe('anonima')
      })

      expect(store.getState().auth.error).toBeNull()
    })

    it('no rompe la app si la red falla al recuperar la sesión', async () => {
      post.mockRejectedValue(new ApiError('No se pudo conectar con el servidor', 0))
      const { store } = montar()

      await waitFor(() => {
        expect(store.getState().auth.status).toBe('anonima')
      })
    })

    it('el token recuperado no se escribe en localStorage', async () => {
      post.mockResolvedValue(sesion)
      const { store } = montar()
      await waitFor(() => expect(store.getState().auth.accessToken).toBe('token-1'))

      const propias = Object.keys(window.localStorage).filter((clave) => clave !== 'bruma.cart')

      expect(propias).toHaveLength(0)
    })
  })

  describe('acceso a la cuenta', () => {
    beforeEach(() => {
      post.mockReset()
    })

    it('ofrece entrar cuando no hay sesión', () => {
      post.mockResolvedValue(undefined)
      montar()

      expect(screen.getByRole('link', { name: /iniciar sesi[oó]n/i })).toBeInTheDocument()
    })

    it('ofrece la cuenta cuando hay sesión, y no ofrece entrar', async () => {
      post.mockResolvedValue(sesion)
      const { store } = montar()

      // La sesión se recupera de forma asíncrona, así que la barra cambia sola
      // un instante después de montarse.
      expect(await screen.findByRole('link', { name: /mi cuenta/i })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /iniciar sesi[oó]n/i })).toBeNull()
      expect(store.getState().auth.status).toBe('autenticada')
    })
  })
})
