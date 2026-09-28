import { Stack, TextField, Typography } from '@mui/material'
import { CardVisual } from './CardVisual'
import { useState } from 'react'
import {
  cardBrandFromNumber,
  formatCardNumber,
  isSupportedBrand,
  validateCard,
  validateCvv,
  validateExpiry,
} from '../../lib/cardValidation'

export interface CardFormValues {
  number: string
  holder: string
  expiry: string
  cvv: string
}

export interface CardFormProps {
  values: CardFormValues
  onChange: (values: CardFormValues) => void
  /** Se llama con el motivo cuando algo no cuadra, para avisar sin bloquear. */
  onInvalid: (motivo: string) => void
  disabled?: boolean
}

/**
 * El logo cambia con los primeros dígitos, que es lo único que se conoce de una
 * tarjeta mientras se escribe. Se calcula antes de que el número sea válido a
 * propósito: si el logo dependiera del Luhn, no aparecería hasta el último
 * dígito, que es justo cuando ya no hace falta para orientarse.
 */
export function CardForm({ values, onChange, onInvalid, disabled = false }: CardFormProps) {
  const [tocado, setTocado] = useState(false)
  const marca = cardBrandFromNumber(values.number)
  const soportada = isSupportedBrand(marca)

  const cambiar = (campo: keyof CardFormValues, valor: string) => {
    const siguiente = { ...values, [campo]: valor }

    onChange(campo === 'number' ? { ...siguiente, number: formatCardNumber(valor) } : siguiente)

    // El aviso sale al salir del campo, no mientras se escribe: saltaría en cada
    // tecla y no dejaría terminar el número.
    if (tocado && campo === 'number') {
      const soloDigitos = valor.replace(/\D/g, '')

      if (soloDigitos.length >= 13 && !validateCard(valor)) {
        onInvalid('Esa tarjeta no es válida. Revisa el número.')
      }
    }
  }

  return (
    <Stack spacing={2}>
      {/* La tarjeta dibujada va **encima** de los campos, no al lado: es lo que
          convierte una pantalla de formulario en una pantalla de pago. */}
      <CardVisual values={values} brand={marca} />

      {tocado && !soportada && (
        <Typography variant="caption" color="error" role="alert">
          Solo aceptamos Visa y Mastercard.
        </Typography>
      )}

      <TextField
        label="Número de tarjeta"
        value={values.number}
        onChange={(evento) => cambiar('number', evento.target.value)}
        onBlur={() => {
          setTocado(true)

          if (values.number.replace(/\D/g, '').length >= 13 && !validateCard(values.number)) {
            onInvalid('Esa tarjeta no es válida. Revisa el número.')
          }
        }}
        slotProps={{
          htmlInput: { inputMode: 'numeric', autoComplete: 'cc-number', maxLength: 24 },
        }}
        error={tocado && !soportada && values.number.replace(/\D/g, '').length >= 2}
        disabled={disabled}
        fullWidth
      />

      <TextField
        label="Nombre en la tarjeta"
        value={values.holder}
        onChange={(evento) => cambiar('holder', evento.target.value.toUpperCase())}
        slotProps={{ htmlInput: { autoComplete: 'cc-name' } }}
        disabled={disabled}
        fullWidth
      />

      <Stack direction="row" spacing={2}>
        <TextField
          label="Vence (MM/AA)"
          value={values.expiry}
          onChange={(evento) => cambiar('expiry', evento.target.value)}
          onBlur={() => {
            setTocado(true)

            if (values.expiry !== '' && !validateExpiry(values.expiry)) {
              onInvalid('La fecha de vencimiento no es válida.')
            }
          }}
          slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'cc-exp', maxLength: 5 } }}
          disabled={disabled}
          fullWidth
        />

        <TextField
          label="CVV"
          value={values.cvv}
          onChange={(evento) => cambiar('cvv', evento.target.value.replace(/\D/g, '').slice(0, 3))}
          onBlur={() => {
            setTocado(true)

            if (values.cvv !== '' && !validateCvv(values.cvv)) {
              onInvalid('El código de seguridad son 3 dígitos.')
            }
          }}
          slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'cc-csc', maxLength: 3 } }}
          disabled={disabled}
          fullWidth
        />
      </Stack>
    </Stack>
  )
}
