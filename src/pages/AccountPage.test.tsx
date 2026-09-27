import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { httpClient } from '../app/api/httpClient'
import { createTestStore, type AppStore } from '../app/store'
import { sesionRestaurada } from '../features/auth/authSlice'
import { AccountPage } from './AccountPage'

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

const montar = (store: AppStore = createTestStore()) => {
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/cuenta']}>
        <Routes>
          <Route path="/cuenta" element={<AccountPage />} />
          <Route path="/" element={<p>pagina de inicio</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )

  return store
}

describe('AccountPage', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('muestra el nombre y el correo de la sesión', () => {
    const store = createTestStore({ auth: undefined })
    store.dispatch(sesionRestaurada(sesion))

    montar(store)

    expect(screen.getByText('Persona Registrada')).toBeInTheDocument()
    expect(screen.getByText('persona@ejemplo.com')).toBeInTheDocument()
  })

  it('avisa cuando el correo todavía no está verificado', () => {
    const store = createTestStore({ auth: undefined })
    store.dispatch(
      sesionRestaurada({ ...sesion, user: { ...sesion.user, isEmailVerified: false } }),
    )

    montar(store)

    expect(screen.getByText(/correo.*verific/i)).toBeInTheDocument()
  })

  it('no avisa de verificación si el correo ya está verificado', () => {
    const store = createTestStore({ auth: undefined })
    store.dispatch(sesionRestaurada(sesion))

    montar(store)

    expect(screen.queryByText(/correo.*verific/i)).toBeNull()
  })

  it('cerrar sesión avisa al servidor y deja al usuario sin sesión', async () => {
    const store = createTestStore({ auth: undefined })
    store.dispatch(sesionRestaurada(sesion))
    post.mockResolvedValue({ message: 'Sesion cerrada' })
    montar(store)

    await userEvent.click(screen.getByRole('button', { name: /cerrar sesi[oó]n/i }))

    await waitFor(() => {
      expect(store.getState().auth.accessToken).toBeNull()
    })
    expect(post).toHaveBeenCalledWith('/auth/logout', undefined, { csrf: true })
  })

  it('cerrar sesión devuelve a la tienda, en vez de dejar una pantalla de cuenta muerta', async () => {
    const store = createTestStore({ auth: undefined })
    store.dispatch(sesionRestaurada(sesion))
    post.mockResolvedValue({ message: 'Sesion cerrada' })
    montar(store)

    await userEvent.click(screen.getByRole('button', { name: /cerrar sesi[oó]n/i }))

    expect(await screen.findByText('pagina de inicio')).toBeInTheDocument()
  })

  it('limpia la sesión aunque el servidor no responda, para no dejar un token vivo en memoria', async () => {
    const store = createTestStore({ auth: undefined })
    store.dispatch(sesionRestaurada(sesion))
    post.mockRejectedValue(new Error('sin red'))
    montar(store)

    await userEvent.click(screen.getByRole('button', { name: /cerrar sesi[oó]n/i }))

    await waitFor(() => {
      expect(store.getState().auth.accessToken).toBeNull()
    })
  })

  it('pide a la persona que entre si llega aquí sin sesión', () => {
    montar()

    expect(screen.getByRole('link', { name: /iniciar sesi[oó]n/i })).toBeInTheDocument()
  })
})
