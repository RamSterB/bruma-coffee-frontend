import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from './hooks'

/**
 * Las dos guardas de ruta, y por qué están aquí y no en cada página.
 *
 * Una pantalla protegida que se abre sin sesión no puede hacer su trabajo: pide datos
 * que el servidor le va a rechazar, pinta un aviso y deja a la persona en un sitio
 * donde no puede avanzar. Lo honesto es llevarla a entrar.
 *
 * Y lo simétrico, que se olvida más: un formulario de acceso para quien ya está
 * dentro no explica por qué aparece, y además invita a volver a escribir la
 * contraseña sin necesidad.
 *
 * **Lo que estas guardas NO hacen, y es lo importante:** no deciden mientras la sesión
 * se está recuperando. Al abrir el sitio el token de acceso está en memoria y el de
 * refresco en una cookie `httpOnly`, así que la sesión se recupera sola contra el
 * servidor. Una guarda que redirija en ese instante expulsa a quien sí la tiene cada
 * vez que recarga, y el token de refresco no llega a usarse nunca. Por eso hay un
 * tercer estado además de "con sesión" y "sin sesión", y en ese estado no se hace nada.
 */

/** A donde va quien necesita sesion. Y tambien quien no tiene el rol: ver `RutaPrivada`. */
export const RUTA_DE_ACCESO = '/entrar'

/** A donde va quien ya tiene sesion y ha entrado a la de acceso. La portada, que es donde se compra. */
export const RUTA_PUBLICA_POR_DEFECTO = '/'

/**
 * Para pantallas privadas, y opcionalmente para un rol concreto.
 *
 * **Sin sesión y sin el rol se va al mismo sitio, y ese detalle es el importante.**
 *
 * Lo tentador es diferenciarlos: un 403 para quien tiene sesión pero no el rol, que es
 * lo que hace un servidor. En el cliente es un error, por dos razones.
 *
 * La primera es que **un 404 afirma que la pantalla no existe**, y aquí sí que existe:
 * acaba de sugerir que se vaya a entrar, lo cual le da la pista de que hay algo detrás.
 * Y la segunda es práctica: quien no tiene el rol tampoco puede iniciar sesión con una
 * cuenta que sí lo tenga, así que mandarle a la pantalla de acceso lo devuelve a la
 * portada. Acaba en un sitio donde puede comprar, que es lo que quería, en vez de en un
 * callejón sin salida.
 *
 * Y no se renderiza el contenido antes de redirigir, ni un instante: un parpadeo
 * revela que la pantalla existe.
 *
 * Mientras no se sepa si hay sesión, no se hace nada. Ver la nota de arriba: antes de
 * saberlo, expulsar a quien sí la tiene es el fallo más caro que puede tener esta guarda.
 */
export function RutaPrivada({ children, rol }: { children: ReactNode; rol?: string }) {
  const status = useAppSelector((estado) => estado.auth.status)
  const rolDeLaSesion = useAppSelector((estado) => estado.auth.user?.role)
  const navegar = useNavigate()

  const sinPermiso = status === 'autenticada' && rol !== undefined && rolDeLaSesion !== rol

  useEffect(() => {
    if (status === 'anonima' || sinPermiso) {
      navegar(RUTA_DE_ACCESO, { replace: true })
    }
  }, [status, sinPermiso, navegar])

  if (status !== 'autenticada' || sinPermiso) {
    return null
  }

  return children
}

/**
 * Solo para pantallas de acceso y registro, que no tienen sentido con la sesión ya
 * abierta. Aquí sí se renderiza el formulario mientras se recupera la sesión: se
 * muestra un instante y desaparece solo si había sesión, y mientras tanto es
 * utilizable.
 */
export function RutaPublica({ children }: { children: ReactNode }) {
  const status = useAppSelector((estado) => estado.auth.status)
  const navegar = useNavigate()

  useEffect(() => {
    if (status === 'autenticada') {
      navegar(RUTA_PUBLICA_POR_DEFECTO, { replace: true })
    }
  }, [status, navegar])

  return children
}
