import { createTheme } from '@mui/material/styles'

/**
 * Paleta de la tienda: fondo oscuro neutro y acentos ámbar. Tailwind sigue
 * manda en el layout (grid, espaciado, tipografía) y Material UI aporta los
 * componentes con comportamiento real: Backdrop, Dialog, Select, Pagination.
 */
export const brumaTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#fbbf24', contrastText: '#1c1917' },
    secondary: { main: '#d97706' },
    background: { default: '#171717', paper: '#262626' },
    text: { primary: '#fafaf9', secondary: '#a8a29e' },
    error: { main: '#f87171' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiBackdrop: {
      // Un velo por encima del oscurecido por defecto: el catálogo se lee mejor.
      styleOverrides: { root: { backgroundColor: 'rgba(23, 23, 23, 0.78)' } },
    },
  },
})
