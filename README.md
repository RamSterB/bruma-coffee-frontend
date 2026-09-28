# Bruma Coffee Frontend

Frontend de **Bruma Coffee**. Aplicación SPA construida con **React**, **Vite**, **TypeScript**,
**Tailwind CSS** y **Redux Toolkit** siguiendo los lineamientos de **Flux** (estado unidireccional).

## Stack

| Capa               | Tecnología                                            |
| ------------------ | ----------------------------------------------------- |
| UI                 | React 19 + TypeScript                                 |
| Build              | Vite 8                                                |
| Estilos            | Tailwind CSS v4 (plugin `@tailwindcss/vite`)          |
| Estado             | Redux Toolkit (slices, actions, thunks) + react-redux |
| Gestor de paquetes | pnpm 10.28.0 (corepack, versión fija)                 |

> **Nota pnpm (importante):** la versión está **fijada a `10.28.0`** en los tres entornos
> (local, devcontainer y `"packageManager"` de `package.json`) porque el lockfile se genera con esa
> versión. No la subas a `latest`: pnpm 12 aplica una política supply-chain (`minimum-release-age`)
> que **hace fallar la instalación limpia del devcontainer** con
> `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` cuando hay paquetes recién publicados (p. ej.
> `vite@8.3.1` / `rolldown@1.2.11`). Si algún día quieres subirla, hazlo en los tres sitios a la
> vez y regenera los lockfiles.

## Requisitos

- **WSL2** con Docker Desktop y la extensión **Remote - Containers** de VS Code.
- Red Docker compartida `brumacoffeenet` (mira el setup en la [carpeta contenedor](../README.md)).
- Backend corriendo en su devcontainer (ver [bruma-coffee-backend](../bruma-coffee-backend/README.md)).

## Estructura (Flux)

```
src/
├── app/                    # Store de Redux + hooks tipados
│   ├── store.ts            # configureStore + rootReducer
│   └── hooks.ts            # useAppDispatch / useAppSelector tipados
├── features/
│   └── coffee/
│       ├── coffeeSlice.ts  # slice (estado + reducers + thunk `fetchCoffees`)
│       └── CoffeeList.tsx  # componente conectado al store
├── components/             # componentes reutilizables
├── pages/                  # páginas/rutas
├── App.tsx
└── main.tsx                # Provider + punto de entrada
```

Flujo unidireccional: componente → `dispatch(action)` → reducer actualiza el estado →
`useAppSelector` notifica la re-renderización. El acceso a la API se hace con thunks
(`createAsyncThunk`) contra el proxy `/api`.

## Devcontainer

El repositorio incluye `.devcontainer/` con el entorno listo (Node 22 + pnpm/corepack).
Desde Windows: **File → Open Folder** sobre esta carpeta y luego **Reopen in Container**.

## Variables de entorno

Copia `cp .env.example .env` si vas a ejecutar fuera del contenedor. El devcontainer ya
inyecta las variables vía `containerEnv`.

| Variable       | Descripción                                                       | Default                            |
| -------------- | ----------------------------------------------------------------- | ---------------------------------- |
| `VITE_API_URL` | URL base de la API. En dev es el target del proxy `/api` de Vite. | `http://host.docker.internal:8000` |

> El proxy `/api` es **solo para desarrollo**. En producción `VITE_API_URL` se inyecta en
> build-time apuntando al dominio de la API publicada.

## Comandos

```bash
pnpm dev            # servidor Vite en 0.0.0.0:5173
pnpm build          # tsc -b && vite build (salida en dist/)
pnpm preview        # preview del build
pnpm format         # prettier --write
pnpm format:check   # prettier --check (lo exige CI)
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
pnpm test           # jest
pnpm test:cov       # jest con cobertura
pnpm audit          # auditoría de dependencias
```

## Arquitectura

```
src/
├── app/          store, hooks tipados, cliente HTTP, rutas
├── components/   layout de la app (barra, contador, cajón)
├── features/
│   ├── cart/     slice, persistencia, cajón lateral
│   └── coffee/   catálogo, filtros, ficha, variantes
├── lib/          utilidades puras (formato de moneda, etc.)
├── pages/        una por ruta
└── test/         configuración común de tests
```

El estado vive en **Redux Toolkit** con un store único, siguiendo el flujo de Flux: los
componentes despachan acciones, los reductores son puros, el estado derivado se lee con
selectores y los efectos secundarios van en thunks. Nada de estado de dominio en `useState`: el
`useState` que queda es para estado efímero de la vista, como qué panel está abierto.

El carrito es la excepción que explica el diseño: en `localStorage` solo se guarda el
identificador de la variante y la cantidad. El precio y el stock los pone la API al abrir el
cajón, para que lo que se ve y lo que se cobra no puedan separarse.

## Cobertura

```bash
pnpm test:cov
```

