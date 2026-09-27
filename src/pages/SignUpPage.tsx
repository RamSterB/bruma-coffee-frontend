import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Box, Button, Link as MuiLink, Stack, TextField, Typography } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { signUp } from '../features/auth/authSlice'

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

/**
 * El registro no abre sesión: el backend responde siempre lo mismo para no decir
 * qué correos existen, y quien se registra todavía no ha verificado su correo.
 * Por eso la pantalla termina pidiendo iniciar sesión, en vez de llevar a un
 * sitio donde no hay nada que hacer todavía.
 *
 * El mensaje de éxito es intencionadamente el mismo que daría el backend. Si la
 * interfaz escribiera "¡Cuenta creada!", bastaría un intento para enumerar los
 * correos dados de alta.
 */
export function SignUpPage() {
  const dispatch = useAppDispatch()
  const errorDelServidor = useAppSelector((estado) => estado.auth.error)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [faltanCampos, setFaltanCampos] = useState(false)
  const [registrado, setRegistrado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const correoValido = CORREO_VALIDO.test(email)
  const passwordValida = password.length >= MIN_PASSWORD_LENGTH
  const nombreValido = fullName.trim().length >= 3

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()

    if (!correoValido || !passwordValida || !nombreValido) {
      setFaltanCampos(true)

      return
    }

    setFaltanCampos(false)
    setEnviando(true)

    try {
      await dispatch(signUp({ email, password, fullName })).unwrap()
      setRegistrado(true)
    } catch {
      // El mensaje ya está en el store y la pantalla lo enseña.
    } finally {
      setEnviando(false)
    }
  }

  if (registrado) {
    return (
      <Box sx={{ maxWidth: 420, mx: 'auto', px: 2, py: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Revisa tu correo
        </Typography>
        <Stack spacing={2}>
          <Alert severity="success">
            Si ese correo puede registrarse, recibirás un mensaje con el enlace de verificación.
          </Alert>
          <Typography variant="body2">
            Verifica el correo y luego{' '}
            <MuiLink component={Link} to="/entrar">
              inicia sesión
            </MuiLink>
            .
          </Typography>
        </Stack>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 420, mx: 'auto', px: 2, py: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Crear una cuenta
      </Typography>

      <Box component="form" onSubmit={enviar} noValidate>
        <Stack spacing={2}>
          <TextField
            label="Nombre"
            value={fullName}
            onChange={(evento) => setFullName(evento.target.value)}
            error={faltanCampos && !nombreValido}
            helperText={faltanCampos && !nombreValido ? 'Escribe tu nombre' : ' '}
            fullWidth
          />

          <TextField
            label="Correo"
            type="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            error={faltanCampos && !correoValido}
            helperText={faltanCampos && !correoValido ? 'Escribe un correo válido' : ' '}
            fullWidth
          />

          <TextField
            label="Contraseña"
            type="password"
            value={password}
            onChange={(evento) => setPassword(evento.target.value)}
            error={faltanCampos && !passwordValida}
            helperText="Mínimo 8 caracteres"
            fullWidth
          />

          {errorDelServidor !== null && <Alert severity="error">{errorDelServidor}</Alert>}

          <Button type="submit" variant="contained" disabled={enviando} fullWidth>
            {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
          </Button>

          <Typography variant="body2">
            ¿Ya tienes cuenta?{' '}
            <MuiLink component={Link} to="/entrar">
              Iniciar sesión
            </MuiLink>
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}
