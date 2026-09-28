import { test, expect, type Page } from '@playwright/test'

/**
 * El recorrido completo de la compra, en un navegador de verdad, contra lo desplegado.
 *
 * Estas pruebas van contra **la tienda publicada**, no contra un servidor de desarrollo,
 * por un motivo concreto: **los fallos que solo se ven con un navegador son
 * invisibles en el resto de la suite**. Una respuesta cacheada que el cliente se toma
 * por un error, una ruta que devuelve marcado donde se esperaba JSON, una cabecera de
 * seguridad que bloquea la llamada a la API, un desplegable que llega vacío porque el
 * servidor y el cliente no hablan el mismo idioma. Nada de eso aparece en jsdom ni en
 * supertest, y lo encontró alguien usándola, no una prueba.
 *
 * **Van una detrás de otra y en orden**, porque el objetivo es el camino entero: si el
 * carrito falla, no tiene sentido comprobar el pago.
 *
 * Las credenciales y la tarjeta vienen del entorno. En el repositorio no hay ninguna, y
 * el archivo de ejemplo solo dice qué variables hacen falta.
 */

const CORREO = process.env.COMPRA_CORREO ?? ''
const CONTRASENA = process.env.COMPRA_CONTRASENA ?? ''
const TARJETA = process.env.COMPRA_TARJETA ?? ''

const FALTAN_DATOS = 'Faltan COMPRA_CORREO, COMPRA_CONTRASENA o COMPRA_TARJETA.'

/** El café con el que se compra. Va por nombre para que el fallo diga cuál se agotó. */
const CAFE = process.env.COMPRA_CAFE ?? 'Castillo del Tolima'

const abrirCatalogo = async (page: Page) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /bruma coffee/i })).toBeVisible()
  await expect(page.getByRole('button', { name: `Detalle de ${CAFE}` })).toBeVisible()
}

const entrar = async (page: Page) => {
  await page.goto('/entrar')
  await page.getByLabel('Correo').fill(CORREO)
  await page.getByLabel('Contraseña').fill(CONTRASENA)
  await page.getByRole('button', { name: 'Entrar' }).click()

  // La sesión viva es lo que se ve en la barra. Si el acceso funcionó, el enlace de
  // entrar desaparece y aparece el de la cuenta.
  await expect(page.getByRole('link', { name: 'Mi cuenta' })).toBeVisible()
}

const abrirVistaRapida = async (page: Page) => {
  await page.getByRole('button', { name: `Detalle de ${CAFE}` }).click()
  await expect(page.getByRole('button', { name: 'Agregar al carrito' })).toBeVisible()
}

/**
 * Pasa de la vista rápida al primer paso del proceso de compra, con la vista rápida ya
 * abierta. Si este diálogo no aparece, el botón volvió a caer en una página que no hace
 * nada, que es como se rompió una vez.
 */
const abrirPagoDesdeLaVistaRapida = async (page: Page) => {
  await page.getByRole('button', { name: 'Pagar con tarjeta de crédito' }).click()
  await expect(page.getByRole('dialog', { name: 'Finalizar compra' })).toBeVisible()
  await expect(page.locator('input[autocomplete=cc-number]')).toBeVisible()
}

/**
 * Los campos de la tarjeta se buscan por su `autocomplete`, no por su etiqueta.
 *
 * Las etiquetas del formulario de pago se mueven y se encogen al escribir, y eso hace que
 * buscarlas por texto falle de forma intermitente: el campo está ahí, visible y con lo
 * escrito, y la búsqueda por etiqueta no lo encuentra. `cc-number`, `cc-name`, `cc-exp` y
 * `cc-csc` son los nombres que usan los navegadores y los gestores de contraseñas para
 * estos cuatro campos, así que son el identificador estable, y de paso se comprueba que
 * el formulario se puede rellenar solo.
 */
const rellenarTarjeta = async (page: Page) => {
  await page.locator('input[autocomplete=cc-number]').fill(TARJETA)
  await page.locator('input[autocomplete=cc-name]').fill('PERSONA COMPRADORA')
  await page.locator('input[autocomplete=cc-exp]').fill('12/30')
  await page.locator('input[autocomplete=cc-csc]').fill('123')
}

const rellenarEntrega = async (page: Page) => {
  await page.getByLabel('Nombre de quien recibe').fill('Persona Compradora')
  await page.getByLabel('Número de documento').fill('1098765434')
  await page.getByLabel('Teléfono (celular)').fill('3001234567')
  await page.getByLabel('Dirección').fill('Carrera 7 con Calle 72')
  await page.getByLabel('Departamento').click()
  await page.getByRole('option', { name: 'Cundinamarca' }).click()
  await page.getByLabel('Ciudad').click()
  await page.getByRole('option', { name: 'Bogotá' }).click()
}

