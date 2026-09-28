import { AppBar, Badge, Box, Button, IconButton, Stack, Toolbar, Typography } from '@mui/material'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { CartDrawer } from '../features/cart/CartDrawer'
import { CheckoutModal } from '../features/checkout/CheckoutModal'
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
/** Lleva el foco al contenido, que es lo que hace falta al saltar el enlace. */
const llevarElFocoAlContenido = () => {
  document.getElementById('contenido')?.focus()
}

export function AppLayout() {
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const [resumenAbierto, setResumenAbierto] = useState(false)
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
      {/*
        El enlace para saltar al contenido, antes que nada en el DOM.

        Sin el, quien navega con teclado recorre el logo, los enlaces y el carrito en
        **cada** pagina, y el contenido nunca es lo que sigue al primer Tab. Con el,
        el primer Tab ya es una salida.

        Va oculto con `sr-only` y se revela con `not-sr-only` al recibir el foco, que
        es el motivo por el que se llama así: no molesta a quien no lo necesita y
        aparece justo a quien lo necesita.

        El `onClick` está porque mover el foco al destino no es automático: el
        navegador solo lo hace si el destino es enfocable, y por eso `main` lleva
        `tabIndex={-1}`. Con las dos cosas, funciona igual en un navegador y en las
        pruebas, que no interpretan el `href`.
      */}
      <a
        href="#contenido"
        onClick={llevarElFocoAlContenido}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded focus:bg-amber-400 focus:px-4 focus:py-2 focus:font-medium focus:text-neutral-900"
      >
        Saltar al contenido
      </a>

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

      <Box component="main" id="contenido" tabIndex={-1} sx={{ flexGrow: 1 }}>
        {/* El Outlet recibe el manejador para que la ficha pueda abrir el modal
            de pago sin tener que importarlo ni saber del store. */}
        <Outlet context={{ abrirPago: () => setResumenAbierto(true) }} />
      </Box>

      <CartDrawer
        open={carritoAbierto}
        onClose={() => setCarritoAbierto(false)}
        onContinuar={() => {
          setCarritoAbierto(false)
          setResumenAbierto(true)
        }}
      />

      <CheckoutModal open={resumenAbierto} onClose={() => setResumenAbierto(false)} />
    </Box>
  )
}
