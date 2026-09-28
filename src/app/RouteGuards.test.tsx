import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RutaPrivada } from './RouteGuards'
import { createTestStore, type AppStore } from './store'
import { sesionRestaurada, sesionNoRestaurada, type Sesion } from '../features/auth/authSlice'
import { httpClient } from './api/httpClient'

jest.mock('./api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))

const post = jest.mocked(httpClient.post)
const get = jest.mocked(httpClient.get)

const sesionConRol = (role: string): Sesion => ({
  accessToken: 'token-1',
  accessTokenExpiresIn: 900,
  csrfToken: 'csrf-1',
  user: {
    id: 'user-1',
    email: 'alguien@ejemplo.co',
    fullName: 'Persona',
    role,
    isEmailVerified: true,
  },
})

const montar = (store: AppStore, rolRequerido?: string) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/privada']}>
        <Routes>
          <Route
            path="/privada"
            element={
              <RutaPrivada rol={rolRequerido}>
                <p>contenido privado</p>
              </RutaPrivada>
            }
          />
          <Route path="/entrar" element={<p>la pantalla de acceso</p>} />
          <Route path="/" element={<p>la portada</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )

const conRol = (role: string) => {
  const store = createTestStore({ auth: undefined })
  store.dispatch(sesionRestaurada(sesionConRol(role)))

  return store
}

describe('una pantalla que pide un rol concreto', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    post.mockRejectedValue(new Error('sin cookie') as never)
    get.mockResolvedValue({ items: [] } as never)
  })

  it('con el rol, se ve', async () => {
    montar(conRol('ADMIN'), 'ADMIN')

    expect(await screen.findByText('contenido privado')).toBeInTheDocument()
  })

  it('sin el rol, va a entrar, y no a un "pagina no encontrada"', async () => {
    montar(conRol('CUSTOMER'), 'ADMIN')

    // Un 404 aqui seria peor que un acceso denegado: 404 dice que la pantalla no
    // existe, cuando lo que pasa es que existe y no es para esta persona. Y quien lo ve
    // no tiene forma de saber que hay que iniciar sesion con otra cuenta.
    await waitFor(() => expect(screen.getByText('la pantalla de acceso')).toBeInTheDocument())
    expect(screen.queryByText(/no encontrada|no encontrado|404/i)).toBeNull()
  })

  it('sin el rol, el contenido privado no llega a renderizarse ni un instante', async () => {
    montar(conRol('CUSTOMER'), 'ADMIN')

    // Un parpadeo del contenido antes de la redireccion revela que la pantalla existe.
    await waitFor(() => expect(screen.getByText('la pantalla de acceso')).toBeInTheDocument())
    expect(screen.queryByText('contenido privado')).toBeNull()
  })

  it('sin sesion, tambien a entrar, y no a un 404', async () => {
    // El estado "no hay sesion" es el que se sabe **despues** de preguntar al
    // servidor. El propio guard no dispara esa pregunta: la hace el layout, y montar la
    // guarda suelta no lo traeria. Aqui se parte del estado ya resuelto.
    const store = createTestStore({ auth: undefined })
    store.dispatch(sesionNoRestaurada())
    montar(store, 'ADMIN')

    expect(await screen.findByText('la pantalla de acceso')).toBeInTheDocument()
  })

  it('mientras no se sepa si hay sesion, no expulsa a nadie', async () => {
    montar(createTestStore({ auth: undefined }), 'ADMIN')

    // Ni al de rol ni sin el: todavia no se ha preguntado al servidor. Si esto
    // redirigiera, quien si tiene sesion caeria en la pantalla de acceso cada vez que
    // recarga, y el token de refresco no se usaria nunca.
    await waitFor(() => expect(get).not.toHaveBeenCalled())
    expect(screen.queryByText('la pantalla de acceso')).toBeNull()
    expect(screen.queryByText('contenido privado')).toBeNull()
  })

  it('sin rol, pide rol y no se queda en blanco para siempre', async () => {
    montar(conRol('CUSTOMER'), 'ADMIN')

    // Una guarda que no encuentra el rol y no hace nada deja la pantalla en blanco con
    // un 200: el peor resultado, porque parece que la pagina va bien y no va.
    await waitFor(() => expect(screen.getByText('la pantalla de acceso')).toBeInTheDocument())
    expect(screen.queryByText('contenido privado')).toBeNull()
  })
})