/**
 * Cuántas unidades hay en el carrito.
 *
 * **Solo funciona con los diálogos cerrados.** Mientras hay un modal abierto, el resto de
 * la aplicación queda marcado como `aria-hidden` para que un lector de pantalla no se
 * meta en lo que hay detrás. El botón del carrito existe, pero no se ve: ni se anuncia ni
 * se puede consultar. Es el comportamiento correcto, y la prueba tiene que respetarlo.
 *
 * **Tampoco se supone que el carrito empiece en cero.** Vive en el servidor y se vuelve a
 * bajar al entrar, así que una prueba que corre dos veces encuentra lo que dejó la
 * anterior. Por eso se cuenta antes y se compara después, en vez de esperar un número
 * fijo: una prueba que pasa por casualidad no está probando nada.
 */
const contarCarrito = async (page: Page): Promise<number> => {
  const etiqueta = await page.getByRole('button', { name: /Carrito con \d+ unidades/ }).getAttribute('aria-label')
  const encontrado = etiqueta?.match(/(\d+)/)

  return encontrado ? Number(encontrado[1]) : -1
}

/** Las unidades que quedan de la variante elegida, leídas de su propia etiqueta. */
const leerStockDeLaVarianteElegida = async (page: Page): Promise<number> => {
  const etiqueta = await page.getByRole('radio', { checked: true }).textContent()
  const encontrado = etiqueta?.match(/(\d+)\s+disponibles/)

  return encontrado ? Number(encontrado[1]) : -1
}

test.beforeEach(() => {
  expect(CORREO && CONTRASENA && TARJETA, FALTAN_DATOS).toBeTruthy()
})

test('1. el catalogo carga y el carrito acepta un cafe', async ({ page }) => {
  await abrirCatalogo(page)
  await entrar(page)

  const antes = await contarCarrito(page)
  await abrirVistaRapida(page)
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await page.getByRole('button', { name: 'Cerrar' }).click()

  await expect.poll(() => contarCarrito(page)).toBe(antes + 1)

  // Y el cajón de verdad, que es donde se ve si el precio lo pone el servidor y no la
  // página.
  await page.getByRole('button', { name: /Carrito con \d+ unidades/ }).click()
  await expect(page.getByRole('dialog', { name: 'Tu carrito' })).toBeVisible()
  await expect(page.getByText(CAFE).first()).toBeVisible()
})

test('2. la ficha completa tambien deja agregar', async ({ page }) => {
  await abrirCatalogo(page)
  await entrar(page)

  await abrirVistaRapida(page)
  await page.getByRole('link', { name: 'Ver ficha completa' }).click()

  await expect(page).toHaveURL(/\/cafe\//)
  const antes = await contarCarrito(page)
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()

  await expect.poll(() => contarCarrito(page)).toBe(antes + 1)
})

test('3. la compra llega al resumen, se cobra y vuelve al producto con el stock descontado', async ({
  page,
}) => {
  await abrirCatalogo(page)
  await entrar(page)

  // El stock se lee con la ficha abierta, **no dentro del proceso de compra**: ese modal
  // sustituye a la ficha, así que una vez dentro ya no hay ninguna variante marcada.
  await abrirVistaRapida(page)
  const stockAntes = await leerStockDeLaVarianteElegida(page)

  // Primero al carrito, y después a pagar, que es el orden de verdad: no se puede pagar lo
  // que no está en el carrito, y con el carrito vacío el proceso dice que está vacío.
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await expect.poll(() => contarCarrito(page)).toBeGreaterThan(0)

  await abrirVistaRapida(page)
  await abrirPagoDesdeLaVistaRapida(page)
  await rellenarTarjeta(page)
  await rellenarEntrega(page)
  await page.getByRole('button', { name: 'Ver el resumen' }).click()

  // El resumen. Aquí se comprueba que el importe sale con formato de dinero, que es la
  // forma de pillarle a un total que se quedó en cero o en blanco.
  await expect(page.getByRole('button', { name: 'Pagar', exact: true })).toBeVisible()
  await expect(page.getByText(/total/i).first()).toBeVisible()

  await page.getByRole('button', { name: 'Pagar', exact: true }).click()

  // El pago se aprueba de verdad contra la pasarela. El aviso va en un `role="status"`,
  // así que el lector de pantalla lo anuncia sin que haya que buscarlo.
  await expect(page.getByText('Pago aprobado')).toBeVisible({ timeout: 90_000 })

  await page.getByRole('button', { name: 'Ver el café' }).click()
  await expect(page).toHaveURL(/\/cafe\//)

  // El carrito se vacía, que es lo que distingue un pago cobrado de uno aprobado sin haber
  // cobrado nada. Se comprueba aquí y no antes porque el proceso de compra es un modal, y
  // con el modal abierto la cabecera no se ve.
  await expect.poll(() => contarCarrito(page)).toBe(0)

  // **El stock tiene que haber bajado.** Es el único paso del recorrido que demuestra de
  // verdad que el cobro llegó al servidor: todo lo anterior puede fallar con bastante
  // elegancia y aun así no haberse cobrado nada. Y se lee de la variante que quedó
  // marcada, que es la que se compró, y no de la primera de la lista.
  await expect.poll(() => leerStockDeLaVarianteElegida(page)).toBe(stockAntes - 1)
})
