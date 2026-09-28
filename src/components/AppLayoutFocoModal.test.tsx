import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { createTestStore, type AppStore } from '../app/store'
import { httpClient } from '../app/api/httpClient'
import { addItem } from '../features/cart/cartSlice'

jest.mock('../app/api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))

const get = jest.mocked(httpClient.get)
const post = jest.mocked(httpClient.post)

const montar = (store: AppStore) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<p>el catalogo</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  )

/** Con una linea en el carrito, que es como se abre el cajon de verdad. */
const storeConCarrito = () => {
  const store = createTestStore()
  store.dispatch(addItem({ variantId: 'v1', quantity: 1, stock: 5 }))

  return store
}

/**
 * El cajon, y no "un dialogo": el layout tiene tambien el modal de pago en el DOM, y
 * preguntar solo por el rol devuelve dos y el test mide el equivocado. Ademas se
 * pregunta por su nombre, que es como se comprueba de paso que lo tiene.
 */
const cajon = () => screen.queryByRole('dialog', { name: 'Tu carrito' })

describe('el foco en el cajon de la compra', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    post.mockRejectedValue(new Error('sin sesion') as never)
    get.mockResolvedValue({ items: [] } as never)
  })

  it('al abrirlo, el foco entra en el cajon y no se queda en la cabecera', async () => {
    montar(storeConCarrito())

    await userEvent.click(screen.getByRole('button', { name: /carrito con 1 unidades/i }))

    // Si el foco se queda en el boton que lo abrio, quien navega con teclado esta
    // "dentro" del cajon sin estar dentro: el siguiente Tab se lo lleva al menu.
    await waitFor(() => expect(cajon()).not.toBeNull())
    await waitFor(() => expect(cajon()).toContainElement(document.activeElement as HTMLElement))
  })

  it('al cerrarlo con Escape, el foco vuelve al boton que lo abrio', async () => {
    montar(storeConCarrito())

    const boton = screen.getByRole('button', { name: /carrito con 1 unidades/i })
    await userEvent.click(boton)

    await waitFor(() => expect(cajon()).not.toBeNull())
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(cajon()).toBeNull())
    // El foco vuelve a donde estaba. Sin esto, quien cierra el cajón tiene que
    // recorrer la página otra vez para saber dónde está.
    expect(boton).toHaveFocus()
  })

  it('al cerrarlo con el boton de cerrar, tambien vuelve', async () => {
    montar(storeConCarrito())

    const boton = screen.getByRole('button', { name: /carrito con 1 unidades/i })
    await userEvent.click(boton)

    await waitFor(() => expect(cajon()).not.toBeNull())
    await userEvent.click(screen.getByRole('button', { name: /cerrar/i }))

    await waitFor(() => expect(cajon()).toBeNull())
    expect(boton).toHaveFocus()
  })

  it('dentro del cajon, el foco no se escapa hacia la pagina de fondo', async () => {
    montar(storeConCarrito())

    await userEvent.click(screen.getByRole('button', { name: /carrito con 1 unidades/i }))
    await waitFor(() => expect(cajon()).not.toBeNull())

    const dialogo = cajon() as HTMLElement

    // Diez tabs. Un cajon de compra tiene pocos controles, así que con diez se ha dado
    // la vuelta varias veces. Si el foco se escapara, en alguno de estos tabulos
    // acabariamos en el texto de la pagina de fondo.
    for (let vuelta = 0; vuelta < 10; vuelta += 1) {
      await userEvent.tab()
      expect(dialogo).toContainElement(document.activeElement as HTMLElement)
    }
  })
})
