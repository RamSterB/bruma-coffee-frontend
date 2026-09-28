import { Box, Stack, Typography } from '@mui/material'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import type { CardBrand } from '../../lib/cardValidation'

export interface CardVisualValues {
  number: string
  holder: string
  expiry: string
  cvv: string
}

export interface CardVisualProps {
  values: CardVisualValues
  brand: CardBrand
}

const NOMBRES: Record<CardBrand, string> = {
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  DESCONOCIDA: '',
}

/**
 * Fondo por marca. El color solo **no** identifica una tarjeta: hay dos puntos de
 * vista que no distinguen un tono de otro, y ahí el color dice cualquier cosa. Por
 * eso el nombre de la marca va **escrito** al lado, y el color solo acompaña.
 */
const FONDO: Record<CardBrand, string> = {
  VISA: 'linear-gradient(135deg, #1a1f71 0%, #2b50a0 60%, #4a6fd4 100%)',
  MASTERCARD: 'linear-gradient(135deg, #2b1215 0%, #6b2320 60%, #a13430 100%)',
  DESCONOCIDA: 'linear-gradient(135deg, #2f2f35 0%, #4a4a55 100%)',
}

/**
 * Los últimos cuatro dígitos, o `••••` mientras no hay cuatro.
 *
 * **El número completo no aparece nunca en el dibujo**, ni en el texto ni en el
 * nombre accesible. El PAN vive en el estado del modal mientras está abierto, y
 * un dibujo que lo copiara entero acabaría en una captura de pantalla, en un
 * `aria-label` que lee un lector de pantalla o en un pegado de texto. Con los
 * últimos cuatro se distingue una tarjeta de otra, que es lo que se necesita, sin
 * copiar nada que sirva para pagar.
 */
const ultimosCuatro = (numero: string): string => {
  const digitos = numero.replace(/\D/g, '')

  return digitos.length >= 4 ? digitos.slice(-4) : '••••'
}

const enMayusculas = (valor: string): string => valor.trim().toUpperCase()

/**
 * La tarjeta dibujada.
 *
 * Antes esto era un campo de texto con un icono al lado, y no llamaba la atención
 * de nadie. Ahora es un objeto reconocible: la forma, el chip, la marca, el titular
 * y los últimos cuatro. Es la pantalla que sostiene la confianza del pago, y no
 * puede parecer un formulario más.
 */
export function CardVisual({ values, brand }: CardVisualProps) {
  const Supported = brand !== 'DESCONOCIDA'

  return (
    <Box
      data-testid="tarjeta-dibujada"
      data-marca={brand}
      sx={{
        width: '100%',
        maxWidth: '100%',
        minHeight: 168,
        p: 2,
        borderRadius: 3,
        background: FONDO[brand],
        color: '#ffffff',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        transition: 'background 160ms ease-out',
        // `minWidth: 0` es lo que evita que un número largo estire la tarjeta y
        // empuje scroll horizontal en un móvil. Sin esto, el dibujo se sale.
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <Stack spacing={2} sx={{ height: '100%', justifyContent: 'space-between' }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Box
            aria-hidden
            sx={{
              width: 34,
              height: 26,
              borderRadius: '4px',
              background: 'linear-gradient(135deg, #f2d98b, #c9a94e)',
            }}
          />
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
            {Supported && (
              <>
                <CreditCardIcon sx={{ fontSize: 22, opacity: 0.9 }} />
                <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
                  {NOMBRES[brand]}
                </Typography>
              </>
            )}
          </Stack>
        </Stack>

        <Typography
          data-testid="ultimos-cuatro"
          variant="h6"
          component="p"
          sx={{ fontFamily: 'monospace', letterSpacing: 3, minWidth: 0, overflowWrap: 'anywhere' }}
        >
          {`•••• •••• •••• ${ultimosCuatro(values.number)}`}
        </Typography>

        <Stack direction="row" spacing={2} sx={{ minWidth: 0, overflow: 'hidden' }}>
          <Stack spacing={0} sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              Titular
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {enMayusculas(values.holder) || ' '}
            </Typography>
          </Stack>
          <Stack spacing={0} sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              Vence
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {values.expiry || ' '}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  )
}
