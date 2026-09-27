import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { httpClient } from '../app/api/httpClient'
import { ApiError } from '../app/api/ApiError'
import { createTestStore } from '../app/store'
import { SignUpPage } from './SignUpPage'

jest.mock('../app/api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))

const post = jest.mocked(httpClient.post)

const montaje = {
  email: 'nueva@ejemplo.com',
  password: 'BrumaCafe2026!',
  fullName: 'Persona Registrada',
}

const montar = () => {
  const store = createTestStore()

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/registro']}>
        <Routes>
          <Route path="/registro" element={<SignUpPage />} />
          <Route path="/entrar" element={<p>pantalla de acceso</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )

  return store
}

const rellenar = async () => {
  await userEvent.type(screen.getByLabelText(/nombre/i), montaje.fullName)
  await userEvent.type(screen.getByLabelText(/correo/i), montaje.email)
  await userEvent.type(screen.getByLabelText(/contraseña/i), montaje.password)
  await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))
}

describe('SignUpPage', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('crea la cuenta y manda los tres campos', async () => {
    post.mockResolvedValue({ message: 'Si ese correo puede registrarse, recibiras un mensaje' })
    const store = montar()

    await rellenar()

    expect(post).toHaveBeenCalledWith('/auth/register', montaje)
    expect(store.getState().auth.accessToken).toBeNull()
  })

  it('avisa de que hay que revisar el correo, sin ofrecer verificar aquí', async () => {
    post.mockResolvedValue({ message: 'Si ese correo puede registrarse, recibiras un mensaje' })
    montar()

    await rellenar()

    expect(await screen.findByText(/revis[aá] tu correo/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /verificar/i })).toBeNull()
  })

  it('el aviso no dice que la cuenta se creó, para no revelar qué correos existen', async () => {
    post.mockResolvedValue({ message: 'Si ese correo puede registrarse, recibiras un mensaje' })
    montar()

    await rellenar()

    expect(screen.queryByText(/cuenta creada/i)).toBeNull()
  })

  it('da un enlace para iniciar sesión después de verificar', async () => {
    post.mockResolvedValue({ message: 'Si ese correo puede registrarse, recibiras un mensaje' })
    montar()

    await rellenar()

    expect(await screen.findByRole('link', { name: /inicia sesi[oó]n/i })).toBeInTheDocument()
  })

  it('enseña el error del servidor cuando el fallo es algo que el formulario no puede comprobar', async () => {
    post.mockRejectedValue(new ApiError('No se pudo conectar con el servidor', 0))
    montar()

    await rellenar()

    expect(await screen.findByText(/no se pudo conectar/i)).toBeInTheDocument()
  })

  it('no manda nada si la contraseña es corta, sin esperar al servidor', async () => {
    montar()

    await userEvent.type(screen.getByLabelText(/nombre/i), montaje.fullName)
    await userEvent.type(screen.getByLabelText(/correo/i), montaje.email)
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'corta')
    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))

    expect(post).not.toHaveBeenCalled()
  })
})
