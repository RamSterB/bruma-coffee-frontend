#!/usr/bin/env node
/**
 * Compila la tienda para publicarla, y se niega a hacerlo sin `VITE_API_ORIGIN`.
 *
 * Sin ese origen, las peticiones salen con ruta relativa, llegan a la distribución de la
 * tienda, y el reescrito de rutas devuelve el `index.html` donde el cliente esperaba
 * JSON. El resultado es una tienda que carga, se ve bien y **no compra**: un 200 con
 * HTML, que ni la consola ni el panel de red señalan como error. Pasa el `pnpm build` de
 * todas partes, y por eso hace falta una puerta que separe "compilar para comprobar" de
 * "compilar para publicar".
 *
 * Uso:
 *   VITE_API_ORIGIN=https://<api>.cloudfront.net pnpm build:publicacion
 */
import { spawnSync } from 'node:child_process'

const origen = process.env.VITE_API_ORIGIN ?? ''

if (origen === '' || !/^https?:\/\/[^/\s]+/.test(origen)) {
  console.error(
    [
      'Falta VITE_API_ORIGIN, o no es una dirección completa.',
      '',
      'Sin ella la tienda pide al dominio que la sirve, el reescrito de rutas devuelve el',
      'index.html donde se esperaba la API, y la compra no llega a completarse nunca.',
      '',
      '  VITE_API_ORIGIN=https://<api>.cloudfront.net pnpm build:publicacion',
    ].join('\n'),
  )
  process.exit(1)
}

const compilacion = spawnSync('pnpm', ['build'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_API_ORIGIN: origen },
  shell: process.platform === 'win32',
})

process.exit(compilacion.status ?? 1)
