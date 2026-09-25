import { CoffeeList } from '../features/coffee/CoffeeList'

export function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-8 bg-neutral-900 p-6 text-neutral-100">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-amber-400">Bruma Coffee</h1>
        <p className="mt-2 text-neutral-400">Cafés de especialidad</p>
      </header>
      <CoffeeList />
    </main>
  )
}
