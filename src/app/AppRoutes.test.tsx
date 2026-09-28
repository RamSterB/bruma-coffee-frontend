import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from './AppRoutes'
import { createTestStore, type AppStore } from './store'
import { sesionRestaurada, sesionNoRestaurada, type Sesion } from '../features/auth/authSlice'
import { httpClient } from './api/httpClient'

jest.mock('./api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))

const get = jest.mocked(httpClient.get)
const post = jest.mocked(httpClient.post)

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

/** Con la sesión ya resuelta, para no medir el tiempo de recuperación. */
const conSesion = () => {
  const store = createTestStore({ auth: undefined })
  store.dispatch(sesionRestaurada(SESION))

  return store
}

/** Sin sesión, y ya se ha intentado recuperarla: eso es "anónimo", no "todavía no sé". */
const sinSesion = () => {
  const store = createTestStore({ auth: undefined })
  store.dispatch(sesionNoRestaurada())

  return store
}

const montarEn = (ruta: string, store: AppStore) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[ruta]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>,
  )

describe('quien entra sin sesion a una pantalla que la necesita', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    post.mockRejectedValue(new Error('sin cookie') as never)
    get.mockResolvedValue({ items: [] } as never)
  })

  it('el historial le lleva a entrar, no a una pantalla que no puede cargar', async () => {
    montarEn('/mis-ordenes', sinSesion())

    // Antes se quedaba en la pagina escribiendo un aviso y pidiendo entrar a mano.
    // Es un callejon sin salida: la pantalla no puede pedir sus ordenes sin sesion, y
    // el aviso no dice como seguir.
    expect(await screen.findByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('la cuenta tambien, en vez de un aviso dentro de la pagina', async () => {
    montarEn('/cuenta', sinSesion())

    expect(await screen.findByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('no llega a pedir nada al backend, que solo le devolveria un 401', async () => {
    montarEn('/mis-ordenes', sinSesion())

    await screen.findByRole('heading', { name: /iniciar sesión/i })
    // La peticion se hace en cuanto se monta la pagina, y el fallo sale en consola
    // como un 401 que nadie causo. Redirigiendo antes, ni se pide.
    expect(get).not.toHaveBeenCalledWith('/orders', expect.anything())
  })
})

describe('quien ya tiene sesion y entra a la pantalla de entrar', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    post.mockResolvedValue(SESION as never)
    get.mockResolvedValue({ items: [] } as never)
  })

  it('le lleva a su cuenta, no a un formulario que no necesita', async () => {
    montarEn('/entrar', conSesion())

    // Un formulario de acceso para quien ya esta dentro es una pantalla que no explica
    // por que aparece, y el inviting a volver a escribir su contrasena.
    expect(await screen.findByRole('heading', { name: /mi cuenta/i })).toBeInTheDocument()
  })

  it('el registro tambien', async () => {
    montarEn('/registro', conSesion())

    expect(await screen.findByRole('heading', { name: /mi cuenta/i })).toBeInTheDocument()
  })
})

describe('mientras se recupera la sesion', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    post.mockResolvedValue(SESION as never)
    get.mockResolvedValue({ items: [] } as never)
  })

  it('no expulsa a nadie, porque todavia no se sabe si hay sesion', async () => {
    // Este es el fallo que hace estas guardas inutiles si se olvidan. Al abrir el
    // sitio, el token esta en una cookie httpOnly y la sesion se recupera sola. Si la
    // guarda redirija mientras se pregunta, la persona que si tiene sesion aterriza en
    // la pantalla de entrar cada vez que recarga, y el token de refresco no se llega a
    // usar.
    const store = createTestStore({ auth: undefined })
    montarEn('/mis-ordenes', store)

    expect(store.getState().auth.status).toBe('iniciando')
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: /iniciar sesión/i })).toBeNull()
  })

  it('si la sesion si existia, la pagina se queda donde estaba', async () => {
    montarEn('/mis-ordenes', conSesion())

    expect(await screen.findByRole('heading', { name: /mis órdenes/i })).toBeInTheDocument()
  })
})

describe('las pantallas publicas', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    post.mockRejectedValue(new Error('sin cookie') as never)
    get.mockResolvedValue({ items: [] } as never)
  })

  it('el catalogo se abre sin sesion, que es como se compra como invitado', async () => {
    montarEn('/', sinSesion())

    expect(screen.getByRole('heading', { name: /bruma coffee/i })).toBeInTheDocument()
  })

  it('el acceso se puede abrir sin sesion, que es justo para eso', async () => {
    montarEn('/entrar', sinSesion())

    expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('la compra tambien, porque el checkout de invitado es una decision de producto', async () => {
    montarEn('/checkout', sinSesion())

    expect(screen.queryByRole('heading', { name: /mi cuenta/i })).toBeNull()
  })
})
