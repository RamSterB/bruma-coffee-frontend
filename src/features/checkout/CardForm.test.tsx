import { describe, expect, it, jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { CardForm, type CardFormValues } from './CardForm'

const vacio: CardFormValues = { number: '', holder: '', expiry: '', cvv: '' }

const montar = () => {
  const onChange = jest.fn()
  const onInvalid = jest.fn()

  const Contenedor = () => {
    const [valores, setValores] = useState(vacio)

    return (
      <CardForm
        values={valores}
        onInvalid={onInvalid}
        onChange={(siguiente) => {
          setValores(siguiente)
          onChange(siguiente)
        }}
      />
    )
  }

  render(<Contenedor />)

  return { onChange, onInvalid }
}

describe('CardForm', () => {
  it('pide número, nombre, vencimiento y código de seguridad', () => {
    montar()

    expect(screen.getByLabelText(/n[uú]mero de tarjeta/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nombre en la tarjeta/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/vence/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cvv/i)).toBeInTheDocument()
  })

  it('agrupa el número de cuatro en cuatro mientras se escribe', async () => {
    const { onChange } = montar()

    await userEvent.type(screen.getByLabelText(/n[uú]mero de tarjeta/i), '4111111111111111')

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ number: '4111 1111 1111 1111' }),
    )
  })

  it('el logo dice Visa en cuanto se escriben los primeros dígitos', async () => {
    montar()

    await userEvent.type(screen.getByLabelText(/n[uú]mero de tarjeta/i), '4')

    expect(await screen.findByLabelText('Tarjeta Visa')).toBeInTheDocument()
  })

  it('el logo dice Mastercard en cuanto se escriben los primeros dígitos', async () => {
    montar()

    await userEvent.type(screen.getByLabelText(/n[uú]mero de tarjeta/i), '55')

    expect(await screen.findByLabelText('Tarjeta Mastercard')).toBeInTheDocument()
  })

  it('avisa que una tarjeta inválida no es válida, sin vaciar lo escrito', async () => {
    const { onInvalid, onChange } = montar()
    const campo = screen.getByLabelText(/n[uú]mero de tarjeta/i)

    await userEvent.type(campo, '4111111111111112')
    await userEvent.tab()

    expect(onInvalid).toHaveBeenCalledWith(expect.stringContaining('no es válida'))
    expect(campo).toHaveValue('4111 1111 1111 1112')
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ number: '4111 1111 1111 1112' }),
    )
  })

  it('avisa que una fecha de vencimiento inválida no es válida, sin vaciar lo escrito', async () => {
    const { onInvalid } = montar()
    const campo = screen.getByLabelText(/vence/i)

    await userEvent.type(campo, '01/20')
    await userEvent.tab()

    expect(onInvalid).toHaveBeenCalledWith(expect.stringContaining('vencimiento'))
    expect(campo).toHaveValue('01/20')
  })

  it('dice que solo se aceptan Visa y Mastercard ante una marca desconocida', async () => {
    montar()
    const campo = screen.getByLabelText(/n[uú]mero de tarjeta/i)

    await userEvent.type(campo, '3782')
    await userEvent.tab()

    expect(await screen.findByText(/solo aceptamos visa y mastercard/i)).toBeInTheDocument()
  })

  it('no avisa de una tarjeta válida al salir del campo', async () => {
    const { onInvalid } = montar()
    const campo = screen.getByLabelText(/n[uú]mero de tarjeta/i)

    await userEvent.type(campo, '4111111111111111')
    await userEvent.tab()

    await waitFor(() => {
      expect(onInvalid).not.toHaveBeenCalled()
    })
  })

  it('avisa de un código de seguridad que no son tres dígitos', async () => {
    const { onInvalid } = montar()
    const campo = screen.getByLabelText(/cvv/i)

    await userEvent.type(campo, '12')
    await userEvent.tab()

    expect(onInvalid).toHaveBeenCalledWith(expect.stringContaining('3 dígitos'))
  })
})
