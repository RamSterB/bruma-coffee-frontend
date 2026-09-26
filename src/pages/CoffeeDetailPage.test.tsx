import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { jest, beforeEach, describe, expect, it } from '@jest/globals'
import { ApiError } from '../app/api/ApiError'
import { httpClient } from '../app/api/httpClient'
import { createTestStore } from '../app/store'
import { CoffeeDetailPage } from './CoffeeDetailPage'
import type { Coffee } from '../features/coffee/types'

jest.mock('../app/api/httpClient', () => ({
  httpClient: { get: jest.fn() },
}))

const getMock = jest.mocked(httpClient.get)

const buildCoffee = (id = 'cafe-1'): Coffee => ({
  id,
  name: 'Geisha del Huila',
  description: 'Lote de altura del sur de Huila.',
  roastLevel: 'light',
  process: 'washed',
  region: 'huila',
  tastingNotes: ['jasmín'],
  priceFrom: 48000,
  variants: [{ id: `${id}-v`, weightGrams: 250, price: 48000, stock: 10, isActive: true }],
  createdAt: '2026-09-26T00:00:00.000Z',
  updatedAt: '2026-09-26T00:00:00.000Z',
})

const renderDetalle = (id = 'cafe-1') =>
  render(
    <Provider store={createTestStore()}>
      <MemoryRouter initialEntries={[`/cafe/${id}`]}>
        <Routes>
          <Route path="/cafe/:id" element={<CoffeeDetailPage />} />
          <Route path="/" element={<p>catálogo</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )

describe('CoffeeDetailPage', () => {
  beforeEach(() => {
    getMock.mockReset()
  })

  it('pide el café del id de la ruta', async () => {
    getMock.mockResolvedValue(buildCoffee('cafe-9'))

    renderDetalle('cafe-9')

    await waitForElementToBeRemoved(() => screen.queryByText(/cargando/i))
    expect(getMock).toHaveBeenCalledWith('/coffee/cafe-9')
  })

  it('muestra la ficha completa cuando la carga termina', async () => {
    getMock.mockResolvedValue(buildCoffee())

    renderDetalle()

    expect(await screen.findByRole('heading', { name: 'Geisha del Huila' })).toBeInTheDocument()
    expect(screen.getByText('Lote de altura del sur de Huila.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /comprar ahora/i })).toBeInTheDocument()
  })

  it('muestra un estado de carga mientras pide el café', () => {
    getMock.mockReturnValue(new Promise(() => undefined))

    renderDetalle()

    expect(screen.getByText(/cargando/i)).toBeInTheDocument()
  })

  it('muestra un 404 amigable y ofrece volver al catálogo si el café no existe', async () => {
    getMock.mockRejectedValue(new ApiError('No se encontró el café solicitado', 404))

    renderDetalle()

    expect(await screen.findByText(/no encontramos ese café/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /volver al catálogo/i })).toHaveAttribute('href', '/')
  })

  it('muestra un error reintentable cuando la falla no es un 404', async () => {
    getMock.mockRejectedValue(new ApiError('No se pudo conectar con el servidor', 0))

    renderDetalle()

    expect(await screen.findByText('No se pudo conectar con el servidor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
  })

  it('reintenta la carga cuando se pulsa reintentar', async () => {
    const user = userEvent.setup()
    getMock.mockRejectedValueOnce(new ApiError('No se pudo conectar con el servidor', 0))

    renderDetalle()

    const reintentar = await screen.findByRole('button', { name: /reintentar/i })
    getMock.mockResolvedValue(buildCoffee())
    await user.click(reintentar)

    expect(await screen.findByRole('heading', { name: 'Geisha del Huila' })).toBeInTheDocument()
    expect(getMock).toHaveBeenCalledTimes(2)
  })
})
