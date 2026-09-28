import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../../components/AppLayout'
import { CoffeeList } from './CoffeeList'
import { createTestStore } from '../../app/store'
import { httpClient } from '../../app/api/httpClient'

jest.mock('../../app/api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))

const get = jest.mocked(httpClient.get)
const post = jest.mocked(httpClient.post)

const CAFE = {
  id: 'c1',
  name: 'Caturra',
  description: 'Un café suave',
  region: 'Huila',
  process: 'Lavado',
  roastLevel: 'MEDIUM',
  tastingNotes: ['Panela'],
  priceFrom: 42000,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  variants: [{ id: 'v1', weightGrams: 250, price: 42000, stock: 5, isActive: true }],
}

/**
 * El catálogo dentro del layout de verdad, porque el layout es quien tiene el modal de
 * pago. Con una ruta suelta el test pasaría sin comprobar nada: la pagina de marcador de
 * posicion no se declara como ruta real, asi que la navegacion no se notaria.
 */
const montar = () =>
  render(
    <Provider store={createTestStore()}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<CoffeeList />} />
            <Route path="/checkout" element={<p>la pagina de marcador de posicion</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  )

describe('pagar desde la vista rapida del catalogo', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    get.mockResolvedValue({ items: [CAFE], total: 1, page: 1, limit: 12, totalPages: 1 } as never)
  })

  it('abre el modal de pago, y no la pagina de marcador de posicion', async () => {
    montar()

    await userEvent.click(await screen.findByRole('button', { name: /caturra/i }))
    await userEvent.click(await screen.findByRole('button', { name: /pagar con tarjeta/i }))

    // Este es el fallo que reporto quien probo el despliegue: el boton se llevaba a
    // /checkout, una pagina de un incremento anterior que decia que el checkout
    // todavia no existia. El proceso entero vive en el modal, asi que desde el catalogo
    // tiene que abrir el modal, igual que desde la ficha.
    expect(screen.queryByText('la pagina de marcador de posicion')).toBeNull()
    expect(screen.getByRole('dialog', { name: /finalizar compra/i })).toBeInTheDocument()
  })

  it('el modal trae el primer paso del proceso: la tarjeta', async () => {
    montar()

    await userEvent.click(await screen.findByRole('button', { name: /caturra/i }))
    await userEvent.click(await screen.findByRole('button', { name: /pagar con tarjeta/i }))

    expect(await screen.findByLabelText(/n[uú]mero de tarjeta/i)).toBeInTheDocument()
  })
})
