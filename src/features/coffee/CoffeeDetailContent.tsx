import { Button, Chip, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../../app/hooks'
import { formatCop } from '../../lib/formatCurrency'
import { addItem } from '../cart/cartSlice'
import type { Coffee, CoffeeVariant } from './types'

const primeraConStock = (variants: CoffeeVariant[]): CoffeeVariant | undefined =>
  variants.find((variant) => variant.stock > 0)

const EtiquetaDeVariante = ({ variant }: { variant: CoffeeVariant }) => (
  <Stack
    direction="row"
    spacing={2}
    sx={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}
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
)

/**
 * El contenido de la ficha, sin contenedor. Lo comparten la ruta `/cafe/:id` y
 * el diálogo del catálogo, de modo que la información y el selector de variante
 * viven en un solo sitio.
 *
 * "Agregar al carrito" deja la variante elegida en el carrito y sigue en la
 * ficha, para poder seguir mirando cafés. Solo se guarda el identificador y la
 * cantidad: el precio y el stock los vuelve a poner el servidor al abrir el
 * cajón.
 *
 * "Comprar ahora" no crea la orden: navega al checkout con el café y la variante
 * elegidos. La orden se crea en el checkout, cuando ya se pueden calcular los
 * totales y capturar la dirección.
 */
export function CoffeeDetailContent({ coffee }: { coffee: Coffee }) {
  const navegar = useNavigate()
  const despachar = useAppDispatch()
  const inicial = useMemo(() => primeraConStock(coffee.variants), [coffee.variants])
  const [varianteId, setVarianteId] = useState<string | null>(inicial?.id ?? null)
  const [anunciado, setAnunciado] = useState(false)

  const hayStock = coffee.variants.some((variant) => variant.stock > 0)
  const varianteElegida = coffee.variants.find((variant) => variant.id === varianteId)

  // El aviso de confirmación es de una acción: al cambiar de variante deja de
  // tener sentido, asi que se retira en vez de quedarse mentiriendo.
  useEffect(() => setAnunciado(false), [varianteId])

  const agregarAlCarrito = () => {
    if (varianteElegida === undefined) {
      return
    }

    despachar(addItem({ variantId: varianteElegida.id, quantity: 1, stock: varianteElegida.stock }))
    setAnunciado(true)
  }

  const comprarAhora = () => {
    if (varianteId === null) {
      return
    }

    const parametros = new URLSearchParams({ coffee: coffee.id, variant: varianteId })
    navegar(`/checkout?${parametros.toString()}`)
  }

  return (
    <Stack spacing={3}>
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

      <RadioGroup
        aria-label="Variantes de peso"
        value={varianteId}
        onChange={(event) => setVarianteId(event.target.value)}
      >
        {coffee.variants.map((variant) => (
          <FormControlLabel
            key={variant.id}
            value={variant.id}
            disabled={variant.stock === 0}
            control={<Radio />}
            label={<EtiquetaDeVariante variant={variant} />}
            sx={{
              m: 0,
              px: 1,
              minHeight: 44,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              alignItems: 'center',
            }}
          />
        ))}
      </RadioGroup>

      {hayStock ? null : (
        <Typography variant="body2" color="error">
          No hay variantes disponibles
        </Typography>
      )}

      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="outlined"
          disabled={varianteElegida === undefined}
          onClick={agregarAlCarrito}
          sx={{ minHeight: 44 }}
        >
          Agregar al carrito
        </Button>
        <Button
          variant="contained"
          disabled={varianteId === null}
          onClick={comprarAhora}
          sx={{ minHeight: 44 }}
        >
          Comprar ahora
        </Button>
      </Stack>

      {anunciado ? (
        <Typography role="status" variant="body2" color="success.main">
          Añadido al carrito
        </Typography>
      ) : null}
    </Stack>
  )
}
