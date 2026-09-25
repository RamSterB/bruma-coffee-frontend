---
name: tailwind-flexbox
description: Use when writing or reviewing any CSS/layout in this repo. Tailwind CSS v4 (Vite plugin, no tailwind.config) + flexbox layout + mobile-first responsive. Avoids magic values, promotes the spacing scale and breakpoint system.
---

# Tailwind CSS v4 + Flexbox + Responsive (Mobile-first)

## Stack

- **Tailwind v4** vía plugin `@tailwindcss/vite` en Vite.
- **NO hay `tailwind.config.js` / preset**: los tokens se definen en CSS con `@theme`.
- Layout con **flexbox** (prioridad) / grid solo para 2D real (grillas de tarjetas, tablas).

## ¿Cuándo flexbox? — guía rápida

| Caso | Herramienta |
|---|---|
| Filas/columnas, centrado, espacio entre items | **flexbox** |
| Grilla 2D (filas y columnas a la vez) | `grid` |
| Stack vertical simple | `flex flex-col` |
| Navbar / header con logo + links + botón | `flex items-center justify-between` |
| Centrado perfecto | `flex items-center justify-center` |
| Cards en grilla que rellenan el ancho | `grid grid-cols-*` / `repeat(auto-fill, minmax(...))` |

## Mobile-first (obligatorio)

- **Empieza por la versión móvil** (columna, touch-friendly). Solo después añade utilidades con prefijo para pantallas mayores.
- Breakpoints oficiales: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px.
- Patrón típico: `flex flex-col gap-4 md:flex-row` → columna en móvil, fila desde `md`.

## Reglas de layout con flex

- Usa **`gap`** en vez de márgenes individuales entre ítems hermanos.
- `justify-*` (eje principal) + `items-*` (eje cruzado) — elige SCALA de Tailwind, no valores arbitrarios.
- Separación real en pantallas grandes con flexbox anti-frag: `md:flex-row md:items-center md:justify-between`.
- Un item que debe crecer: `flex-1` / `grow`. Evitar `flex-grow` arbitrarios sin necesidad.
- No centrar con `text-center` cuando realmente quieres centrar el CONTENEDOR con flex.

## Tokens: `@theme` en vez de config

```css
@import "tailwindcss";

@theme {
  --color-bruma-500: #6f4e37;   /* usado como bg-bruma-500 */
  --font-brand: "Inter", system-ui, sans-serif;
}
```

- Usa utilidades derivadas de tokens: `bg-bruma-500`, `font-brand`.
- Nunca escribas `text-[#6f4e37]` si existe el token; regístralo en `@theme`.

## Anti-patterns — NO hacer

1. Valores mágicos por pixel al azar: `p-[13px]`, `w-[47%]` → usa la **spacing scale** (`p-3`, `w-1/2`) o tokens reales.
2. Breakpoints arbitrarios (`min-[900px]:`) salvo caso justificado; usa `sm/md/lg`.
3. Media queries CSS manuales si Tailwind lo resuelve con prefijos.
4. Estilos inline para layout (`style={{ display: 'flex' }}`) → utilidades.
5. Múltiples breakpoints anidados innecesarios: mantén la lógica legible.
6. Flex sin `min-w-0` en contenedores con texto largo/grid que desbordan — recuerda **`min-w-0`** para permitir que los items flex se encojan.

## Tipografía y accesibilidad

- `text-sm`/`text-base` legibles; nunca por debajo de `text-xs` para contenido salvo metadatos.
- Contraste WCAG AA; si dudas, usa `text-neutral-700`/`text-neutral-800` sobre `bg-white`.
- Estados `focus-visible:` visibles en links/inputs/botones operables con teclado.

## Comprobación final de cada cambio de UI

- [ ] Se ve OK a **375px** (móvil), **768px** (tablet), **1280px** (desktop). Revisa breakpoint por breakpoint.
- [ ] Sin scroll horizontal en móvil (causa común: `w-full` + `gap` en flex-wrap, o valores fijos).
- [ ] Layout sensible (usa `flex-wrap` donde haga falta).
- [ ] Sin valores mágicos; tokens y escala aplicados.
