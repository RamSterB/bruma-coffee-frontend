import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Link as MuiLink, Stack, TextField, Typography } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { signIn } from '../features/auth/authSlice'

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * El formulario no repite las reglas del backend: solo para las que son
 * obviouses sin red (un correo sin arroba, una contraseña vacía). Las de verdad
 * —contraseña corta, correo ya en uso, credenciales que no cuadran— las responde
 * el servidor, y duplicarlas aquí daría dos verdades que se contradicen.
 */
export function SignInPage() {
  const dispatch = useAppDispatch()
  const navegar = useNavigate()
  const errorDelServidor = useAppSelector((estado) => estado.auth.error)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [faltanCampos, setFaltanCampos] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()

    if (!CORREO_VALIDO.test(email) || password === '') {
      setFaltanCampos(true)

      return
    }

    setFaltanCampos(false)
    setEnviando(true)

    try {
      // `unwrap` es lo que evita el fallo más tonto de esta pantalla: navegar
      // también cuando el login falla. Si se navega igual, la página se desmonta
      // y el mensaje de error se va con ella, y el usuario ve que no ha pasado
      // nada. El error ya queda en el store, así que aquí solo se propaga el
      // éxito.
      await dispatch(signIn({ email, password })).unwrap()
      navegar('/')
    } catch {
      // El mensaje ya está en el store y la pantalla lo enseña.
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Box sx={{ maxWidth: 420, mx: 'auto', px: 2, py: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Iniciar sesión
      </Typography>

      <Box component="form" onSubmit={enviar} noValidate>
        <Stack spacing={2}>
          <TextField
            label="Correo"
            type="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            error={faltanCampos && !CORREO_VALIDO.test(email)}
            helperText={
              faltanCampos && !CORREO_VALIDO.test(email) ? 'Escribe un correo válido' : ' '
            }
            fullWidth
          />

          <TextField
            label="Contraseña"
            type="password"
            value={password}
            onChange={(evento) => setPassword(evento.target.value)}
            error={faltanCampos && password === ''}
            helperText={faltanCampos && password === '' ? 'La contraseña es obligatoria' : ' '}
            fullWidth
          />

          {errorDelServidor !== null && <Alert severity="error">{errorDelServidor}</Alert>}

          <Button type="submit" variant="contained" disabled={enviando} fullWidth>
            {enviando ? 'Entrando…' : 'Entrar'}
          </Button>

          <Typography variant="body2">
            ¿Todavía no tienes cuenta?{' '}
            <MuiLink component={Link} to="/registro">
              Crear una cuenta
            </MuiLink>
          </Typography>
        </Stack>
      </Box>
    </Box>
  )
}
