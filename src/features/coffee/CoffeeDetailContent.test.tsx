import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from '@jest/globals'
import { createTestStore } from '../../app/store'
import { CoffeeDetailContent } from './CoffeeDetailContent'
import type { Coffee, CoffeeVariant } from './types'

const buildVariant = (overrides: Partial<CoffeeVariant> = {}): CoffeeVariant => ({
  id: 'var-250',
  weightGrams: 250,
  price: 48000,
  stock: 10,
  isActive: true,
  ...overrides,
})

const buildCoffee = (overrides: Partial<Coffee> = {}): Coffee => ({
  id: 'cafe-1',
  name: 'Geisha del Huila',
  description: 'Lote de altura del sur de Huila.',
  roastLevel: 'light',
  process: 'washed',
  region: 'huila',
  tastingNotes: ['jasmín', 'bergamota'],
  priceFrom: 48000,
  variants: [buildVariant()],
  createdAt: '2026-09-26T00:00:00.000Z',
  updatedAt: '2026-09-26T00:00:00.000Z',
  ...overrides,
})

/** Muestra la query de la ruta de checkout: es el contrato con el incremento F5. */
const DestinoDeCheckout = () => {
  const { search } = useLocation()

  return <p>pantalla de checkout{search}</p>
}

const renderDetalle = (coffee: Coffee) => {
  const store = createTestStore()

  const vista = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<CoffeeDetailContent coffee={coffee} />} />
          <Route path="/checkout" element={<DestinoDeCheckout />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )

  return { store, ...vista }
}

