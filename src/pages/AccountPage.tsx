import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Link as MuiLink, Stack, Typography } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { signOut } from '../features/auth/authSlice'

/**
 * Lo que se ve de la sesión, y nada más. El historial de órdenes vive en la fase
 * de pedidos, así que aquí no se enseña una lista vacía que luego habrá que
 * rellenar.
 */
export function AccountPage() {
  const dispatch = useAppDispatch()
  const navegar = useNavigate()
  const usuario = useAppSelector((estado) => estado.auth.user)
  const estaAutenticada = useAppSelector((estado) => estado.auth.status === 'autenticada')

  if (usuario === null) {
    return (
      <Box sx={{ maxWidth: 420, mx: 'auto', px: 2, py: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Mi cuenta
        </Typography>
        <Alert severity="info">
          Todavía no has iniciado sesión.{' '}
          <MuiLink component={RouterLink} to="/entrar">
            Iniciar sesión
          </MuiLink>
        </Alert>
      </Box>
    )
  }

  const cerrarSesion = async () => {
    await dispatch(signOut())
    navegar('/')
  }

  return (
    <Box sx={{ maxWidth: 420, mx: 'auto', px: 2, py: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Mi cuenta
      </Typography>

      <Stack spacing={2} sx={{ mt: 2 }}>
        <Box>
          <Typography variant="subtitle1">{usuario.fullName}</Typography>
          <Typography variant="body2" color="text.secondary">
            {usuario.email}
          </Typography>
        </Box>

        {!estaAutenticada && (
          <Alert severity="warning">Tu sesión no está activa. Vuelve a iniciar sesión.</Alert>
        )}

        {!usuario.isEmailVerified && (
          <Alert severity="warning">
            Tu correo no está verificado. Algunas cosas no se pueden hacer hasta que lo verifiques.
          </Alert>
        )}

        <Button onClick={cerrarSesion} variant="outlined">
          Cerrar sesión
        </Button>
      </Stack>
    </Box>
  )
}
