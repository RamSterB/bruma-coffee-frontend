import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CoffeeCard } from './CoffeeCard'
import type { Coffee } from './types'

const coffee: Coffee = {
  id: 'cafe-1',
  name: 'Geisha del Huila',
  description: 'Lote de altura del sur de Huila.',
  roastLevel: 'light',
  process: 'washed',
  region: 'huila',
  tastingNotes: ['jasmín', 'bergamota'],
  priceFrom: 48000,
  variants: [
    { id: 'v-1', weightGrams: 250, price: 48000, stock: 24, isActive: true },
    { id: 'v-2', weightGrams: 500, price: 89000, stock: 0, isActive: true },
  ],
  createdAt: '2026-09-25T00:00:00.000Z',
  updatedAt: '2026-09-25T00:00:00.000Z',
}

describe('CoffeeCard', () => {
  it('muestra el nombre, la región y el proceso', () => {
    render(<CoffeeCard coffee={coffee} onOpen={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Geisha del Huila' })).toBeInTheDocument()
    expect(screen.getByText('huila')).toBeInTheDocument()
    expect(screen.getByText('washed')).toBeInTheDocument()
    expect(screen.getByText('light')).toBeInTheDocument()
  })

  it('muestra las notas de cata', () => {
    render(<CoffeeCard coffee={coffee} onOpen={vi.fn()} />)

    expect(screen.getByText('jasmín · bergamota')).toBeInTheDocument()
  })

  it('muestra el precio desde con el formato de Colombia', () => {
    render(<CoffeeCard coffee={coffee} onOpen={vi.fn()} />)

    expect(screen.getByText(/^Desde \$ ?48\.000$/)).toBeInTheDocument()
  })

  it('lista solo las variantes con stock y marca las agotadas', () => {
    render(<CoffeeCard coffee={coffee} onOpen={vi.fn()} />)

    expect(screen.getByText('250 g')).toBeInTheDocument()
    expect(screen.getByText('Agotado')).toBeInTheDocument()
  })

  it('no muestra precio cuando el café no tiene variantes disponibles', () => {
    render(<CoffeeCard coffee={{ ...coffee, priceFrom: null }} onOpen={vi.fn()} />)

    expect(screen.queryByText(/desde/i)).not.toBeInTheDocument()
  })
})
