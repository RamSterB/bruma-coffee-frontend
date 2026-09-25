# Bruma Coffee Frontend

Frontend de **Bruma Coffee**. Aplicación SPA construida con **React**, **Vite**, **TypeScript**,
**Tailwind CSS** y **Redux Toolkit** siguiendo los lineamientos de **Flux** (estado unidireccional).

## Stack

| Capa | Tecnología |
|---|---|
| UI | React 19 + TypeScript |
| Build | Vite 8 |
| Estilos | Tailwind CSS v4 (plugin `@tailwindcss/vite`) |
| Estado | Redux Toolkit (slices, actions, thunks) + react-redux |
| Gestor de paquetes | pnpm 10.28.0 (corepack, versión fija) |

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

| Variable | Descripción | Default |
|---|---|---|
| `VITE_API_URL` | URL base de la API. En dev es el target del proxy `/api` de Vite. | `http://host.docker.internal:8000` |

> El proxy `/api` es **solo para desarrollo**. En producción `VITE_API_URL` se inyecta en
> build-time apuntando al dominio de la API publicada.

## Comandos

```bash
pnpm dev        # servidor Vite en 0.0.0.0:5173
pnpm build      # tsc -b && vite build (salida en dist/)
pnpm preview    # preview del build
pnpm lint       # eslint
```

## Acceso desde Windows

| Servicio | URL |
|---|---|
| Frontend (Vite) | `http://localhost:5173` |
| API (proxy `/api`) | `http://localhost:5173/api` |
| Swagger del backend | `http://localhost:8000/api/docs` |

## Despliegue

La guía para publicar frontend (S3 + CloudFront) y backend (ECS/RDS) en AWS está en
[`bruma-coffee-backend/DEPLOYMENT.md`](../bruma-coffee-backend/DEPLOYMENT.md).