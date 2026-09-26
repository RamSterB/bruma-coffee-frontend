import { Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { CoffeeDetailContent } from '../features/coffee/CoffeeDetailContent'
import { fetchCoffeeById } from '../features/coffee/coffeeDetailSlice'

export function CoffeeDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const { item, loading, error, notFound } = useAppSelector((state) => state.coffeeDetail)

  useEffect(() => {
    void dispatch(fetchCoffeeById(id))
  }, [dispatch, id])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-900 p-4 text-neutral-100">
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <CircularProgress aria-hidden />
          <Typography variant="body2">Cargando café…</Typography>
        </Stack>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-900 p-4 text-neutral-100">
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography variant="h5" component="h1">
            No encontramos ese café
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Puede que el enlace esté mal escrito o que el café ya no esté en el catálogo.
          </Typography>
          <Button component={Link} to="/" variant="outlined">
            Volver al catálogo
          </Button>
        </Stack>
      </main>
    )
  }

  if (error !== null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-900 p-4 text-neutral-100">
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography variant="h5" component="h1">
            No pudimos cargar el café
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
          <Button variant="outlined" onClick={() => void dispatch(fetchCoffeeById(id))}>
            Reintentar
          </Button>
        </Stack>
      </main>
    )
  }

  if (item === null) {
    return null
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-neutral-900 p-4 text-neutral-100 sm:p-6 lg:p-8">
      <Stack spacing={4} sx={{ width: '100%', maxWidth: 640 }}>
        <header className="flex flex-col gap-2">
          <Typography variant="h4" component="h1" className="text-amber-400">
            {item.name}
          </Typography>
          <Link to="/" className="text-sm text-neutral-400 underline">
            Volver al catálogo
          </Link>
        </header>

        <CoffeeDetailContent coffee={item} />
      </Stack>
    </main>
  )
}
