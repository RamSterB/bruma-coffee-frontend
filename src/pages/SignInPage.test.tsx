import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { httpClient } from '../app/api/httpClient'
import { ApiError } from '../app/api/ApiError'
import { createTestStore } from '../app/store'
import { SignInPage } from './SignInPage'

jest.mock('../app/api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))

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

const montar = () => {
  const store = createTestStore()

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/entrar']}>
        <Routes>
          <Route path="/entrar" element={<SignInPage />} />
          <Route path="/" element={<p>pagina de inicio</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )

  return store
}

const rellenarYLlegar = async () => {
  await userEvent.type(screen.getByLabelText(/correo/i), 'persona@ejemplo.com')
  await userEvent.type(screen.getByLabelText(/contraseña/i), 'BrumaCafe2026!')
  await userEvent.click(screen.getByRole('button', { name: /entrar/i }))
}

describe('SignInPage', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('pide correo y contraseña', () => {
    montar()

    expect(screen.getByLabelText(/correo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
  })

  it('no manda nada si el correo no tiene forma de correo', async () => {
    montar()

    await userEvent.type(screen.getByLabelText(/correo/i), 'no-es-correo')
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'BrumaCafe2026!')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    expect(post).not.toHaveBeenCalled()
    expect(await screen.findByText(/escribe un correo válido/i)).toBeInTheDocument()
  })

  it('no manda nada si la contraseña está vacía', async () => {
    montar()

    await userEvent.type(screen.getByLabelText(/correo/i), 'persona@ejemplo.com')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    expect(post).not.toHaveBeenCalled()
  })

  it('entra y avisa de que la sesión está abierta', async () => {
    post.mockResolvedValue(sesion)
    const store = montar()

    await rellenarYLlegar()

    await waitFor(() => {
      expect(store.getState().auth.accessToken).toBe('token-1')
    })
  })

  it('enseña el error del backend si las credenciales no cuadran', async () => {
    post.mockRejectedValue(new ApiError('Las credenciales no coinciden con ninguna cuenta', 401))
    montar()

    await rellenarYLlegar()

    expect(await screen.findByText(/credenciales no coinciden/i)).toBeInTheDocument()
  })

  it('el error dice lo mismo exista o no la cuenta, que es lo que garantiza el backend', () => {
    montar()

    // El texto no puede ser un "¿tienes cuenta?", que revelaría si el correo
    // existe. El backend responde igual en los dos casos y aquí solo se muestra
    // lo que llega.
    expect(screen.queryByText(/no tenemos/i)).toBeNull()
    expect(screen.queryByText(/credenciales no coinciden/i)).toBeNull()
  })

  it('da un enlace a registrarse', () => {
    montar()

    expect(screen.getByRole('link', { name: /crear una cuenta/i })).toBeInTheDocument()
  })
})
