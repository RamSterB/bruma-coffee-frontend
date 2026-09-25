import { render, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../app/api/ApiError'
import { httpClient } from '../../app/api/httpClient'
import { createTestStore } from '../../app/store'
import { chooseOption } from '../../test/mui'
import { CoffeeList } from './CoffeeList'
import type { Coffee, PaginatedCoffees } from './types'

vi.mock('../../app/api/httpClient', () => ({
  httpClient: { get: vi.fn() },
}))

const getMock = vi.mocked(httpClient.get)

const buildCoffee = (id: string, name: string): Coffee => ({
  id,
  name,
  description: 'Lote de altura del sur de Huila.',
  roastLevel: 'light',
  process: 'washed',
  region: 'huila',
  tastingNotes: ['jasmín'],
  priceFrom: 48000,
  variants: [{ id: `${id}-v`, weightGrams: 250, price: 48000, stock: 10, isActive: true }],
  createdAt: '2026-09-25T00:00:00.000Z',
  updatedAt: '2026-09-25T00:00:00.000Z',
})

const buildPage = (overrides: Partial<PaginatedCoffees> = {}): PaginatedCoffees => ({
  items: [buildCoffee('cafe-1', 'Geisha del Huila'), buildCoffee('cafe-2', 'Sidra de Nariño')],
  total: 2,
  page: 1,
  limit: 12,
  totalPages: 1,
  ...overrides,
})

const renderList = () =>
  render(
    <Provider store={createTestStore()}>
      <CoffeeList />
    </Provider>,
  )

/** Deja la primera petición en curso para poder observar el estado de carga. */
const pendingRequest = () => {
  let resolve: (value: PaginatedCoffees) => void = () => undefined
  getMock.mockReturnValue(
    new Promise((done) => {
      resolve = done
    }),
  )

  return () => resolve(buildPage())
}

describe('CoffeeList', () => {
  beforeEach(() => {
    getMock.mockReset()
  })

  it('pide la primera página al montar', () => {
    getMock.mockResolvedValue(buildPage())

    renderList()

    expect(getMock).toHaveBeenCalledWith('/coffee?page=1&limit=12')
  })

  it('muestra un Backdrop con indicador mientras carga', () => {
    pendingRequest()

    renderList()

    expect(screen.getByTestId('catalog-backdrop')).toBeVisible()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByText('Cargando cafés')).toBeInTheDocument()
  })

  it('cierra el Backdrop cuando la carga termina', async () => {
    const finish = pendingRequest()
    renderList()

    finish()

    expect(await screen.findByRole('heading', { name: 'Geisha del Huila' })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByTestId('catalog-backdrop')).not.toBeVisible(),
    )
  })

  it('mantiene la grilla visible detrás del Backdrop al cambiar de filtro', async () => {
    getMock.mockResolvedValueOnce(buildPage())
    renderList()
    await screen.findByRole('heading', { name: 'Geisha del Huila' })

    getMock.mockReturnValueOnce(new Promise(() => undefined))
    await chooseOption('Región', 'Nariño')

    expect(screen.getByTestId('catalog-backdrop')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Sidra de Nariño' })).toBeInTheDocument()
  })

  it('muestra un café por tarjeta', async () => {
    getMock.mockResolvedValue(buildPage())

    renderList()

    expect(await screen.findByRole('heading', { name: 'Geisha del Huila' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sidra de Nariño' })).toBeInTheDocument()
  })

  it('muestra los filtros y las tarjetas a la vez', async () => {
    getMock.mockResolvedValue(buildPage())

    renderList()

    expect(await screen.findByLabelText('Región')).toBeInTheDocument()
    expect(screen.getByLabelText('Buscar')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Geisha del Huila' })).toBeInTheDocument()
  })

  it('avisa un estado vacío cuando no hay cafés', async () => {
    getMock.mockResolvedValue(buildPage({ items: [], total: 0, totalPages: 0 }))

    renderList()

    expect(await screen.findByText(/no hay cafés/i)).toBeInTheDocument()
  })

  it('abre el detalle del café en un diálogo con Backdrop', async () => {
    getMock.mockResolvedValue(buildPage())

    renderList()
    await userEvent.click(await screen.findByRole('button', { name: /detalle de Geisha del Huila/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Lote de altura del sur de Huila.')).toBeInTheDocument()
    expect(within(dialog).getByText('250 g')).toBeInTheDocument()
  })

  it('cierra el detalle con el botón de cerrar', async () => {
    getMock.mockResolvedValue(buildPage())
    renderList()
    await userEvent.click(await screen.findByRole('button', { name: /detalle de Geisha del Huila/i }))
    await screen.findByRole('dialog')

    await userEvent.click(screen.getByRole('button', { name: /cerrar/i }))

    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'))
  })

  it('cierra el detalle con la tecla Escape', async () => {
    getMock.mockResolvedValue(buildPage())
    renderList()
    await userEvent.click(await screen.findByRole('button', { name: /detalle de Geisha del Huila/i }))
    await screen.findByRole('dialog')

    await userEvent.keyboard('{Escape}')

    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'))
  })

  it('avisa un error y permite reintentar', async () => {
    getMock.mockRejectedValueOnce(new ApiError('No se pudo cargar el catálogo', 500))
    getMock.mockResolvedValueOnce(buildPage())
    renderList()

    expect(await screen.findByText('No se pudo cargar el catálogo')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }))

    expect(await screen.findByRole('heading', { name: 'Geisha del Huila' })).toBeInTheDocument()
  })
})
