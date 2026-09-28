import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from './AppRoutes'
import { createTestStore, type AppStore } from './store'
import { sesionRestaurada, type Sesion } from '../features/auth/authSlice'
import { httpClient } from './api/httpClient'

jest.mock('./api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))

const get = jest.mocked(httpClient.get)
const post = jest.mocked(httpClient.post)

const SESION: Sesion = {
  accessToken: 'token-1',
  accessTokenExpiresIn: 900,
  csrfToken: 'csrf-1',
  user: {
    id: 'user-1',
    email: 'comprador@ejemplo.co',
    fullName: 'Persona Compradora',
    role: 'CUSTOMER',
    isEmailVerified: true,
  },
}

const montarEn = (ruta: string, store: AppStore) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[ruta]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>,
  )

const conSesion = () => {
  const store = createTestStore({ auth: undefined })
  store.dispatch(sesionRestaurada(SESION))

  return store
}

describe('cada ruta se carga cuando se pide', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    post.mockResolvedValue(SESION as never)
    get.mockResolvedValue({ items: [], total: 0, page: 1, limit: 12, totalPages: 0 } as never)
  })

  it('el historial aparece al pedirlo, aunque su codigo venga aparte', async () => {
    montarEn('/mis-ordenes', conSesion())

    // Las rutas se cargan bajo demanda para que el peso del checkout no caiga sobre
    // quien solo esta mirando el catalogo. El precio de eso es que una ruta puede
    // llegar vacia o romperse al pedirla, y el fallo aparece en el momento de navegar,
    // no en la carga inicial. Estas pruebas son la red de seguridad de ese trato.
    expect(await screen.findByRole('heading', { name: /mis órdenes/i })).toBeInTheDocument()
  })

  it('la ficha del cafe tambien', async () => {
    get.mockResolvedValue({
      id: 'c1',
      name: 'Caturra',
      description: 'Suave',
      region: 'Huila',
      process: 'Lavado',
      roastLevel: 'MEDIUM',
      tastingNotes: [],
      priceFrom: 42000,
      variants: [{ id: 'v1', weightGrams: 250, price: 42000, stock: 3, isActive: true }],
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    } as never)

    montarEn('/cafe/c1', createTestStore())

    expect(await screen.findByRole('heading', { name: /caturra/i })).toBeInTheDocument()
  })

  it('el acceso tambien, y con el formulario a la vista', async () => {
    montarEn('/entrar', createTestStore())

    expect(await screen.findByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('la cuenta con sesion, y sale de ahi con un clic', async () => {
    montarEn('/cuenta', conSesion())

    await userEvent.click(await screen.findByRole('link', { name: /mis órdenes/i }))

    expect(await screen.findByRole('heading', { name: /mis órdenes/i })).toBeInTheDocument()
  })

  it('una ruta que no existe sigue mostrando la pagina de "no encontrada"', async () => {
    montarEn('/no-existe', createTestStore())

    // El `catch-all` se queda en el bundle inicial a proposito: si no, el error de "no
    // encontrada" tardaria lo mismo que la pagina y habria un destello en blanco.
    expect(
      await screen.findByRole('heading', { name: /página no encontrada/i }),
    ).toBeInTheDocument()
  })
})
