# Referencia de diseño

## Qué es esto

`apple.DESIGN.md` es el sistema de diseño de Apple, extraído de su web por el proyecto
[`VoltAgent/awesome-design-md`](https://github.com/VoltAgent/awesome-design-md) (MIT).

**Es una referencia, no una instrucción.** El repositorio de origen dice que se copie su
`DESIGN.md` en la raíz del proyecto para que el agente genere la interfaz con esa marca.
Eso **no** es lo que se ha hecho aquí, y no se hará.

## Por qué está aquí y no en la raíz

La identidad visual de este proyecto ya está decidida y no se toca:

- Fondo oscuro (`neutral-900`) con acento ámbar (`amber-400`).
- Material UI como base de componentes, Tailwind v4 para el layout.
- Tipografía y espaciado de la escala definida en el tema.

Ninguna de las tres se cambia por añadir un fichero de referencia. Si alguna vez una
sugerencia de aquí contradice lo anterior, **manda lo anterior**.

## Qué se puede sacar de aquí

El fichero de Apple es un sistema **claro**, y este proyecto es oscuro: su paleta no
serve. Lo que sí sirve es la parte estructural, que es donde los catálogos de diseño
suelen coincidir:

- Escala tipográfica y pesos.
- Ritmo de espaciado y densidad.
- Radio de esquinas y grosor de líneas (aquí "hairline", separadores de 1 px).
- Cómo se distingue un botón secundario de uno principal sin cambiar de color.

## Licencia

MIT, de `VoltAgent/awesome-design-md`. Copia en `LICENSE-awesome-design-md`.
