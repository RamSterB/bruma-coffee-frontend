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

const VISA = '4111111111111111'

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

const rellenarEntrega = async () => {
  await userEvent.type(
    await screen.findByLabelText(/nombre de quien recibe/i),
    'Persona Compradora',
  )
  await userEvent.type(screen.getByLabelText(/n[uú]mero de documento/i), '1098765434')
  await userEvent.type(screen.getByLabelText(/tel[eé]fono/i), '3001234567')
  await userEvent.type(screen.getByLabelText(/direcci[oó]n/i), 'Carrera 7 con Calle 72')
  await chooseOption('Departamento', 'Cundinamarca')
  await chooseOption('Ciudad', 'Bogotá')
}

const rellenarTarjeta = async () => {
  await userEvent.type(await screen.findByLabelText(/n[uú]mero de tarjeta/i), VISA)
  await userEvent.type(screen.getByLabelText(/nombre en la tarjeta/i), 'PERSONA COMPRADORA')
  await userEvent.type(screen.getByLabelText(/vence/i), '12/30')
  await userEvent.type(screen.getByLabelText(/cvv/i), '123')
}

describe('CheckoutModal', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    get.mockImplementation((async (ruta: string) => {
      if (ruta === '/geography/departments') {
        return departamentos
      }
      if (ruta.startsWith('/geography/departments/')) {
        return ciudades
      }

      return desglose
    }) as never)
    // El backend responde la cotización con el mismo desglose y los datos ya
    // guardados con la grafía del catálogo. Sin esto, el reducer recibe una
    // respuesta vacía y el test falla por un motivo que no es el que mide.
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
  })

  it('empieza pidiendo la tarjeta, no mostrando el total', async () => {
    montar()

    expect(await screen.findByLabelText(/n[uú]mero de tarjeta/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nombre de quien recibe/i)).toBeInTheDocument()
    expect(screen.queryByText('Total')).toBeNull()
  })

  it('el resumen es el paso siguiente, no el primero', async () => {
    montar()
    await rellenarTarjeta()
    await rellenarEntrega()

    await userEvent.click(screen.getByRole('button', { name: /ver el resumen/i }))

    expect(await screen.findByText('Subtotal')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('el resumen lleva los cuatro importes con formato de pesos', async () => {
    montar()
    await rellenarTarjeta()
    await rellenarEntrega()
    await userEvent.click(screen.getByRole('button', { name: /ver el resumen/i }))

    expect((await screen.findAllByText('$ 84.000')).length).toBeGreaterThan(0)
    expect(screen.getByText('$ 15.960')).toBeInTheDocument()
    expect(screen.getByText('$ 109.960')).toBeInTheDocument()
  })

  it('el resumen tiene un botón de pago', async () => {
    montar()
    await rellenarTarjeta()
    await rellenarEntrega()
    await userEvent.click(screen.getByRole('button', { name: /ver el resumen/i }))

    expect(await screen.findByRole('button', { name: /^pagar$/i })).toBeInTheDocument()
  })

  it('el resumen dice "Envío gratis" cuando el envío es cero', async () => {
    get.mockImplementation((async (ruta: string) => {
      if (ruta === '/geography/departments') {
        return departamentos
      }
      if (ruta.startsWith('/geography/departments/')) {
        return ciudades
      }

      return { ...desglose, shipping: 0, isFreeShipping: true, total: 99960 }
    }) as never)
    // El resumen que se muestra al avanzar es el de la cotización, no el del
    // resumen previo: quien decide es el backend al validar la entrega.
    post.mockResolvedValue({
      ...desglose,
      shipping: 0,
      isFreeShipping: true,
      total: 99960,
      shippingData: { fullName: 'Persona Compradora' },
      persisted: false,
    })
    montar()
    await rellenarTarjeta()
    await rellenarEntrega()
    await userEvent.click(screen.getByRole('button', { name: /ver el resumen/i }))

    expect(await screen.findByText('Envío gratis')).toBeInTheDocument()
  })

  it('no deja pasar sin una tarjeta válida', async () => {
    montar()
    await userEvent.type(await screen.findByLabelText(/n[uú]mero de tarjeta/i), '4111111111111112')
    await userEvent.type(screen.getByLabelText(/nombre en la tarjeta/i), 'PERSONA')
    await userEvent.type(screen.getByLabelText(/vence/i), '12/30')
    await userEvent.type(screen.getByLabelText(/cvv/i), '123')
    await rellenarEntrega()

    await userEvent.click(screen.getByRole('button', { name: /ver el resumen/i }))

    expect(screen.queryByText('Subtotal')).toBeNull()
  })

  it('no deja pasar con una tarjeta que no es Visa ni Mastercard', async () => {
    montar()
    await userEvent.type(await screen.findByLabelText(/n[uú]mero de tarjeta/i), '378282246310005')
    await userEvent.type(screen.getByLabelText(/nombre en la tarjeta/i), 'PERSONA')
    await userEvent.type(screen.getByLabelText(/vence/i), '12/30')
    await userEvent.type(screen.getByLabelText(/cvv/i), '1234')
    await rellenarEntrega()

    await userEvent.click(screen.getByRole('button', { name: /ver el resumen/i }))

    expect(screen.queryByText('Subtotal')).toBeNull()
  })

  it('no deja pasar sin los datos de entrega', async () => {
    montar()
    await rellenarTarjeta()

    await userEvent.click(screen.getByRole('button', { name: /ver el resumen/i }))

    expect(screen.queryByText('Subtotal')).toBeNull()
  })

  it('avisa cuando el teléfono no es un celular de 10 dígitos, sin esperar al servidor', async () => {
    montar()
    await userEvent.type(await screen.findByLabelText(/n[uú]mero de tarjeta/i), VISA)
    await userEvent.type(screen.getByLabelText(/nombre de quien recibe/i), 'Persona Compradora')
    await userEvent.type(screen.getByLabelText(/n[uú]mero de documento/i), '1098765434')
    await userEvent.type(screen.getByLabelText(/tel[eé]fono/i), '1234567')
    await userEvent.type(screen.getByLabelText(/direcci[oó]n/i), 'Carrera 7 con Calle 72')
    await chooseOption('Departamento', 'Cundinamarca')
    await chooseOption('Ciudad', 'Bogotá')

    await userEvent.click(screen.getByRole('button', { name: /ver el resumen/i }))

    expect(await screen.findByText(/celular de 10 d[ií]gitos/i)).toBeInTheDocument()
  })

  it('las ciudades se piden por identificador y no por el nombre que se muestra', async () => {
    montar()
    await screen.findByLabelText(/departamento/i)
    await chooseOption('Departamento', 'Cundinamarca')

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/geography/departments/d1/cities')
    })
  })

  it('el resumen se puede volver a corregir sin perder lo escrito', async () => {
    montar()
    await rellenarTarjeta()
    await rellenarEntrega()
    await userEvent.click(screen.getByRole('button', { name: /ver el resumen/i }))
    await screen.findByText('Subtotal')

    await userEvent.click(screen.getByRole('button', { name: /volver a corregir/i }))

    expect(screen.getByLabelText(/n[uú]mero de tarjeta/i)).toHaveValue('4111 1111 1111 1111')
    expect(screen.getByLabelText(/tel[eé]fono/i)).toHaveValue('3001234567')
  })

  it('enseña el error del backend y se queda en el formulario, para poder corregirlo', async () => {
    post.mockRejectedValue(new ApiError('La ciudad no pertenece a ese departamento', 400))
    montar()
    await rellenarTarjeta()
    await rellenarEntrega()

    await userEvent.click(screen.getByRole('button', { name: /ver el resumen/i }))

    expect(
      await screen.findByText(/la ciudad no pertenece a ese departamento/i),
    ).toBeInTheDocument()
    // El formulario sigue en pantalla y con lo escrito: si al saltar al resumen
    // se fuera, el error aparecería sin los campos que hay que corregir.
    expect(screen.getByLabelText(/n[uú]mero de tarjeta/i)).toHaveValue('4111 1111 1111 1111')
    expect(screen.queryByText('Subtotal')).toBeNull()
  })

  it('avisa que el pago todavía no está disponible en vez de fingir que cobra', async () => {
    montar()
    await rellenarTarjeta()
    await rellenarEntrega()
    await userEvent.click(screen.getByRole('button', { name: /ver el resumen/i }))

    await userEvent.click(await screen.findByRole('button', { name: /^pagar$/i }))

    expect(
      await screen.findByText(/pago con tarjeta llega en el pr[oó]ximo paso/i),
    ).toBeInTheDocument()
  })
})
