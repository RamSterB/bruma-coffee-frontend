import type { CardBrand } from '../../lib/cardValidation'

/**
 * Los logotipos de las redes de tarjeta.
 *
 * **Son marcas registradas de sus titulares** (Visa Inc. y Mastercard International),
 * no los dibujamos nosotros: se usan para *identificar* la red de la tarjeta, que es
 * justo para lo que existen. No se distribuyen con licencia propia y no hay que
 * modificarlos: escalan por SVG.
 *
 * Van **en línea** y no como ficheros aparte por dos razones. Una: Vite y Jest
 * resuelven un `import` de `.svg` de forma distinta cada uno, y eso obliga a
 * tocar la configuración de los dos para un icono. Dos: en línea se pueden dar
 * dimensiones exactas y el SVG escala sin pérdida en cualquier pantalla.
 *
 * Se toma el nombre de la red en el `aria-label` porque el logo **no** es un texto
 * para quien navega con lector de pantalla, y la marca es justo el dato que no puede
 * quedarse solo en una imagen.
 */

const PROPS_COMUNES = {
  role: 'img',
  focusable: false,
} as const

/**
 * El logotipo de Visa, con el path **copiado** del SVG original.
 *
 * Va en blanco y no en su azul oficial porque el fondo de la tarjeta es un gradiente
 * azul oscuro: el logo en su color se pierde. El shape es el mismo.
 *
 * `viewBox` 0 0 1000 324.68: proporción 3.08 a 1, que es lo que fija el ancho a
 * partir de la altura. Escribir el path a mano lo deformó la primera vez, y una marca
 * deformada en la pantalla de pago se nota más que un logo que no está.
 */
export function VisaLogo({ height = 15 }: { height?: number }) {
  return (
    <svg
      {...PROPS_COMUNES}
      aria-label="Visa"
      height={height}
      width={Math.round(height * 3.08)}
      viewBox="0 0 1000 324.68"
    >
      <path
        fill="#FFFFFF"
        d="m651.19.5c-70.93,0-134.32,36.77-134.32,104.69,0,77.9,112.42,83.28,112.42,122.42,0,16.48-18.88,31.23-51.14,31.23-45.77,0-79.98-20.61-79.98-20.61l-14.64,68.55s39.41,17.41,91.73,17.41c77.55,0,138.58-38.57,138.58-107.66,0-82.32-112.89-87.54-112.89-123.86,0-12.91,15.5-27.05,47.66-27.05,36.29,0,65.89,14.99,65.89,14.99l14.33-66.2S696.61.5,651.18.5h0ZM2.22,5.5L.5,15.49s29.84,5.46,56.72,16.36c34.61,12.49,37.07,19.77,42.9,42.35l63.51,244.83h85.14L379.93,5.5h-84.94l-84.28,213.17-34.39-180.7c-3.15-20.68-19.13-32.48-38.68-32.48,0,0-135.41,0-135.41,0Zm411.87,0l-66.63,313.53h81L494.85,5.5h-80.76Zm451.76,0c-19.53,0-29.88,10.46-37.47,28.73l-118.67,284.8h84.94l16.43-47.47h103.48l9.99,47.47h74.95L934.12,5.5h-68.27Zm11.05,84.71l25.18,117.65h-67.45l42.28-117.65h0Z"
      />
    </svg>
  )
}

export function MastercardLogo({ height = 30 }: { height?: number }) {
  return (
    <svg
      {...PROPS_COMUNES}
      aria-label="Mastercard"
      height={height}
      width={height}
      viewBox="0 0 1000 618"
    >
      <path fill="#EB001B" d="m308,0a309,309 0 1,0 2,0z" />
      <path fill="#F79E1B" d="m690,0a309,309 0 1,0 2,0z" />
      <path fill="#FF5F00" d="m500,66a309,309 0 0,0 0,486 309,309 0 0,0 0-486" />
    </svg>
  )
}

/**
 * El logo de la marca, o nada si la marca no se conoce.
 *
 * Con marca desconocida **no** se enseña el logo de la anterior: un logo de Visa
 * sobre una tarjeta que no es Visa es peor que no tener logo, porque afirma algo
 * falso. El hueco es la información correcta.
 */
export function BrandLogo({ brand }: { brand: CardBrand }) {
  if (brand === 'VISA') {
    return <VisaLogo />
  }

  if (brand === 'MASTERCARD') {
    return <MastercardLogo />
  }

  return null
}
