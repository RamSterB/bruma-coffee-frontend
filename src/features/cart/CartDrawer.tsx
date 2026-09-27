import { Alert, Box, Button, Divider, Drawer, IconButton, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import RemoveIcon from '@mui/icons-material/Remove'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { formatCop } from '../../lib/formatCurrency'
import {
  removeFromCart,
  resolveCart,
  selectCartIsEmpty,
  selectCartLines,
  selectCartSubtotal,
  changeQuantity,
} from './cartSlice'
import type { CartLine } from './types'

export const CART_DRAWER_WIDTH = 380

const LineaDelCarrito = ({ line }: { line: CartLine }) => {
  const dispatch = useAppDispatch()
  const { item, variant, adjusted } = line
  const alMaximo = item.quantity >= variant.stock

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="subtitle1">{variant.coffeeName}</Typography>
        <Typography variant="subtitle1">{formatCop(line.subtotal)}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {variant.weightGrams} g · {formatCop(variant.price)} cada uno
      </Typography>
      {adjusted ? (
        <Typography variant="caption" color="warning.main">
          Ajustado al stock disponible
        </Typography>
      ) : null}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1 }}>
        <IconButton
          aria-label="Quitar uno"
          size="small"
          onClick={() =>
            dispatch(
              changeQuantity({
                variantId: item.variantId,
                quantity: item.quantity - 1,
                stock: variant.stock,
              }),
            )
          }
        >
          <RemoveIcon fontSize="small" />
        </IconButton>
        <Typography variant="body2">{item.quantity}</Typography>
        <IconButton
          aria-label="Aumentar"
          size="small"
          disabled={alMaximo}
          onClick={() =>
            dispatch(
              changeQuantity({
                variantId: item.variantId,
                quantity: item.quantity + 1,
                stock: variant.stock,
              }),
            )
          }
        >
          <AddIcon fontSize="small" />
        </IconButton>
        <IconButton
          aria-label="Quitar del carrito"
          size="small"
          sx={{ ml: 'auto' }}
          onClick={() => dispatch(removeFromCart(item.variantId))}
        >
          <DeleteOutlineOutlinedIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Divider sx={{ mt: 1 }} />
    </Box>
  )
}

export interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

/**
 * El carrito se resuelve al abrir el cajón, que es cuando hace falta saber
 * precio y stock. Resolverlo al cargar gastaría una petición en cada visita para
 * un carrito que igual nadie abre.
 */
export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const dispatch = useAppDispatch()
  const lineas = useAppSelector(selectCartLines)
  const subtotal = useAppSelector(selectCartSubtotal)
  const vacio = useAppSelector(selectCartIsEmpty)
  const { status, error, notice } = useAppSelector((state) => state.cart)

  useEffect(() => {
    if (open) {
      void dispatch(resolveCart())
    }
  }, [open, dispatch])

  return (
    <Drawer anchor="right" open={open} onClose={onClose} aria-label="Carrito de compras">
      <Box sx={{ width: CART_DRAWER_WIDTH, p: 3 }} role="dialog" aria-modal="true">
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
        >
          <Typography variant="h6">Tu carrito</Typography>
          <Button size="small" onClick={onClose}>
            Cerrar
          </Button>
        </Stack>

        {notice !== null ? <Alert severity="warning">{notice}</Alert> : null}
        {error !== null ? <Alert severity="error">{error}</Alert> : null}

        {vacio ? (
          <Stack spacing={2} sx={{ mt: 4, alignItems: 'flex-start' }}>
            <Typography variant="body2">Tu carrito está vacío.</Typography>
            <Button component={Link} to="/" variant="outlined" size="small">
              Ver cafés
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ mt: 2 }}>
            {lineas.map((linea) => (
              <LineaDelCarrito key={linea.item.variantId} line={linea} />
            ))}

            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="subtitle1">Subtotal</Typography>
              <Typography variant="subtitle1">{formatCop(subtotal)}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              El IVA y el envío se calculan en el checkout.
            </Typography>
          </Stack>
        )}

        {status === 'loading' ? (
          <Typography variant="caption" color="text.secondary">
            Actualizando el carrito…
          </Typography>
        ) : null}
      </Box>
    </Drawer>
  )
}
