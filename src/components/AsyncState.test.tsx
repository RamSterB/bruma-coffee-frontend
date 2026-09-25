import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErrorState } from './ErrorState'
import { LoadingState } from './LoadingState'

describe('LoadingState', () => {
  it('anuncia la carga con role=status para lectores de pantalla', () => {
    render(<LoadingState message="Cargando cafés" />)

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Cargando cafés')
  })

  it('usa un mensaje por defecto si no se le pasa uno', () => {
    render(<LoadingState />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando')
  })
})

describe('ErrorState', () => {
  it('muestra el mensaje de error', () => {
    render(<ErrorState message="No se pudo conectar con el servidor" />)

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor')
  })

  it('invoca onRetry cuando se pulsa reintentar', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    render(<ErrorState message="Fallo" onRetry={onRetry} />)

    await user.click(screen.getByRole('button', { name: /reintentar/i }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('no muestra el botón si no hay acción de reintento', () => {
    render(<ErrorState message="Fallo" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
