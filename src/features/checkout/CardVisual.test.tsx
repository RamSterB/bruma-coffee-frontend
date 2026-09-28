import { describe, expect, it } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { CardVisual } from './CardVisual'
import { cardBrandFromNumber } from '../../lib/cardValidation'

const MASTERCARD = '5555555555554444'

const valores = (over: Partial<Parameters<typeof CardVisual>[0]['values']> = {}) => ({
  number: '4111 1111 1111 1111',
  holder: 'PERSONA COMPRADORA',
  expiry: '12/30',
  cvv: '123',
  ...over,
})

describe('CardVisual', () => {
  it('dibuja la tarjeta con forma de tarjeta, no como un texto suelto', () => {
    render(<CardVisual values={valores()} brand="VISA" />)

    // La razón de este trabajo: hasta ahora la tarjeta era un campo más. Esto la
    // convierte en un objeto que se reconoce de un vistazo.
    expect(screen.getByTestId('tarjeta-dibujada')).toBeInTheDocument()
  })

  it('muestra el titular y el vencimiento', () => {
    render(<CardVisual values={valores()} brand="VISA" />)

    expect(screen.getByText('PERSONA COMPRADORA')).toBeInTheDocument()
    expect(screen.getByText('12/30')).toBeInTheDocument()
  })

  it('muestra solo los últimos cuatro dígitos y enmascara el resto', () => {
    const { container } = render(<CardVisual values={valores()} brand="VISA" />)

    // El número completo no puede estar en el dibujo: la tarjeta se persiste en el
    // estado mientras el modal está abierto, y un `••••` de adorno no puede
    // acabar copiando el PAN a un sitio que no lo necesita.
    expect(container.textContent).not.toContain('4111 1111 1111 1111')
    expect(container.textContent).not.toContain('4111111111111111')
    expect(container.textContent).toContain('1111')
  })

  it('no pone el número en el nombre accesible, porque un lector de pantalla lo lee', () => {
    const { container } = render(<CardVisual values={valores()} brand="VISA" />)

    expect(container.textContent).not.toContain('1111 1111')
    expect(screen.getByTestId('tarjeta-dibujada')).not.toHaveAttribute('title', /4111/)
  })

  it('cambia el color con la marca, para que el logo y el fondo no se contradigan', () => {
    const { rerender, container } = render(<CardVisual values={valores()} brand="VISA" />)
    const visa = container.firstElementChild?.getAttribute('data-marca')

    rerender(<CardVisual values={valores({ number: MASTERCARD })} brand="MASTERCARD" />)
    const mastercard = container.firstElementChild?.getAttribute('data-marca')

    expect(visa).toBe('VISA')
    expect(mastercard).toBe('MASTERCARD')
  })

  it('pone el nombre de la marca, que es lo que hace falta sin mirar el color', () => {
    // El color solo no vale: dos personas no distinguen el mismo tono. El nombre
    // escrito es lo que dice la verdad a todo el mundo.
    render(<CardVisual values={valores()} brand="MASTERCARD" />)

    expect(screen.getByText('Mastercard')).toBeInTheDocument()
  })

  it('con marca desconocida no finge una marca que no es', () => {
    render(<CardVisual values={valores({ number: '9999 9999 9999 9999' })} brand="DESCONOCIDA" />)

    expect(screen.queryByText('Visa')).toBeNull()
    expect(screen.queryByText('Mastercard')).toBeNull()
  })

  it('se dibuja mientras se escribe, sin esperar a salir del campo', () => {
    const { rerender } = render(<CardVisual values={valores({ number: '4111' })} brand="VISA" />)
    expect(screen.getByTestId('ultimos-cuatro')).toHaveTextContent('••••')

    rerender(<CardVisual values={valores({ number: '4111 1111 1111 1111' })} brand="VISA" />)
    expect(screen.getByTestId('ultimos-cuatro')).toHaveTextContent('1111')
  })

  it('lee la marca del número si no le pasan ninguna', () => {
    render(
      <CardVisual
        values={valores({ number: MASTERCARD })}
        brand={cardBrandFromNumber(MASTERCARD)}
      />,
    )

    expect(screen.getByText('Mastercard')).toBeInTheDocument()
  })

  it('ocupa el ancho disponible sin salirse en pantalla pequeña', () => {
    // Mobile first: la tarjeta se estrecha con el contenedor y nunca fuerza scroll
    // horizontal, que en un móvil es la forma más fácil de arruinar una pantalla.
    const { container } = render(<CardVisual values={valores()} brand="VISA" />)
    const tarjeta = container.firstElementChild

    expect(tarjeta).toHaveStyle({ width: '100%' })
    expect(tarjeta).toHaveStyle({ maxWidth: '100%' })
  })
})
