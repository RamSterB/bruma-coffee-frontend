import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { formatCop } from '../../lib/formatCurrency'
import { fetchCoffees } from './coffeeSlice'

export function CoffeeList() {
  const dispatch = useAppDispatch()
  const { items, loading, error } = useAppSelector((state) => state.coffee)

  useEffect(() => {
    void dispatch(fetchCoffees())
  }, [dispatch])

  const retry = useCallback(() => {
    void dispatch(fetchCoffees())
  }, [dispatch])

  if (loading) {
    return <LoadingState message="Cargando cafés" />
  }

  if (error) {
    return <ErrorState message={error} onRetry={retry} />
  }

  return (
    <ul className="w-full max-w-md space-y-3">
      {items.map((coffee) => (
        <li key={coffee.id} className="rounded-xl border border-amber-800 bg-amber-900/30 p-4">
          <h3 className="text-lg font-semibold text-amber-100">{coffee.name}</h3>
          <p className="text-sm text-amber-300">{coffee.region}</p>
          <p className="mt-1 text-amber-200">{formatCop(coffee.price)}</p>
        </li>
      ))}
    </ul>
  )
}
