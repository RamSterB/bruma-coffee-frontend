import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../app/api/ApiError'
import { httpClient } from '../../app/api/httpClient'
import { createTestStore } from '../../app/store'
import { CoffeeList } from './CoffeeList'

vi.mock('../../app/api/httpClient', () => ({
  httpClient: { get: vi.fn() },
}))

const getMock = vi.mocked(httpClient.get)

const renderList = () =>
  render(
    <Provider store={createTestStore()}>
      <CoffeeList />
    </Provider>,
  )

describe('CoffeeList', () => {
  beforeEach(() => {
    getMock.mockReset()
  })

  it('pide los cafés al montar', () => {
    getMock.mockResolvedValue([])

    renderList()

    expect(getMock).toHaveBeenCalledWith('/coffee')
  })

  it('muestra los cafés recibidos', async () => {
    getMock.mockResolvedValue([
      { id: 1, name: 'Geisha Huila', region: 'Huila', price: 28.5 },
      { id: 2, name: 'Caturra Nariño', region: 'Nariño', price: 22 },
    ])

    renderList()

    expect(await screen.findByText('Geisha Huila')).toBeInTheDocument()
    expect(screen.getByText('Caturra Nariño')).toBeInTheDocument()
  })

  it('muestra el precio con el formato de Colombia', async () => {
    getMock.mockResolvedValue([{ id: 1, name: 'Geisha Huila', region: 'Huila', price: 28500 }])

    renderList()

    // Intl usa un espacio duro entre el signo y el número: /\$\s* tolera ambos.
    expect(await screen.findByText(/\$\s*28\.500/)).toBeInTheDocument()
  })

  it('muestra el estado de carga mientras espera', () => {
    getMock.mockReturnValue(new Promise(() => undefined))

    renderList()

    expect(screen.getByRole('status')).toHaveTextContent('Cargando cafés')
  })

  it('muestra el error y permite reintentar', async () => {
    getMock.mockRejectedValue(new ApiError('No se pudo conectar con el servidor', 0))
    const user = userEvent.setup()

    renderList()

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor')

    getMock.mockResolvedValue([{ id: 1, name: 'Geisha Huila', region: 'Huila', price: 28.5 }])
    await user.click(screen.getByRole('button', { name: /reintentar/i }))

    expect(await screen.findByText('Geisha Huila')).toBeInTheDocument()
  })
})
