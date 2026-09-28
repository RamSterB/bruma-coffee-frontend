import { Button, Chip, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../../app/hooks'
import { formatCop } from '../../lib/formatCurrency'
import { addToCart } from '../cart/cartSlice'
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
 * "Pagar con tarjeta de crédito" abre el modal de pago, que es el primer paso
 * del proceso de compra: tarjeta y envío primero, y el resumen después. No
 * crea la orden ni cobra: la orden se crea al confirmar el pago, y ese paso
 * todavía no existe.
 */
export function CoffeeDetailContent({
  coffee,
  onPagar,
}: {
  coffee: Coffee
  onPagar?: (variantId: string) => void
}) {
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

    despachar(
      addToCart({ variantId: varianteElegida.id, quantity: 1, stock: varianteElegida.stock }),
    )
    setAnunciado(true)
  }

  const pagarConTarjeta = () => {
    if (varianteId === null) {
      return
    }

    if (onPagar !== undefined) {
      onPagar(varianteId)

      return
    }

    // Sin el modal a mano, el botón sigue llevando al checkout: es el mismo
    // destino y evita que un consumidor de este contenido se quede sin salida.
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

      {/*
        `role="alert"` porque el aviso solo se distinguía por el color. El rojo no lo
        ve quien no distingue colores, y un lector de pantalla no lee un `Typography`
        suelto: se quedaba con un café que parecía disponible y dos botones
        deshabilitados sin explicación de por qué.
      */}
      {hayStock ? null : (
        <Typography variant="body2" color="error" role="alert">
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
          onClick={pagarConTarjeta}
          sx={{ minHeight: 44 }}
        >
          Pagar con tarjeta de crédito
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
