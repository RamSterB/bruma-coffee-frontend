import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from './AppRoutes'
import { createTestStore } from '../app/store'

const renderAt = (path: string) =>
  render(
    <Provider store={createTestStore()}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>,
  )

describe('AppRoutes', () => {
  it('muestra la marca en la página de inicio', () => {
    renderAt('/')

    expect(screen.getByRole('heading', { name: /bruma coffee/i })).toBeInTheDocument()
  })

  it('muestra un mensaje de página no encontrada en rutas desconocidas', () => {
    renderAt('/ruta-que-no-existe')

    expect(screen.getByRole('heading', { name: /no encontrada/i })).toBeInTheDocument()
  })
})