| Indicador  | Cobertura | Umbral de CI |
| ---------- | --------- | ------------ |
| Statements | 96.5 %    | 86 %         |
| Branches   | 91.0 %    | 86 %         |
| Functions  | 95.0 %    | 86 %         |
| Lines      | 96.3 %    | 86 %         |

**153 tests** en 20 archivos, con Testing Library sobre **Jest** y jsdom. El umbral es un piso, no
un techo: está puesto por debajo de la cobertura real a propósito, para que subirla sea una
decisión consciente y no un accidente de la línea base.

### Cómo están configurados los tests

| Fichero                | Para qué                                                   |
| ---------------------- | ---------------------------------------------------------- |
| `jest.config.cjs`      | Entorno, transformador y umbral de cobertura               |
| `jest.environment.cjs` | jsdom + los globals de Web API que jsdom no implementa     |
| `babel.config.cjs`     | Solo para Jest; el build de la app lo hace Vite, sin Babel |

Dos detalles que no son evidentes y conviene no deshacer:

- **Babel se usa porque Jest no lee la configuración de Vite.** No es por velocidad: es que
  con otro transformador los `jest.mock()` dejan de aplicarse al importar `jest` desde
  `@jest/globals`. `@babel/core` y los presets tienen que estar en la misma major; si no, el
  stripping de tipos no ocurre y el error que sale es de sintaxis y no dice nada de tipos.
- **No se inyecta `MessageChannel`.** React 19 lo detecta, su `scheduler` deja de usar el fallback
  de `setTimeout` y deja un `MessagePort` abierto, que es lo que provoca el aviso de worker sin
  cerrar. Los globals que sí hacen falta (`Response`, `fetch`, `TextEncoder`) los aporta el entorno.

## El checkout

`/` · `/cafe/:id` · `/checkout` · `/entrar` · `/registro` · `/cuenta`

El proceso de compra va en pasos, y el orden importa: primero la tarjeta y los
datos de entrega, y después el resumen con el botón de pago. Al revés se ve el
total antes de poder corregir nada de lo que lo produce.

1. La ficha del producto tiene **Pagar con tarjeta de crédito**, que abre el modal.
2. En el modal: **tarjeta y envío**. Encima de los campos hay una **tarjeta
   dibujada** —con forma, chip, gradiente por marca, titular y los últimos cuatro
   dígitos— que se redibuja mientras se escribe, y no un campo de texto más. El
   nombre de la marca va **escrito** al lado, no solo como color ni como icono: el
   color no lo lee todo el mundo. La tarjeta se valida con el algoritmo de Luhn y
   la marca se detecta por los primeros dígitos. Se aceptan espacios y guiones
   porque así es como lo escribe la gente, y un aviso de tarjeta inválida **no
   borra** lo que ya se escribió.

   **El número completo no aparece en el dibujo**, ni en el texto ni en el nombre
   accesible. Se muestran los últimos cuatro, que es lo justo para distinguir una
   tarjeta de otra. El PAN sigue viviendo solo en el estado en memoria del modal.
3. Al validar, el **resumen**: productos, subtotal, envío, IVA del 19 % y total, con
   el botón de pago. Si el envío quedó gratis, dice "Envío gratis" y no un cero,
   que parece un error de cálculo.

**Ningún importe se calcula en el navegador.** Llegan enteros del backend y se
enseñan tal cual: calcular el IVA aquí haría que cada visitante viera un total y
el cobro fuera otro.

**El número de tarjeta no se persiste.** Vive en el estado en memoria mientras el
modal está abierto y no se escribe en `localStorage`, ni en `sessionStorage`, ni
sale en ninguna petición al backend. Al recargar hay que volver a escribirlo.

4. Al pagar, la tarjeta se **tokeniza en el navegador** y se crea la orden. 5. El
   **resultado**: número de orden, total y si el envío ya está creado, con un botón
   para volver al café.

**El número de tarjeta no sale del navegador.** La tokenización la hace la pasarela
con la llave pública, que es la única credencial que puede ir en el cliente; a
nosotros solo llega el **token**. El número no se persiste ni se envía.

**La configuración de la pasarela la pide el navegador al backend** al abrir el modal,
y no viene compilada en el bundle: así un mismo build sirve para los dos ambientes y no
puede pasar que se tokenice en un sitio y se cobre en otro. Si la tienda no la tiene, el
pago avisa en vez de crear una orden que nadie puede cobrar.

Todavía **no** hay cobro real: el backend de la pasarela está en su propia PR.

## Acceso desde Windows

| Servicio            | URL                              |
| ------------------- | -------------------------------- |
| Frontend (Vite)     | `http://localhost:5173`          |
| API (proxy `/api`)  | `http://localhost:5173/api`      |
| Swagger del backend | `http://localhost:8000/api/docs` |

## Despliegue

La guía para publicar frontend (S3 + CloudFront) y backend (ECS/RDS) en AWS está en
[`bruma-coffee-backend/DEPLOYMENT.md`](../bruma-coffee-backend/DEPLOYMENT.md).
