import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material'
import type { ReactNode } from 'react'
import { brumaTheme } from './theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <MuiThemeProvider theme={brumaTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  )
}
