/**
 * De dónde sale la URL de la API.
 *
 * **En desarrollo no hay nada que configurar:** el frontend y el backend comparten
 * origen y la petición va a `/api`, que es lo que el proxy de Vite traduce. Por eso el
 * valor por defecto es la cadena vacía y no una dirección.
 *
 * **En producción sí la hay, y es obligatoria.** El frontend lo sirve una distribución
 * de CloudFront y la API vive en otro origen, detrás de su balanceador. Con la ruta
 * relativa, la petición acabaría en CloudFront, volvería el `index.html` de la tienda
 * y el cliente reventaría al intentar leerlo como JSON: un error que no dice nada de
 * sesiones ni de red, sino de formato.
 *
 * El valor lo inyecta Vite al compilar, con `define`. Se lee **dentro de la función y
 * no al cargar el módulo** a propósito: leerlo arriba lo congelaría al importar, que es
 * justo lo que impide probarlo.
 */
declare const __API_ORIGIN__: string | undefined

export const origenDeLaApi = (): string => {
  // En la compilacion, Vite sustituye el identificador por el valor. En las pruebas no
  // hay sustitucion, asi que se lee del global, que es lo que permite cambiarlo.
  const inyectado =
    typeof __API_ORIGIN__ === 'string'
      ? __API_ORIGIN__
      : (globalThis as { __API_ORIGIN__?: string }).__API_ORIGIN__

  return (inyectado ?? '').replace(/\/+$/, '')
}
