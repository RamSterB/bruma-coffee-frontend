# Logotipos de las redes de tarjeta

Estos dos SVG son los **originales**, sin modificar, y están aquí por dos razones:

1. **Procedencia.** Los logotipos son marcas registradas de Visa Inc. y Mastercard
   International. No son nuestros ni se pueden modificar; se usan para *identificar* la
   red de la tarjeta, que es exactamente para lo que existen. Aquí está el fichero de
   origen, sin tocar.
2. **El test los compara contra el componente.** `src/features/checkout/brandLogos.test.tsx`
   falla si el `path` del componente deja de coincidir con el de aquí.

Ese test existe porque el `path` de Visa se escribió a mano una vez. Compilaba, se
veía y parecía funcionar, pero la forma salía deformada, y una marca deformada en la
pantalla de pago se nota más que un logo que no está. Escribir un `path` a mano es un
error fácil de cometer y difícil de ver.

| Fichero | Origen | Modificaciones |
|---|---|---|
| `visa-logo-2021.svg` | Wikimedia Commons, *Visa Inc. logo (2021–present)* | ninguna |
| `mastercard-2019-logo.svg` | Wikimedia Commons, *Mastercard 2019 logo* | ninguna |

El componente usa el mismo `path` pero **en blanco**, porque el fondo de la tarjeta es
un gradiente azul oscuro y el color oficial se pierde. La forma es idéntica.
