import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { fetchCoffees } from './coffeeSlice'

export function CoffeeList() {
  const dispatch = useAppDispatch()
  const { items, loading, error } = useAppSelector((state) => state.coffee)

  useEffect(() => {
    void dispatch(fetchCoffees())
  }, [dispatch])

  if (loading) {
    return <p className="text-amber-200">Cargando cafés...</p>
  }

  if (error) {
    return <p className="text-red-400">Error: {error}</p>
  }

  return (
    <ul className="w-full max-w-md space-y-3">
      {items.map((coffee) => (
        <li
          key={coffee.id}
          className="rounded-xl border border-amber-800 bg-amber-900/30 p-4"
        >
          <h3 className="text-lg font-semibold text-amber-100">{coffee.name}</h3>
          <p className="text-sm text-amber-300">{coffee.region}</p>
          <p className="mt-1 text-amber-200">${coffee.price.toFixed(2)}</p>
        </li>
      ))}
    </ul>
  )
}