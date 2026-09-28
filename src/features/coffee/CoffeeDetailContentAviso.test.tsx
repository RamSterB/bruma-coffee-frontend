import { describe, expect, it, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { CoffeeDetailContent } from './CoffeeDetailContent'
import { createTestStore } from '../../app/store'
import type { Coffee } from './types'

const CAFE_AGOTADO: Coffee = {
  id: 'c1',
  name: 'Caturra',
  description: 'Un café suave',
  region: 'Huila',
  process: 'Lavado',
  roastLevel: 'MEDIUM',
  tastingNotes: ['Panela'],
  priceFrom: null,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  variants: [
    {
      id: 'v1',
      weightGrams: 250,
      price: 42000,
      stock: 0,
      isActive: true,
    },
  ],
}

/** El componente navega y despacha, así que necesita router y store de verdad. */
const montar = () =>
  render(
    <Provider store={createTestStore()}>
      <MemoryRouter>
        <CoffeeDetailContent coffee={CAFE_AGOTADO} onPagar={jest.fn()} />
      </MemoryRouter>
    </Provider>,
  )

describe('una ficha sin existencias', () => {
  it('lo dice de forma que un lector de pantalla lo entienda', () => {
    montar()

    // El mensaje va en rojo, y el rojo no lo lee nadie que no vea. Sin un rol que lo
    // anuncie, la persona que usa lector se queda con un cafe que parece disponible
    // y un boton que no hace nada.
    const aviso = screen.getByText(/no hay variantes disponibles/i)
    expect(aviso.closest('[role="alert"]')).not.toBeNull()
  })

  it('el aviso es un anuncio, no solo texto con color', () => {
    const { container } = montar()

    const alertas = container.querySelectorAll('[role="alert"]')
    expect(alertas).toHaveLength(1)
  })

  it('el boton de comprar dice que no se puede, y no solo parece inactivo', () => {
    montar()

    const boton = screen.getByRole('button', { name: /agregar al carrito/i })
    // Un boton deshabilitado se salta al tabular y no explica nada. Si esta
    // deshabilitado, quien no ve el aviso gris se queda pensando que no responde.
    expect(boton).toBeDisabled()
  })
})
