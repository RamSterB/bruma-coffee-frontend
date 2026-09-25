import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiUrl = process.env.VITE_API_URL ?? 'http://host.docker.internal:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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