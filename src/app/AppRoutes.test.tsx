import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { jest, beforeEach, describe, expect, it } from '@jest/globals'
import { AppRoutes } from './AppRoutes'
import { httpClient } from './api/httpClient'
import { createTestStore } from './store'
import type { Coffee, PaginatedCoffees } from '../features/coffee/types'

const renderAt = (path: string) =>
  render(
    <Provider store={createTestStore()}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>,
  )

jest.mock('./api/httpClient', () => ({
  httpClient: { get: jest.fn() },
}))

const getMock = jest.mocked(httpClient.get)

const cafe: Coffee = {
  id: 'cafe-1',
  name: 'Geisha del Huila',
  description: 'Lote de altura del sur de Huila.',
  roastLevel: 'light',
  process: 'washed',
  region: 'huila',
  tastingNotes: ['jasmín'],
  priceFrom: 48000,
  variants: [{ id: 'var-250', weightGrams: 250, price: 48000, stock: 10, isActive: true }],
  createdAt: '2026-09-26T00:00:00.000Z',
  updatedAt: '2026-09-26T00:00:00.000Z',
}

const paginaVacia: PaginatedCoffees = {
  items: [],
  total: 0,
  page: 1,
  limit: 12,
  totalPages: 0,
}

describe('AppRoutes', () => {
  beforeEach(() => {
    getMock.mockReset()
    // la portada pide el catálogo: sin respuesta, el listado revienta al leerla
    getMock.mockResolvedValue(paginaVacia)
  })

  it('muestra la marca en la página de inicio', () => {
    renderAt('/')

    expect(screen.getByRole('heading', { name: /bruma coffee/i })).toBeInTheDocument()
  })

  it('resuelve /cafe/:id a la ficha del café', async () => {
    getMock.mockResolvedValue(cafe)

    renderAt('/cafe/cafe-1')

    await waitFor(() => expect(getMock).toHaveBeenCalledWith('/coffee/cafe-1'))
    expect(await screen.findByRole('heading', { name: 'Geisha del Huila' })).toBeInTheDocument()
  })

  it('resuelve /checkout al marcador de posición', async () => {
    getMock.mockResolvedValue(cafe)

    renderAt('/checkout?coffee=cafe-1&variant=var-250')

    expect(
      await screen.findByText(/el checkout llega en un próximo incremento/i),
    ).toBeInTheDocument()
  })

  it('muestra un mensaje de página no encontrada en rutas desconocidas', () => {
    renderAt('/ruta-que-no-existe')

    expect(screen.getByRole('heading', { name: /no encontrada/i })).toBeInTheDocument()
  })

  it('tiene una ruta para entrar', async () => {
    renderAt('/entrar')

    expect(await screen.findByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('tiene una ruta para crear una cuenta', async () => {
    renderAt('/registro')

    expect(await screen.findByRole('button', { name: /crear cuenta/i })).toBeInTheDocument()
  })

  it('tiene una ruta para la cuenta', async () => {
    renderAt('/cuenta')

    expect(await screen.findByRole('heading', { name: /mi cuenta/i })).toBeInTheDocument()
  })
})
