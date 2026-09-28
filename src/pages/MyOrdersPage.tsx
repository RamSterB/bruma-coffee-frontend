import { useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { formatCop } from '../lib/formatCurrency'
import { fetchMyOrders, selectOrders } from '../features/orders/ordersSlice'
import { selectEstaAutenticada } from '../features/auth/authSlice'

/**
 * Los estados van en palabras y no con el código de la base de datos.
 *
 * `PAID` no le dice nada a quien compró. Y peor: si el día de mañana aparece un
 * estado nuevo y el `switch` no lo contempla, se pinta en blanco y la persona cree
 * que su orden se perdió.
 */
const ESTADOS: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagada',
  FAILED: 'Fallida',
  CANCELLED: 'Cancelada',
}

const COLOR_DE: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
  PAID: 'success',
  FAILED: 'error',
  CANCELLED: 'default',
  PENDING: 'warning',
}

const nombreDelEstado = (status: string): string => ESTADOS[status] ?? 'En revisión'

const fechaLegible = (iso: string): string => {
  const fecha = new Date(iso)

  if (Number.isNaN(fecha.getTime())) {
    return 'Fecha no disponible'
  }

  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(fecha)
}

const peso = (weightGrams: number | null): string =>
  weightGrams === null ? '' : ` de ${weightGrams} g`

export function MyOrdersPage() {
  const dispatch = useAppDispatch()
  const { status, items, error } = useAppSelector(selectOrders)
  const sinSesion = !useAppSelector(selectEstaAutenticada)

  useEffect(() => {
    if (!sinSesion) {
      void dispatch(fetchMyOrders())
    }
  }, [dispatch, sinSesion])

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Mis órdenes
      </Typography>

      {sinSesion ? (
        <Alert severity="info">
          <Stack spacing={1}>
            <Typography>Para ver tus compras necesitas iniciar sesión.</Typography>
            <Typography>
              <RouterLink to="/entrar">Iniciar sesión</RouterLink>
            </Typography>
          </Stack>
        </Alert>
      ) : (
        <>
          {status === 'loading' && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress aria-label="Cargando tus órdenes" />
            </Box>
          )}

          {status === 'error' && error && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => void dispatch(fetchMyOrders())}>
                  Reintentar
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {status === 'ready' && items.length === 0 && (
            <Alert severity="info">Todavía no has hecho ninguna compra.</Alert>
          )}

          {status === 'ready' && items.length > 0 && (
            <Stack spacing={2}>
              {items.map((orden) => (
                <Paper key={orden.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack
                    direction="row"
                    sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Typography variant="subtitle2">{orden.orderNumber}</Typography>
                    <Chip
                      size="small"
                      color={COLOR_DE[orden.status] ?? 'default'}
                      label={nombreDelEstado(orden.status)}
                    />
                  </Stack>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 1, display: 'block' }}
                  >
                    {fechaLegible(orden.createdAt)}
                  </Typography>

                  <Stack spacing={0.5}>
                    {orden.items.map((linea) => (
                      <Stack
                        key={`${orden.id}-${linea.variantId}`}
                        direction="row"
                        sx={{ justifyContent: 'space-between' }}
                      >
                        <Typography variant="body2">
                          {linea.quantity} × {linea.coffeeName}
                          {peso(linea.weightGrams)}
                        </Typography>
                        <Typography variant="body2">{formatCop(linea.lineTotal)}</Typography>
                      </Stack>
                    ))}
                  </Stack>

                  <Stack direction="row" sx={{ mt: 1.5, justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2">Total</Typography>
                    <Typography variant="subtitle2">{formatCop(orden.total)}</Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </>
      )}
    </Container>
  )
}
