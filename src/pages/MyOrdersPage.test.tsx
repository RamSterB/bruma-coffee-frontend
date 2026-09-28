import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { MyOrdersPage } from './MyOrdersPage'
import { createTestStore } from '../app/store'
import { sesionRestaurada, type Sesion } from '../features/auth/authSlice'
import { httpClient } from '../app/api/httpClient'
import { waitFor } from '@testing-library/react'

jest.mock('../app/api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))

const get = jest.mocked(httpClient.get)

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

const ORDENES = [
  {
    id: 'o2',
    orderNumber: 'BC-20260927-0002',
    status: 'PAID',
    paymentStatus: 'APPROVED',
    total: 131380,
    createdAt: '2026-09-27T15:30:00.000Z',
    items: [
      { variantId: 'v1', coffeeName: 'Caturra', weightGrams: 250, quantity: 3, lineTotal: 126000 },
    ],
  },
  {
    id: 'o1',
    orderNumber: 'BC-20260920-0001',
    status: 'PENDING',
    paymentStatus: 'PENDING',
    total: 59980,
    createdAt: '2026-09-20T10:00:00.000Z',
    items: [
      {
        variantId: 'v2',
        coffeeName: 'Pink Bourbon',
        weightGrams: 250,
        quantity: 1,
        lineTotal: 42000,
      },
    ],
  },
]

const montar = () => {
  const store = createTestStore({ auth: undefined })
  store.dispatch(sesionRestaurada(SESION))

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <MyOrdersPage />
      </MemoryRouter>
    </Provider>,
  )
}

describe('la pagina de mis ordenes', () => {
  beforeEach(() => {
    get.mockReset()
    get.mockResolvedValue(ORDENES as never)
  })

  it('pide las ordenes al backend al abrirse', async () => {
    montar()

    await waitFor(() => expect(get).toHaveBeenCalledWith('/orders'))
  })

  it('lista cada orden con su numero, su estado y su total', async () => {
    montar()

    expect(await screen.findByText('BC-20260927-0002')).toBeInTheDocument()
    expect(screen.getByText('BC-20260920-0001')).toBeInTheDocument()
    // El separador de miles y el espacio que pone el formateador no se fijan aquí a
    // mano: se comprueba el número, que es lo que importa, no la puntuación.
    expect(screen.getByText(/131\.380/)).toBeInTheDocument()
    expect(screen.getByText(/59\.980/)).toBeInTheDocument()
  })

  it('dice qué café lleva cada orden, no solo un número', async () => {
    montar()

    // Un historial con números y totales sin saber qué se pidió no sirve para nada.
    expect(await screen.findByText(/Caturra/)).toBeInTheDocument()
    expect(screen.getByText(/Pink Bourbon/)).toBeInTheDocument()
  })

  it('escribe el estado en palabras, y no solo el código', async () => {
    montar()

    expect(await screen.findByText('Pagada')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })

  it('la más reciente va la primera, que es la que se quiere ver', async () => {
    montar()

    const numeros = await screen.findAllByText(/^BC-/)
    expect(numeros[0]).toHaveTextContent('BC-20260927-0002')
  })

  it('convierte la fecha a algo legible, y no un ISO crudo', async () => {
    montar()

    await screen.findByText('BC-20260927-0002')
    expect(screen.queryByText(/2026-09-27T15:30:00/)).toBeNull()
    expect(screen.getByText('27 de septiembre de 2026')).toBeInTheDocument()
  })

  it('sin compras dice que no hay ninguna, en vez de una lista en blanco', async () => {
    get.mockResolvedValue([] as never)
    montar()

    // Una pantalla vacía sin explicación parece rota.
    expect(await screen.findByText(/todavia no has|ninguna compra|no tienes/i)).toBeInTheDocument()
  })

  it('si el backend falla, lo dice y ofrece reintentar', async () => {
    get.mockRejectedValue(new Error('sin red') as never)
    montar()

    expect(await screen.findByText(/no pudimos/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }))

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
  })

  it('sin sesión lleva a entrar, y no a una lista imposible', async () => {
    get.mockResolvedValue([] as never)
    const store = createTestStore({ auth: undefined })
    render(
      <Provider store={store}>
        <MemoryRouter>
          <MyOrdersPage />
        </MemoryRouter>
      </Provider>,
    )

    // Sin sesión el backend responde 401 y esta pantalla no puede pedir nada. A lo
    // que hay que llevar es a entrar, no a un error que no sabe explicar.
    expect(
      await screen.findByRole('link', { name: /iniciar sesi|iniciar sesi|entrar/i }),
    ).toBeInTheDocument()
  })
})
