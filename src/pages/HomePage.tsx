import { CoffeeList } from '../features/coffee/CoffeeList'

export function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-neutral-900 p-4 text-neutral-100 sm:gap-8 sm:p-6 lg:p-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-amber-400 sm:text-4xl">Bruma Coffee</h1>
        <p className="mt-2 text-sm text-neutral-400 sm:text-base">Cafés de especialidad</p>
      </header>
      <CoffeeList />
    </main>
  )
}