describe('CoffeeDetailContent', () => {
  it('muestra descripción, atributos y notas de cata', () => {
    renderDetalle(buildCoffee())

    expect(screen.getByText('Lote de altura del sur de Huila.')).toBeInTheDocument()
    expect(screen.getByText('huila')).toBeInTheDocument()
    expect(screen.getByText('washed')).toBeInTheDocument()
    expect(screen.getByText('light')).toBeInTheDocument()
    expect(screen.getByText('jasmín')).toBeInTheDocument()
    expect(screen.getByText('bergamota')).toBeInTheDocument()
  })

  it('lista todas las variantes con su peso, precio y disponibilidad', () => {
    renderDetalle(
      buildCoffee({
        variants: [
          buildVariant({ id: 'var-250', weightGrams: 250, price: 48000, stock: 10 }),
          buildVariant({ id: 'var-1000', weightGrams: 1000, price: 165000, stock: 3 }),
        ],
      }),
    )

    expect(screen.getByText('250 g')).toBeInTheDocument()
    expect(screen.getByText('1000 g')).toBeInTheDocument()
    expect(screen.getByText('$ 48.000')).toBeInTheDocument()
    expect(screen.getByText('$ 165.000')).toBeInTheDocument()
    expect(screen.getByText('10 disponibles')).toBeInTheDocument()
    expect(screen.getByText('3 disponibles')).toBeInTheDocument()
  })

  it('preselecciona la primera variante con stock para no pedir un clic extra', () => {
    renderDetalle(
      buildCoffee({
        variants: [
          buildVariant({ id: 'var-agotada', stock: 0 }),
          buildVariant({ id: 'var-500', weightGrams: 500 }),
        ],
      }),
    )

    expect(screen.getByRole('radio', { name: /500 g/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /agotado/i })).toBeDisabled()
  })

  it('no deja preseleccionar una variante agotada', () => {
    renderDetalle(buildCoffee({ variants: [buildVariant({ stock: 0 })] }))

    expect(screen.getByRole('radio', { name: /agotado/i })).not.toBeChecked()
    expect(screen.getByRole('button', { name: /pagar con tarjeta de cr[eé]dito/i })).toBeDisabled()
  })

  it('avisa cuando ninguna variante tiene stock', () => {
    renderDetalle(
      buildCoffee({
        variants: [
          buildVariant({ id: 'var-a', stock: 0 }),
          buildVariant({ id: 'var-b', stock: 0 }),
        ],
      }),
    )

    expect(screen.getByText(/no hay variantes disponibles/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pagar con tarjeta de cr[eé]dito/i })).toBeDisabled()
  })

  it('lleva al checkout con el café y la variante elegidas, sin crear la orden', async () => {
    const user = userEvent.setup()
    renderDetalle(
      buildCoffee({
        variants: [
          buildVariant({ id: 'var-250', weightGrams: 250 }),
          buildVariant({ id: 'var-1000', weightGrams: 1000 }),
        ],
      }),
    )

    await user.click(screen.getByRole('radio', { name: /1000 g/ }))
    await user.click(screen.getByRole('button', { name: /pagar con tarjeta de cr[eé]dito/i }))

    const destino = await screen.findByText(/pantalla de checkout/)
    expect(destino).toHaveTextContent('coffee=cafe-1')
    expect(destino).toHaveTextContent('variant=var-1000')
  })

  it('lleva la variante preseleccionada cuando el usuario no cambia nada', async () => {
    const user = userEvent.setup()
    renderDetalle(
      buildCoffee({
        variants: [
          buildVariant({ id: 'var-agotada', stock: 0 }),
          buildVariant({ id: 'var-500', weightGrams: 500 }),
        ],
      }),
    )

    await user.click(screen.getByRole('button', { name: /pagar con tarjeta de cr[eé]dito/i }))

    const destino = await screen.findByText(/pantalla de checkout/)
    expect(destino).toHaveTextContent('variant=var-500')
    expect(destino).not.toHaveTextContent('var-agotada')
  })

  it('omite la lista de notas cuando el café no tiene', () => {
    renderDetalle(buildCoffee({ tastingNotes: [] }))

    expect(screen.getByText('Lote de altura del sur de Huila.')).toBeInTheDocument()
    expect(screen.queryByText('jasmín')).not.toBeInTheDocument()
  })

  it('mete la variante preseleccionada en el carrito', async () => {
    const user = userEvent.setup()
    const { store } = renderDetalle(buildCoffee({ variants: [buildVariant({ id: 'var-250' })] }))

    await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))

    expect(store.getState().cart.items).toEqual([{ variantId: 'var-250', quantity: 1 }])
  })

  it('mete en el carrito la variante que el usuario elige', async () => {
    const user = userEvent.setup()
    const { store } = renderDetalle(
      buildCoffee({
        variants: [
          buildVariant({ id: 'var-250', weightGrams: 250 }),
          buildVariant({ id: 'var-1000', weightGrams: 1000 }),
        ],
      }),
    )

    await user.click(screen.getByRole('radio', { name: /1000 g/ }))
    await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))

    expect(store.getState().cart.items).toEqual([{ variantId: 'var-1000', quantity: 1 }])
  })

  it('acumula cantidad si se agrega la misma variante otra vez', async () => {
    const user = userEvent.setup()
    const { store } = renderDetalle(buildCoffee({ variants: [buildVariant({ id: 'var-250' })] }))

    await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))
    await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))

    expect(store.getState().cart.items).toEqual([{ variantId: 'var-250', quantity: 2 }])
  })

  it('no saca más unidades que el stock disponible', async () => {
    const user = userEvent.setup()
    const { store } = renderDetalle(
      buildCoffee({ variants: [buildVariant({ id: 'var-250', stock: 1 })] }),
    )

    await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))
    await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))

    expect(store.getState().cart.items).toEqual([{ variantId: 'var-250', quantity: 1 }])
  })

  it('confirma que la variante quedó en el carrito', async () => {
    const user = userEvent.setup()
    renderDetalle(buildCoffee())

    await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/añadido al carrito/i)
  })

  it('no deja agregar al carrito si no hay ninguna variante con stock', () => {
    renderDetalle(buildCoffee({ variants: [buildVariant({ stock: 0 })] }))

    expect(screen.getByRole('button', { name: /agregar al carrito/i })).toBeDisabled()
  })

  it('agregar al carrito no lleva al checkout', async () => {
    const user = userEvent.setup()
    renderDetalle(buildCoffee())

    await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))

    expect(screen.queryByText(/pantalla de checkout/)).not.toBeInTheDocument()
  })
})
