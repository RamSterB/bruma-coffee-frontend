---
name: frontend-best-practices
description: Use when writing or reviewing React/TS code in this repo — React 19, Vite, Tailwind v4, Redux Toolkit (Flux). Covers responsive mobile-first, flexbox/CSS, semantic components, and performance.
---

# Frontend Best Practices (Bruma Coffee)

## Stack (no-negociable)

- **React 19** + **TypeScript** (strict)
- **Vite 8** (rolldown) build
- **Tailwind CSS v4** (plugin `@tailwindcss/vite`) — sin config de `tailwind.config`, usa `@theme` en CSS
- **Redux Toolkit + react-redux** — arquitectura **Flux** unidireccional (slices, thunks, store central)

## Reglas React 19

### Escribir componentes así

- Componentes **funcionales** con props tipadas. Nada de `any`, nada de clases (sin motivo).
- Usar **hooks nativos** correctamente: `useState`, `useReducer`, `useEffect`, `useMemo`, `useCallback`, `useRef`, `useContext`.
- **No sobre-memorizar**: `useMemo`/`useCallback` solo cuando haya render-cost real (listas grandes o props pasadas a memo-components). Empieza sin ellos; añádelos si el profiler lo pide.
- Componentes **dedicados de UI**: separa `components/` (reutilizables) de `features/` (conectados al store). Páginas en `pages/`.
- Nombres de variable/estado con el verbo correcto: `isLoading`, `error: string | null`.

### Propagación de estado (Flux)

- Estado global **solo** en Redux (store central). Estado local de formulario/UI en `useState` componente.
- **Acciones** describen intenciones (`fetchCoffees.pending/rejected/fulfilled`); los **reducers** son funciones puras; los **thunks** llevan el efecto secundario (fetch a `/api`).
- Leer estado con `useAppSelector` tipado; disparar con `useAppDispatch`. NUNCA importar el store en componentes.

```ts
const coffees = useAppSelector((s) => s.coffee.items);
const dispatch = useAppDispatch();
useEffect(() => { void dispatch(fetchCoffees()); }, [dispatch]);
```

### Manejo de carga/error/estado vacío (UI)

Todo listado/fetch tiene 3 estados visibles: `loading`, `error`, `empty` y `success`. Renderizarlos explícitamente, nunca mostrar "nada" silencioso.

## Dependencias y build

- Gestor de paquetes: **pnpm 10.28.0** (corepack, ver README — NO usar `latest`).
- Build/lint/test de cada cambio: `pnpm build`, `pnpm lint`, `pnpm test`.
- No romper el lockfile: `pnpm install --frozen-lockfile`.

## CSS / Tailwind v4

### Mobile-first + responsivo

- **Mobile first por defecto**: estilos base para móvil, y **`sm:`/`md:`/`lg:`** solo para subir.
- Utilizar breakpoints: `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Evitar breakpoints arbitrarios salvo necesidad real.

### Flexbox/cosas de layout

- Usar **flexbox** para layout unidimensional (filas/columnas), `grid` para 2D.
- Orden lógico: `flex flex-col` en pantallas pequeñas, `md:flex-row` para escritorio.
- Preferir utilidades de Tailwind sobre CSS custom. Para temas:

```css
@theme {
  --color-bruma-500: #6f4e37;
}
```

- `gap`, `align-items`/`justify-content`: usar utilidades (`items-center`, `justify-between`).
- No abusar de layout absoluto si flex resuelve la posición.

### Buen ojo de diseño

- Componentes con **espaciado consistente** (spacing scale de Tailwind: `p-2`, `gap-4`...) — nada de valores mágicos `p-[13.5px]`.
- Responsive de imágenes y media. Fuentes legibles, contraste decente (WCAG).
- Estado focus visible (`focus-visible`) para accesibilidad tab.

## TypeScript

- `strict: true`. Tipar props con interfaces; unión de estados con discriminated unions.
- Evitar `any` (prohibido salvo vía de escape explícita). Usar `unknown` + narrowing.
- Usar generics y utilidades de TS (`Partial`, `Pick`, `Omit`) donde encaje.

## Errores comunes a evitar

1. `useEffect` con `[]` que lee el store (stale closure).
2. fetch en el render (waterfall/repetición). Hacerlo en thunk/`useEffect` bien formado.
3. Múltiples suscripciones a `useAppSelector` separadas cuando una basta.
4. Estilos inline cuando se puede Tailwind.
5. `key` ausente o con `index` inseguro en listas.
