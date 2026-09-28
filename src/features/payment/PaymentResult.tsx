import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { formatCop } from '../../lib/formatCurrency'
import type { OrderStatus } from './paymentSlice'

export interface PaymentResultProps {
  estado: OrderStatus | null
  cargando: boolean
  /** Variante comprada, a la que se vuelve. Sin ella no hay a dónde ir. */
  purchasedVariantId: string | null
  /** Café al que volver. Es el último paso del proceso: ver el stock ya descontado. */
  onVolverAlCafe: (variantId: string) => void
}

/**
 * La pantalla de resultado. Es el cuarto paso del proceso y el que más se lee: dice
 * qué pasó con el dinero, con número de orden para pedir referencias, y ofrece
 * volver al café con el stock ya descontado.
 */
export function PaymentResult({
  estado,
  cargando,
  purchasedVariantId,
  onVolverAlCafe,
}: PaymentResultProps) {
  if (cargando || estado === null) {
    return (
      <Stack spacing={2} sx={{ alignItems: 'center', py: 4 }} role="status">
        <CircularProgress aria-hidden />
        <Typography variant="body2">Confirmando tu pago…</Typography>
      </Stack>
    )
  }

  const aprobado = estado.paymentStatus === 'APPROVED'

  return (
    <Stack spacing={3} sx={{ py: 2 }}>
      <Box
        role="status"
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: aprobado ? 'success.dark' : 'error.dark',
        }}
      >
        <Typography variant="h6" component="p">
          {aprobado ? 'Pago aprobado' : 'El pago no se pudo completar'}
        </Typography>
        <Typography variant="body2">
          {aprobado
            ? 'Te enviamos el café y el seguimiento cuando salga.'
            : 'No se ha descontado nada de tu cuenta. Puedes intentarlo otra vez.'}
        </Typography>
      </Box>

      <Stack spacing={1}>
        <Typography variant="body2">
          <strong>Número de orden:</strong> {estado.orderNumber}
        </Typography>
        <Typography variant="body2">
          <strong>Total:</strong> {formatCop(estado.total)}
        </Typography>
        {estado.delivery !== null && (
          <Typography variant="body2">
            <strong>Envío:</strong> {estado.delivery.status}
          </Typography>
        )}
      </Stack>

      <Button variant="contained" onClick={() => onVolverAlCafe(purchasedVariantId ?? '')}>
        {aprobado ? 'Ver el café' : 'Intentar de nuevo'}
      </Button>
    </Stack>
  )
}
