import {
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { formatCop } from '../../lib/formatCurrency'
import type { Coffee } from './types'

/**
 * El detalle se presenta en un Dialog, que ya monta su propio Backdrop para
 * velar la página y cerrar con Escape o con el clic fuera.
 */
export function CoffeeDetailDialog({
  coffee,
  onClose,
}: {
  coffee: Coffee | null
  onClose: () => void
}) {
  return (
    <Dialog open={coffee !== null} onClose={onClose} maxWidth="sm" fullWidth>
      {coffee === null ? null : (
        <>
          <DialogTitle
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            {coffee.name}
            <IconButton aria-label="Cerrar" onClick={onClose} edge="end">
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent>
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {coffee.description}
              </Typography>

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Chip size="small" label={coffee.region} />
                <Chip size="small" label={coffee.process} />
                <Chip size="small" label={coffee.roastLevel} />
              </Stack>

              {coffee.tastingNotes.length > 0 ? (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {coffee.tastingNotes.map((note) => (
                    <Chip key={note} size="small" variant="outlined" label={note} />
                  ))}
                </Stack>
              ) : null}

              <Stack component="ul" spacing={1} className="m-0 list-none p-0">
                {coffee.variants.map((variant) => (
                  <Stack
                    key={variant.id}
                    component="li"
                    direction="row"
                    sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                    className="border-b border-neutral-800 pb-1"
                  >
                    <Typography variant="body2">{variant.weightGrams} g</Typography>
                    <Typography variant="body2" color="primary.light">
                      {formatCop(variant.price)}
                    </Typography>
                    {variant.stock === 0 ? (
                      <Chip size="small" color="error" variant="outlined" label="Agotado" />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {variant.stock} disponibles
                      </Typography>
                    )}
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </DialogContent>
        </>
      )}
    </Dialog>
  )
}
