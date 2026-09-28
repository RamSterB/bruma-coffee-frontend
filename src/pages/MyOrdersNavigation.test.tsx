import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from '../app/AppRoutes'
import { createTestStore, type AppStore } from '../app/store'
import { sesionRestaurada, type Sesion } from '../features/auth/authSlice'
import { httpClient } from '../app/api/httpClient'

jest.mock('../app/api/httpClient', () => ({
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

const montar = (store: AppStore) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/cuenta']}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>,
  )

describe('el camino para llegar al historial', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    // El layout recupera la sesión al montar. Sin esto respondería que no hay ninguna y
    // dejaría la cuenta en modo invitado, que es un camino que esta prueba no quiere.
    post.mockResolvedValue(SESION as never)
    get.mockResolvedValue([
      {
        id: 'o1',
        orderNumber: 'BC-20260920-0001',
        status: 'PAID',
        paymentStatus: 'APPROVED',
        total: 59980,
        createdAt: '2026-09-20T10:00:00.000Z',
        items: [
          {
            variantId: 'v1',
            coffeeName: 'Caturra',
            weightGrams: 250,
            quantity: 1,
            lineTotal: 42000,
          },
        ],
      },
    ] as never)
  })

  it('desde la cuenta se llega a las ordenes, y la cuenta se queda atras', async () => {
    const store = createTestStore({ auth: undefined })
    store.dispatch(sesionRestaurada(SESION))
    montar(store)

    // La ruta llega en su trozo a demanda, asi que el enlace aparece un instante
    // despues. Esperarlo no es un rodeo: es el comportamiento que acabamos de anadir.
    const enlace = await screen.findByRole('link', { name: /mis órdenes/i })

    await userEvent.click(enlace)

    // Dos rutas de verdad, no dos pantallas montadas a la vez: si esto pasara con la
    // cuenta siempre en el DOM, el clic no estaría probando nada.
    expect(await screen.findByRole('heading', { name: /mis órdenes/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /mi cuenta/i })).toBeNull()
    expect(await screen.findByText('BC-20260920-0001')).toBeInTheDocument()
  })

  it('el enlace existe en la pagina de la cuenta, y la pagina de la cuenta no se queda a medias', async () => {
    const store = createTestStore({ auth: undefined })
    store.dispatch(sesionRestaurada(SESION))
    montar(store)

    await screen.findByRole('link', { name: /mis órdenes/i })

    // El indicador de carga tiene que desaparecer: si se queda, la pantalla esta a
    // medias y parece que la cuenta no carga.
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('la URL es la de /mis-ordenes, no una pantalla que solo se vea mientras se navega', async () => {
    const store = createTestStore({ auth: undefined })
    store.dispatch(sesionRestaurada(SESION))
    montar(store)

    // La ruta llega en su trozo a demanda, asi que el enlace aparece un instante
    // despues. Esperarlo no es un rodeo: es el comportamiento que acabamos de anadir.
    const enlace = await screen.findByRole('link', { name: /mis órdenes/i })

    await userEvent.click(enlace)

    // Sin recargar: la ruta existe de verdad en el enrutador.
    await waitFor(() => expect(get).toHaveBeenCalledWith('/orders', { token: 'token-1' }))
  })
})
