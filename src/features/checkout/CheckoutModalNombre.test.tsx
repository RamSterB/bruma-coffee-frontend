import { describe, expect, it, jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { CheckoutModal } from './CheckoutModal'
import { createTestStore } from '../../app/store'
import { sesionRestaurada, type Sesion } from '../../features/auth/authSlice'

const SESION: Sesion = {
  accessToken: 'token-1',
  accessTokenExpiresIn: 900,
  csrfToken: 'csrf-1',
  user: {
    id: 'user-1',
    email: 'comprador@ejemplo.co',
    fullName: 'Persona Compradora',
    role: 'CUSTOMER',
    isEmailVerified: true,
  },
}

const montar = () => {
  const store = createTestStore({ auth: undefined })
  store.dispatch(sesionRestaurada(SESION))

  render(
    <Provider store={store}>
      <MemoryRouter>
        <CheckoutModal open onClose={jest.fn()} />
      </MemoryRouter>
    </Provider>,
  )
}

describe('el nombre del modal de pago', () => {
  it('se anuncia con el texto que se ve en el titulo', async () => {
    montar()

    // El nombre accesible tiene que ser el texto visible (WCAG 2.5.3). Aquí el título
    // dice "Finalizar compra", y ese es el nombre que tiene que oír quien usa lector:
    // si suenan dos nombres distintos, la persona no sabe si es la misma pantalla.
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(screen.getByRole('dialog', { name: /finalizar compra/i })).toBeInTheDocument()
  })

  it('hay un solo dialogo, y no uno dentro de otro', async () => {
    montar()

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    // Un dialogo anidado hace que el lector anuncie la pantalla dos veces y que el
    // tabulador atrape en el de dentro sin dejar salir al de fuera.
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })
})
