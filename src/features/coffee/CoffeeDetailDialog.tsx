import { Dialog, DialogContent, DialogTitle, IconButton, Stack } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { Link } from 'react-router-dom'
import { CoffeeDetailContent } from './CoffeeDetailContent'
import type { Coffee } from './types'

/**
 * Vista rápida del catálogo. Comparte su contenido con la ruta `/cafe/:id`, de
 * modo que la información y el selector de variante viven en un solo sitio; el
 * enlace a la ficha completa es para quien quiere una URL compartible.
 */
export function CoffeeDetailDialog({
  coffee,
  onClose,
  onPagar,
}: {
  coffee: Coffee | null
  onClose: () => void
  onPagar: (variantId: string) => void
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
              <CoffeeDetailContent coffee={coffee} onPagar={onPagar} />

              <Link to={`/cafe/${coffee.id}`} className="text-sm text-amber-400 underline">
                Ver ficha completa
              </Link>
            </Stack>
          </DialogContent>
        </>
      )}
    </Dialog>
  )
}
