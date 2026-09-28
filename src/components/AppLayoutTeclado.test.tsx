import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { createTestStore } from '../app/store'
import { httpClient } from '../app/api/httpClient'

jest.mock('../app/api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))

const get = jest.mocked(httpClient.get)
const post = jest.mocked(httpClient.post)

const montar = () =>
  render(
    <Provider store={createTestStore()}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route
              path="/"
              element={<button type="button">Un boton dentro del contenido</button>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  )

describe('navegar con teclado', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    post.mockRejectedValue(new Error('sin sesion') as never)
    get.mockResolvedValue({ items: [] } as never)
  })

  it('lo primero que encuentra al tabular es un enlace para saltar al contenido', async () => {
    montar()

    // Quien navega con teclado llega a la cabecera antes que a nada, y en cada
    // pagina. Sin este enlace tiene que recorrer el logo, los enlaces y el carrito
    // en cada cambio de pagina, y el contenido nunca es lo siguiente.
    await userEvent.tab()

    const primero = screen.getByRole('link', { name: /saltar al contenido/i })
    expect(primero).toHaveFocus()
  })

  it('el enlace esta oculto hasta que recibe el foco, y se vuelve a ocultar', async () => {
    montar()

    const enlace = screen.getByRole('link', { name: /saltar al contenido/i })
    // Un enlace siempre a la vista taparia el contenido y no aportaria nada. El
    // mecanismo son las utilidades `sr-only` y su inversa: `toBeVisible` no las
    // distingue, porque solo mira `display`, `visibility` y opacidad.
    expect(enlace).toHaveClass('sr-only')

    await userEvent.tab()
    expect(enlace).toHaveClass('focus:not-sr-only')

    await userEvent.tab()
    expect(enlace).toHaveClass('sr-only')
  })

  it('al activarlo, el foco va al contenido y no se queda en la cabecera', async () => {
    montar()

    await userEvent.tab()
    await userEvent.keyboard('{Enter}')

    // Si el foco se queda en el enlace, la persona ya esta en el contenido pero el
    // foco no: tiene que volver a tabular desde la cabecera para llegar.
    const principal = document.querySelector('main')
    expect(principal).not.toBeNull()
    expect(principal).toHaveFocus()
  })

  it('el contenido es alcanzable con un solo tab desde el inicio', async () => {
    montar()

    await userEvent.tab()
    await userEvent.keyboard('{Enter}')

    // Y desde ahi sigue tabulando por el contenido, no vuelve a la cabecera.
    await userEvent.tab()
    expect(screen.getByRole('button', { name: /un boton dentro del contenido/i })).toHaveFocus()
  })

  it('el enlace apunta al contenido, no a la pagina entera', async () => {
    montar()

    const enlace = screen.getByRole('link', { name: /saltar al contenido/i })
    expect(enlace).toHaveAttribute('href', '#contenido')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido')
  })
})
