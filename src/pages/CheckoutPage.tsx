import { Stack, Typography } from '@mui/material'
import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { fetchCoffeeById } from '../features/coffee/coffeeDetailSlice'
import { formatCop } from '../lib/formatCurrency'

/**
 * Marcador de posición del checkout, que se construye en el incremento F5.
 *
 * "Comprar ahora" no crea la orden: se limita a traer aquí el café y la variante
 * elegidos. La orden se crea cuando ya se pueden calcular los totales y
 * capturar la dirección, porque la tabla de órdenes no admite una a medio hacer.
 */
export function CheckoutPage() {
  const [parametros] = useSearchParams()
  const dispatch = useAppDispatch()
  const { item, loading, notFound } = useAppSelector((state) => state.coffeeDetail)

  const coffeeId = parametros.get('coffee')
  const variantId = parametros.get('variant')

  useEffect(() => {
    if (coffeeId !== null) {
      void dispatch(fetchCoffeeById(coffeeId))
    }
  }, [dispatch, coffeeId])

  if (coffeeId === null || variantId === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-900 p-4 text-neutral-100">
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography variant="h5" component="h1">
            No sabemos qué café quieres comprar
          </Typography>
          <Typography component={Link} to="/" className="text-sm text-amber-400 underline">
            Volver al catálogo
          </Typography>
        </Stack>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-900 p-4 text-neutral-100">
        <Typography variant="body2">Ese café ya no está en el catálogo.</Typography>
      </main>
    )
  }

  const variante = item?.variants.find((candidate) => candidate.id === variantId)

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-900 p-4 text-neutral-100">
      <Stack spacing={3} sx={{ maxWidth: 480 }}>
        <Typography variant="h5" component="h1" className="text-amber-400">
          {item === null || loading ? 'Cargando…' : item.name}
        </Typography>

        {variante === undefined ? (
          <Typography variant="body2" color="text.secondary">
            {item === null || loading ? ' ' : 'Esa variante no existe.'}
          </Typography>
        ) : (
          <Stack spacing={1}>
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
              <Typography variant="body2">{variante.weightGrams} g</Typography>
              <Typography variant="body2" color="primary.light">
                {formatCop(variante.price)}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              El precio no incluye IVA.
            </Typography>
          </Stack>
        )}

        <Typography variant="body2">
          El checkout llega en un próximo incremento. Todavía no se puede confirmar el pago.
        </Typography>

        <Typography component={Link} to="/" className="text-sm text-amber-400 underline">
          Volver al catálogo
        </Typography>
      </Stack>
    </main>
  )
}
