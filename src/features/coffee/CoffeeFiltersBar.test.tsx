import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { jest, describe, expect, it } from '@jest/globals'
import { chooseOption } from '../../test/mui'
import { CoffeeFiltersBar } from './CoffeeFiltersBar'
import type { CoffeeFilters } from './coffeeQuery'

describe('CoffeeFiltersBar', () => {
  it('expone un control por cada dimensión de filtrado', () => {
    render(<CoffeeFiltersBar filters={{}} onChange={jest.fn()} onSearch={jest.fn()} />)

    expect(screen.getByLabelText('Región')).toBeInTheDocument()
    expect(screen.getByLabelText('Proceso')).toBeInTheDocument()
    expect(screen.getByLabelText('Tueste')).toBeInTheDocument()
    expect(screen.getByLabelText('Buscar')).toBeInTheDocument()
  })

  it('avisa la región elegida', async () => {
    const onChange = jest.fn()
    render(<CoffeeFiltersBar filters={{}} onChange={onChange} onSearch={jest.fn()} />)

    await chooseOption('Región', 'Nariño')

    expect(onChange).toHaveBeenCalledWith({ region: 'nariño' })
  })

  it('avisa el proceso y el tueste elegidos', async () => {
    const onChange = jest.fn()
    render(<CoffeeFiltersBar filters={{}} onChange={onChange} onSearch={jest.fn()} />)

    await chooseOption('Proceso', 'Natural')
    await chooseOption('Tueste', 'Claro')

    expect(onChange).toHaveBeenNthCalledWith(1, { process: 'natural' })
    expect(onChange).toHaveBeenNthCalledWith(2, { roastLevel: 'light' })
  })

  it('devuelve undefined al dejar un filtro en Todos para no mandarlo vacío', async () => {
    const onChange = jest.fn()
    const filters: CoffeeFilters = { region: 'huila' }
    render(<CoffeeFiltersBar filters={filters} onChange={onChange} onSearch={jest.fn()} />)

    await chooseOption('Región', 'Todas')

    expect(onChange).toHaveBeenCalledWith({ region: undefined })
  })

  it('publica la búsqueda al escribir y la limpia con el botón', async () => {
    const onSearch = jest.fn()

    // El tipo se infiere de la constante en lugar de escribirse como `useState<T>(...)`:
    // dentro de un `.tsx`, Babel no puede distinguir `useState<T>(x)` de una
    // comparación (`useState < T > (x)`) y compila la segunda. Con la constante
    // fuera, `useState` recibe el mismo tipo por inferencia y no hay ambigüedad.
    const sinFiltros: CoffeeFilters = {}

    const Harness = () => {
      const [filters, setFilters] = useState(sinFiltros)

      return (
        <CoffeeFiltersBar
          filters={filters}
          onChange={setFilters}
          onSearch={(search) => {
            onSearch(search)
            setFilters((current) => ({ ...current, search }))
          }}
        />
      )
    }

    render(<Harness />)

    await userEvent.type(screen.getByLabelText('Buscar'), 'geisha')
    expect(onSearch).toHaveBeenLastCalledWith('geisha')
    expect(screen.getByLabelText('Buscar')).toHaveValue('geisha')

    await userEvent.click(screen.getByRole('button', { name: /limpiar filtros/i }))

    expect(onSearch).toHaveBeenLastCalledWith('')
    expect(screen.getByLabelText('Buscar')).toHaveValue('')
  })

  it('muestra un botón para limpiar solo cuando hay algo puesto', () => {
    const { rerender } = render(
      <CoffeeFiltersBar filters={{}} onChange={jest.fn()} onSearch={jest.fn()} />,
    )
    expect(screen.queryByRole('button', { name: /limpiar/i })).not.toBeInTheDocument()

    rerender(
      <CoffeeFiltersBar filters={{ region: 'huila' }} onChange={jest.fn()} onSearch={jest.fn()} />,
    )
    expect(screen.getByRole('button', { name: /limpiar/i })).toBeInTheDocument()
  })
})
