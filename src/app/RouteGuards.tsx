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

/** Where to send someone who needs a session. */
export const RUTA_DE_ACCESO = '/entrar'

/** Where to send someone who already has one. */
export const RUTA_DE_CUENTA = '/cuenta'

/**
 * Solo para pantallas que necesitan sesión. Mientras no se sepa si la hay, no se
 * renderiza nada: mejor un instante en blanco que un empujón a la pantalla de acceso
 * que después hay que deshacer.
 */
export function RutaPrivada({ children }: { children: ReactNode }) {
  const status = useAppSelector((estado) => estado.auth.status)
  const navegar = useNavigate()

  useEffect(() => {
    if (status === 'anonima') {
      navegar(RUTA_DE_ACCESO, { replace: true })
    }
  }, [status, navegar])

  if (status !== 'autenticada') {
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
      navegar(RUTA_DE_CUENTA, { replace: true })
    }
  }, [status, navegar])

  return children
}
