import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { CartDrawer } from './CartDrawer'
import { createTestStore } from '../../app/store'
import { sesionRestaurada, type Sesion } from '../auth/authSlice'
import { httpClient } from '../../app/api/httpClient'

jest.mock('../../app/api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))

const get = jest.mocked(httpClient.get)
const post = jest.mocked(httpClient.post)

const CARRITO_DEL_SERVIDOR = {
  items: [
    {
      variantId: 'v1',
      coffeeId: 'c1',
      coffeeName: 'Caturra',
      weightGrams: 250,
      price: 42000,
      stock: 5,
      quantity: 2,
      subtotal: 84000,
      isPurchasable: true,
    },
  ],
  subtotal: 84000,
  totalItems: 2,
  purchasableItems: 1,
}

const SESION: Sesion = {
  accessToken: 'token-1',
  accessTokenExpiresIn: 900,
  csrfToken: 'csrf-1',
  user: {
    id: 'user-1',
    email: 'comprador@ejemplo.co',
    fullName: 'Compradora',
    role: 'CUSTOMER',
    isEmailVerified: true,
  },
}

const montar = async () => {
  // Con sesion el cajon pide el carrito al servidor, y de ahi salen las lineas. Sin
  // sesion toma el camino de invitado, que solo lee lo que hay en el navegador.
  const store = createTestStore({ auth: undefined })
  store.dispatch(sesionRestaurada(SESION))

  render(
    <Provider store={store}>
      <MemoryRouter>
        <CartDrawer open onClose={jest.fn()} />
      </MemoryRouter>
    </Provider>,
  )

  await screen.findByRole('button', { name: 'Quitar uno' })

  return store
}

describe('los botones de cantidad del cajon', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    get.mockResolvedValue(CARRITO_DEL_SERVIDOR as never)
  })

  it('ocupan 44 px o mas, que es lo que hace falta para pulsar con el dedo', async () => {
    await montar()

    // El tamaño pequeño de Material se queda en unos 34 px. Se nota: hay que apuntar y
    // a la persona le pulsa el cafe de al lado, o nada. Con la compra ya decidida, un
    // toque de mas quita un cafe del carrito.
    for (const nombre of ['Quitar uno', 'Aumentar', 'Quitar del carrito']) {
      const boton = screen.getByRole('button', { name: nombre })

      // El estilo calculado y no el atributo `style`: los estilos de Material viajan en
      // una clase que se inyecta en el documento, no en linea. Comprobar el atributo
      // daria "no puesto" con la regla puesta, que es un falso rojo.
      await waitFor(() => expect(window.getComputedStyle(boton).minHeight).toBe('44px'))
    }
  })
})
