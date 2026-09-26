import { AppBar, Badge, Box, IconButton, Stack, Toolbar, Typography } from '@mui/material'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'
import { CartDrawer } from '../features/cart/CartDrawer'
import { selectCartCount } from '../features/cart/cartSlice'

/**
 * La barra y el cajón viven aquí y no en cada página: el carrito es de la
 * tienda entera, no de una vista. El contador sale del store, así que
 * cualquier página que añada algo lo refleja sin saber nada del cajón.
 */
export function AppLayout() {
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const unidades = useAppSelector(selectCartCount)

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
            <IconButton
              aria-label={`Carrito con ${unidades} unidades`}
              color="inherit"
              onClick={() => setCarritoAbierto(true)}
            >
              <Badge badgeContent={unidades} color="secondary">
                <ShoppingCartOutlinedIcon />
              </Badge>
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
