import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from '@jest/globals'
import { createTestStore } from '../../app/store'
import { CoffeeDetailDialog } from './CoffeeDetailDialog'
import type { Coffee } from './types'

const buildCoffee = (): Coffee => ({
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
})

const renderDialogo = (coffee: Coffee | null) =>
  render(
    <Provider store={createTestStore()}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={<CoffeeDetailDialog coffee={coffee} onClose={() => undefined} />}
          />
          <Route path="/cafe/:id" element={<p>ficha completa</p>} />
          <Route path="/checkout" element={<p>checkout</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )

describe('CoffeeDetailDialog', () => {
  it('no muestra nada cuando no hay café abierto', () => {
    renderDialogo(null)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('muestra el contenido de la ficha dentro del diálogo', () => {
    renderDialogo(buildCoffee())

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Lote de altura del sur de Huila.')).toBeInTheDocument()
    expect(screen.getByText('250 g')).toBeInTheDocument()
  })

  it('ofrece el selector de variante y el botón de comprar, igual que la ruta', () => {
    renderDialogo(buildCoffee())

    expect(screen.getByRole('radio', { name: /250 g/ })).toBeChecked()
    expect(screen.getByRole('button', { name: /comprar ahora/i })).toBeEnabled()
  })

  it('ofrece tambien agregar al carrito, igual que la ruta', () => {
    renderDialogo(buildCoffee())

    expect(screen.getByRole('button', { name: /agregar al carrito/i })).toBeEnabled()
  })

  it('enlaza con la ficha completa para quien quiere una URL compartible', () => {
    renderDialogo(buildCoffee())

    expect(screen.getByRole('link', { name: /ver ficha completa/i })).toHaveAttribute(
      'href',
      '/cafe/cafe-1',
    )
  })

  it('cierra al pulsar el botón de cerrar', async () => {
    const user = userEvent.setup()
    let cerrado = false

    render(
      <Provider store={createTestStore()}>
        <MemoryRouter>
          <CoffeeDetailDialog coffee={buildCoffee()} onClose={() => (cerrado = true)} />
        </MemoryRouter>
      </Provider>,
    )

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(cerrado).toBe(true)
  })
})
