import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// En desarrollo, el destino del proxy. La aplicacion no la usa: sus peticiones van a
// rutas relativas y las traduce el proxy.
const apiUrl = process.env.VITE_API_URL ?? 'http://host.docker.internal:8000'

// En produccion, el origen publico de la API, que se compila dentro del bundle.
//
// Es una variable **aparte** y no la misma, a proposito: mezclarlas obliga a adivinar si
// estamos en un modo o en otro para decidir si la URL se usa de una manera o de la
// otra. En desarrollo el proxy devuelve cookies de la sesion, y en produccion la API
// esta en otro dominio y tiene que hablar de frente.
//
// **Para publicar hay que ponerla, y `scripts/compilar-para-publicacion.mjs` no deja
// compilar sin ella.** Con la cadena vacia las peticiones salen con ruta relativa, caen
// en la distribucion de la tienda y el reescrito de rutas devuelve el `index.html` donde
// se esperaba JSON: un 200 con HTML, que ni la consola ni la red señalan como error.
// Aqui la comprobacion no puede estar porque CI tambien compila y no publica.
const origenDeLaApi = process.env.VITE_API_ORIGIN ?? ''

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // Vite sustituye el identificador en el bundle. Se lee dentro de una funcion y no al
    // cargar el modulo, para que las pruebas puedan cambiarlo.
    __API_ORIGIN__: JSON.stringify(origenDeLaApi),
  },
  build: {
    rolldownOptions: {
      output: {
        // MUI cambia muy rara vez: separarla evita invalidar la app en cada build.
        advancedChunks: {
          groups: [
            { name: 'mui', test: /[\\/]node_modules[\\/]@mui[\\/]/ },
            { name: 'vendor', test: /[\\/]node_modules[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiUrl,
        changeOrigin: true,
      },
    },
  },
})
