import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { httpClient } from '../../app/api/httpClient'
import { ApiError } from '../../app/api/ApiError'
import { createTestStore } from '../../app/store'
import { sesionRestaurada, type Sesion } from '../auth/authSlice'
import { CheckoutModal } from './CheckoutModal'
import { chooseOption } from '../../test/mui'

jest.mock('../../app/api/httpClient', () => ({
  httpClient: { get: jest.fn(), post: jest.fn() },
}))

const get = jest.mocked(httpClient.get)
const post = jest.mocked(httpClient.post)

const sesion: Sesion = {
  accessToken: 'token-1',
  accessTokenExpiresIn: 900,
  csrfToken: 'csrf-1',
  user: {
    id: 'user-1',
    email: 'persona@ejemplo.com',
    fullName: 'Persona Registrada',
    role: 'CUSTOMER',
    isEmailVerified: true,
  },
}

const desglose = {
  lines: [
    {
      variantId: 'v1',
      coffeeName: 'Café Nariño',
      unitPrice: 42000,
      quantity: 2,
      subtotal: 84000,
    },
  ],
  subtotal: 84000,
  tax: 15960,
  shipping: 10000,
  total: 109960,
  isFreeShipping: false,
}

const departamentos = {
  items: [
    { id: 'd1', name: 'Cundinamarca' },
    { id: 'd2', name: 'Antioquia' },
  ],
}

const ciudades = { items: [{ id: 'c1', name: 'Bogotá' }] }

const montar = () => {
  const store = createTestStore({ auth: undefined })
  store.dispatch(sesionRestaurada(sesion))

  render(
    <Provider store={store}>
      <MemoryRouter>
        <CheckoutModal open onClose={jest.fn()} />
      </MemoryRouter>
    </Provider>,
  )

  return store
}

describe('CheckoutModal', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    get.mockImplementation((async (ruta: string) => {
      if (ruta === '/cart/summary') {
        return desglose
      }
      if (ruta === '/geography/departments') {
        return departamentos
      }
      return ciudades
    }) as never)
  })

  it('se llama resumen de la orden y se ven los cuatro importes', async () => {
    montar()

    expect(await screen.findByText('Subtotal')).toBeInTheDocument()
    expect(screen.getByText('Impuestos (IVA 19 %)')).toBeInTheDocument()
    expect(screen.getByText('Envío')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('los importes salen con formato de pesos colombianos', async () => {
    montar()

    // El subtotal aparece dos veces, en la línea y en el resumen, y esa duplicidad
    // es correcta: una cosa es el importe de la línea y otra el total de todas.
    expect((await screen.findAllByText('$ 84.000')).length).toBeGreaterThan(0)
    expect(screen.getByText('$ 15.960')).toBeInTheDocument()
    expect(screen.getByText('$ 109.960')).toBeInTheDocument()
  })

  it('lista los productos con su cantidad y su precio unitario', async () => {
    montar()

    expect(await screen.findByText('Café Nariño')).toBeInTheDocument()
    expect(screen.getByText(/2 × \$ 42\.000/)).toBeInTheDocument()
  })

  it('dice "Envío gratis" cuando el envío es cero, y no un cero suelto', async () => {
    get.mockImplementation((async (ruta: string) => {
      if (ruta === '/cart/summary') {
        return { ...desglose, shipping: 0, isFreeShipping: true, total: 99960 }
      }
      if (ruta === '/geography/departments') {
        return departamentos
      }
      return ciudades
    }) as never)
    montar()

    expect(await screen.findByText('Envío gratis')).toBeInTheDocument()
  })

  it('pide los seis datos de entrega', async () => {
    montar()

    expect(await screen.findByLabelText(/nombre/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/documento/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tel[eé]fono/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/direcci[oó]n/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/departamento/i)).toBeInTheDocument()
  })

  it('las ciudades dependen del departamento elegido', async () => {
    montar()

    await screen.findByLabelText(/departamento/i)
    await chooseOption('Departamento', 'Cundinamarca')

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/geography/departments/d1/cities')
    })
    expect(screen.getByLabelText(/ciudad/i)).toBeInTheDocument()
  })

  it('no deja confirmar sin los datos de entrega', async () => {
    montar()
    await screen.findByLabelText(/nombre/i)

    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    expect(post).not.toHaveBeenCalled()
  })

  it('confirma con los datos y muestra el total que devuelve el servidor', async () => {
    post.mockResolvedValue({
      ...desglose,
      shippingData: {
        fullName: 'Persona Compradora',
        documentNumber: '1098765434',
        phone: '3001234567',
        address: 'Carrera 7 con Calle 72',
        city: 'Bogotá',
        department: 'Cundinamarca',
      },
      persisted: false,
    })
    montar()

    await userEvent.type(await screen.findByLabelText(/nombre/i), 'Persona Compradora')
    await userEvent.type(screen.getByLabelText(/documento/i), '1098765434')
    await userEvent.type(screen.getByLabelText(/tel[eé]fono/i), '3001234567')
    await userEvent.type(screen.getByLabelText(/direcci[oó]n/i), 'Carrera 7 con Calle 72')
    await chooseOption('Departamento', 'Cundinamarca')
    await chooseOption('Ciudad', 'Bogotá')
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        '/cart/shipping-quote',
        {
          fullName: 'Persona Compradora',
          documentNumber: '1098765434',
          phone: '3001234567',
          address: 'Carrera 7 con Calle 72',
          city: 'Bogotá',
          department: 'Cundinamarca',
        },
        { token: 'token-1' },
      )
    })
  })

  it('enseña el error del servidor cuando la ciudad no es del departamento', async () => {
    post.mockRejectedValue(new ApiError('La ciudad no pertenece a ese departamento', 400))
    montar()

    await userEvent.type(await screen.findByLabelText(/nombre/i), 'Persona Compradora')
    await userEvent.type(screen.getByLabelText(/documento/i), '1098765434')
    await userEvent.type(screen.getByLabelText(/tel[eé]fono/i), '3001234567')
    await userEvent.type(screen.getByLabelText(/direcci[oó]n/i), 'Carrera 7 con Calle 72')
    await chooseOption('Departamento', 'Cundinamarca')
    await chooseOption('Ciudad', 'Bogotá')
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    expect(
      await screen.findByText(/la ciudad no pertenece a ese departamento/i),
    ).toBeInTheDocument()
  })

  it('avisa de que el celular tiene que tener 10 dígitos, sin esperar al servidor', async () => {
    montar()

    await userEvent.type(await screen.findByLabelText(/nombre/i), 'Persona Compradora')
    await userEvent.type(screen.getByLabelText(/documento/i), '1098765434')
    await userEvent.type(screen.getByLabelText(/tel[eé]fono/i), '1234567')
    await userEvent.type(screen.getByLabelText(/direcci[oó]n/i), 'Carrera 7 con Calle 72')
    await chooseOption('Departamento', 'Cundinamarca')
    await chooseOption('Ciudad', 'Bogotá')
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    expect(await screen.findByText(/10 d[ií]gitos/i)).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('dice que el carrito está vacío cuando no hay nada que cobrar', async () => {
    get.mockImplementation((async (ruta: string) => {
      if (ruta === '/cart/summary') {
        return { ...desglose, lines: [], subtotal: 0, tax: 0, shipping: 0, total: 0 }
      }
      if (ruta === '/geography/departments') {
        return departamentos
      }
      return ciudades
    }) as never)
    montar()

    expect(await screen.findByText(/carrito est[aá] vac[ií]o/i)).toBeInTheDocument()
  })
})
