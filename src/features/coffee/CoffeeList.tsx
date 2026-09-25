import { useCallback, useEffect, useState } from 'react'
import { Backdrop, CircularProgress, Pagination, Stack, Typography } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { ErrorState } from '../../components/ErrorState'
import { CoffeeCard } from './CoffeeCard'
import { CoffeeDetailDialog } from './CoffeeDetailDialog'
import { CoffeeFiltersBar } from './CoffeeFiltersBar'
import { fetchCoffees, setFilters, setPage } from './coffeeSlice'
import type { Coffee } from './types'

export function CoffeeList() {
  const dispatch = useAppDispatch()
  const { items, total, page, totalPages, filters, loading, error } = useAppSelector(
    (state) => state.coffee,
  )
  const [openCoffee, setOpenCoffee] = useState<Coffee | null>(null)

  useEffect(() => {
    void dispatch(fetchCoffees())
  }, [dispatch, filters, page])

  const retry = useCallback(() => {
    void dispatch(fetchCoffees())
  }, [dispatch])

  const onFilterChange = useCallback(
    (next: typeof filters) => {
      dispatch(setFilters(next))
    },
    [dispatch],
  )

  const onSearch = useCallback(
    (search: string) => {
      dispatch(setFilters({ ...filters, search: search === '' ? undefined : search }))
    },
    [dispatch, filters],
  )

  if (error) {
    return <ErrorState message={error} onRetry={retry} />
  }

  return (
    <Stack spacing={3} className="w-full max-w-5xl">
      <CoffeeFiltersBar filters={filters} onChange={onFilterChange} onSearch={onSearch} />

      {items.length === 0 && !loading ? (
        <Typography
          className="rounded-xl border border-dashed border-neutral-700 p-8 text-center text-neutral-400"
          component="p"
        >
          No hay cafés que coincidan con los filtros aplicados.
        </Typography>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((coffee) => (
            <li key={coffee.id} className="h-full">
              <CoffeeCard coffee={coffee} onOpen={() => setOpenCoffee(coffee)} />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'center', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {total} cafés · página {page} de {totalPages}
          </Typography>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, nextPage) => dispatch(setPage(nextPage))}
            color="primary"
          />
        </Stack>
      ) : null}

      <CoffeeDetailDialog coffee={openCoffee} onClose={() => setOpenCoffee(null)} />

      <Backdrop open={loading} data-testid="catalog-backdrop">
        <CircularProgress color="primary" aria-label="Cargando cafés" />
        <Typography className="absolute top-[calc(50%+3rem)] text-neutral-300">Cargando cafés</Typography>
      </Backdrop>
    </Stack>
  )
}
