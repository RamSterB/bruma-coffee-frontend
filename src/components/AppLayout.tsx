import { AppBar, Badge, Box, Button, IconButton, Stack, Toolbar, Typography } from '@mui/material'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { CartDrawer } from '../features/cart/CartDrawer'
import { selectCartCount } from '../features/cart/cartSlice'
import {
  restoreSession,
  selectEstaAutenticada,
  selectSesionSolicitada,
  sesionSolicitada,
} from '../features/auth/authSlice'

/**
 * La barra y el cajón viven aquí y no en cada página: el carrito es de la
 * tienda entera, no de una vista. El contador sale del store, así que
 * cualquier página que añada algo lo refleja sin saber nada del cajón.
 */
export function AppLayout() {
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const unidades = useAppSelector(selectCartCount)
  const dispatch = useAppDispatch()
  const yaSolicitada = useAppSelector(selectSesionSolicitada)
  const estaAutenticada = useAppSelector(selectEstaAutenticada)

  /**
   * Al recargar no hay token en memoria: quien lo tiene es la cookie `httpOnly`
   * del refresh, que JavaScript no puede leer. Por eso al montar se pide la
   * sesión una vez y, si la cookie no estaba, la app abre en modo invitado sin
   * haberlo pedido. La marca vive en el store porque el layout se vuelve a montar
   * en cada navegación, y un `useRef` pediría la sesión otra vez: eso sería un
   * refresh de más, y una rotación de token que nadie pidió.
   */
  useEffect(() => {
    if (yaSolicitada) {
      return
    }

    dispatch(sesionSolicitada())
    void dispatch(restoreSession())
  }, [dispatch, yaSolicitada])

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky">
        <Toolbar>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', width: '100%' }}>
            <Typography
              variant="h6"
              component={Link}
              to="/"
              sx={{ color: 'inherit', textDecoration: 'none', flexGrow: 1 }}
            >
              Bruma Coffee
            </Typography>
            {estaAutenticada ? (
              <Button component={Link} to="/cuenta" color="inherit" sx={{ textTransform: 'none' }}>
                Mi cuenta
              </Button>
            ) : (
              <Button component={Link} to="/entrar" color="inherit" sx={{ textTransform: 'none' }}>
                Iniciar sesión
              </Button>
            )}

            <IconButton
              aria-label={`Carrito con ${unidades} unidades`}
              color="inherit"
              onClick={() => setCarritoAbierto(true)}
            >
              {/* Con el carrito vacío no se pinta el contador. Ocultarlo con
                  `invisible` no sirve: el "0" sigue en el DOM y lo leen el
                  lector de pantalla y las pruebas, que es justo lo que no debe
                  pasar. Con cero unidades no hay nada que contar. */}
              {unidades > 0 ? (
                <Badge badgeContent={unidades} color="secondary">
                  <ShoppingCartOutlinedIcon />
                </Badge>
              ) : (
                <ShoppingCartOutlinedIcon />
              )}
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>

      <CartDrawer open={carritoAbierto} onClose={() => setCarritoAbierto(false)} />
    </Box>
  )
}
