import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-title">
      <h1 id="not-found-title">Página no encontrada</h1>
      <p>La ruta que buscas no existe.</p>
      <Link to="/">Volver al inicio</Link>
    </section>
  )
}
