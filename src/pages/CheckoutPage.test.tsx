import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../app/api/ApiError'
import { httpClient } from '../app/api/httpClient'
import { createTestStore } from '../app/store'
import { Provider } from 'react-redux'
import { CheckoutPage } from './CheckoutPage'
import type { Coffee } from '../features/coffee/types'

vi.mock('../app/api/httpClient', () => ({
  httpClient: { get: vi.fn() },
}))

const getMock = vi.mocked(httpClient.get)

const buildCoffee = (): Coffee => ({
  id: 'cafe-1',
  name: 'Geisha del Huila',
  description: 'Lote de altura del sur de Huila.',
  roastLevel: 'light',
  process: 'washed',
  region: 'huila',
  tastingNotes: ['jasmín'],
  priceFrom: 48000,
  variants: [
    { id: 'var-250', weightGrams: 250, price: 48000, stock: 10, isActive: true },
    { id: 'var-1000', weightGrams: 1000, price: 165000, stock: 0, isActive: true },
  ],
  createdAt: '2026-09-26T00:00:00.000Z',
  updatedAt: '2026-09-26T00:00:00.000Z',
})

const renderCheckout = (query: string) =>
  render(
    <Provider store={createTestStore()}>
      <MemoryRouter initialEntries={[`/checkout${query}`]}>
        <CheckoutPage />
      </MemoryRouter>
    </Provider>,
  )

describe('CheckoutPage', () => {
  beforeEach(() => {
    getMock.mockReset()
  })

  it('deja claro que el checkout todavía no está disponible', async () => {
    getMock.mockResolvedValue(buildCoffee())

    renderCheckout('?coffee=cafe-1&variant=var-250')

    expect(
      await screen.findByText(/el checkout llega en un próximo incremento/i),
    ).toBeInTheDocument()
  })

  it('muestra el café y la variante elegida para comprar', async () => {
    getMock.mockResolvedValue(buildCoffee())

    renderCheckout('?coffee=cafe-1&variant=var-1000')

    expect(await screen.findByRole('heading', { name: 'Geisha del Huila' })).toBeInTheDocument()
    expect(screen.getByText('1000 g')).toBeInTheDocument()
    expect(screen.getByText('$ 165.000')).toBeInTheDocument()
  })

  it('avisa cuando no sabe qué café comprar', async () => {
    renderCheckout('')

    expect(await screen.findByText(/no sabemos qué café quieres comprar/i)).toBeInTheDocument()
    expect(getMock).not.toHaveBeenCalled()
  })

  it('avisa cuando la variante no pertenece al café', async () => {
    getMock.mockResolvedValue(buildCoffee())

    renderCheckout('?coffee=cafe-1&variant=var-inexistente')

    expect(await screen.findByText(/esa variante no existe/i)).toBeInTheDocument()
  })

  it('avisa cuando el café ya no está en el catálogo', async () => {
    getMock.mockRejectedValue(new ApiError('No se encontró el café solicitado', 404))

    renderCheckout('?coffee=cafe-9&variant=var-250')

    expect(await screen.findByText(/ese café ya no está en el catálogo/i)).toBeInTheDocument()
  })
})
