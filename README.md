# Bruma Coffee Frontend

Frontend de **Bruma Coffee**. Aplicación SPA construida con **React**, **Vite**, **TypeScript**,
**Tailwind CSS** y **Redux Toolkit** siguiendo los lineamientos de **Flux** (estado unidireccional).

|                             |                                                                          |
| --------------------------- | ------------------------------------------------------------------------ |
| **Tienda desplegada**       | <https://don1v5z5j5m3b.cloudfront.net>                                   |
| **API**                     | <https://d1f0emo6o8pkuu.cloudfront.net>                                  |
| **Documentación de la API** | <https://d1f0emo6o8pkuu.cloudfront.net/api/docs>                         |
| **Backend**                 | [bruma-coffee-backend](https://github.com/RamSterB/bruma-coffee-backend) |

La tienda y la API se sirven desde orígenes distintos y ambos por **HTTPS**.

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

## Skills de `.opencode/skills/`

Hay tres en el repositorio y se versionan, porque describen las decisiones de este
proyecto y las comparte el equipo:

| Skill                     | Cuándo se lee                                                |
| ------------------------- | ------------------------------------------------------------ |
| `frontend-best-practices` | Cualquier componente React: responsive mobile-first, flexbox |
| `tailwind-flexbox`        | Cualquier CSS o layout: Tailwind v4, flexbox, breakpoints    |
| `test-driven-development` | Cualquier feature, corrección o refactor                     |

Hay una cuarta, `ui-ux-pro-max`, que **no se versiona** (está en `.gitignore`): son 3,7 MB
de catálogos que se regeneran con un comando. Antes de abrir el proyecto:

```bash
npm install -g ui-ux-pro-max-cli
uipro init --ai opencode
```

Trae un catálogo local de estilos, paletas, tipografías y 119 directrices de UX, y se
consulta cuando hay una duda de diseño o de accesibilidad. **El instalador mete siete
skills, no una**: `banner-design`, `brand`, `design-system`, `design`, `slides` y
`ui-styling` no aplican aquí, y `ui-styling` además contradice la decisión de
base del proyecto, que es Material UI. Se borran con:

```bash
rm -rf .opencode/skills/{banner-design,brand,design-system,design,slides,ui-styling}
```

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

| Indicador  | Cobertura   | Umbral de CI |
| ---------- | ----------- | ------------ |
| Statements | **95.96 %** | 86 %         |
| Branches   | **86.89 %** | 86 %         |
| Functions  | **94.44 %** | 86 %         |
| Lines      | **96.14 %** | 86 %         |

**389 tests** en 47 archivos, con Testing Library sobre **Jest** y jsdom. Los números son los
del último `main`, y se reproducen con `pnpm test:cov`.

El umbral es un piso, no un techo: está puesto por debajo de la cobertura real a propósito,
para que subirla sea una decisión consciente y no un accidente de la línea base. Ramas es la
que más cuesta subir, y por eso está en 86 y no en 90 como las otras tres.

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

## Rendimiento

### Cada pantalla viene en su trozo

Las rutas se cargan **bajo demanda**, menos la de inicio y la de "no encontrada".

El motivo no son los bytes, es el ancho de banda: quien abre la tienda para mirar un café
no tiene por qué bajarse el modal de pago con sus siete campos, la tarjeta dibujada y la
tokenización. Con las siete pantallas en el paquete inicial, mirar el catálogo carga
también el checkout entero.

Las dos que se quedan en el paquete inicial son a propósito: la de inicio es lo primero
que se ve, y la de "no encontrada" es el fallo de cualquier ruta mal escrita. Si vinieran
en un trozo, abrir la tienda tardaría un viaje de más en pintar el catálogo y un 404 dejaría
un hueco en blanco.

El precio del trato es que **una ruta puede llegar vacía**, y el fallo aparece al navegar,
no al cargar. Por eso hay un indicador de carga y cinco pruebas que comprueban que cada
pantalla aparece cuando se pide, incluida la navegación entre dos de ellas.

### Cabeceras de seguridad

La página de la tienda se sirve desde una CDN y **no hereda las cabeceras de la API**, así
que hay que ponérselas en la distribución. Todas van con su política de cabeceras de
respuesta.

La CSP es restrictiva salvo en dos puntos, y los dos son obligatorios:

- **`style-src` lleva `'unsafe-inline'`** porque el sistema de estilos inserta hojas en la
  página mientras se ejecuta. Sin eso la tienda sale sin estilos.
- **`connect-src` incluye el origen de la pasarela**, porque **la tarjeta se tokeniza en el
  navegador**: la petición va de la tienda al proveedor de pagos, que es otro origen. Con
  `'self'` a secas la página carga entera y **el pago no se puede hacer nunca**. Es la
  trampa de la que hay que acordarse al tocarla.

El resto va cerrado: `script-src 'self'` sin `unsafe-eval` ni en línea, `object-src 'none'`,
`frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, y `upgrade-insecure-requests`.

Además, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy` y HSTS con
`includeSubDomains` y `preload`.

## El checkout

| Ruta           | Qué es                    | Con sesión                        |
| -------------- | ------------------------- | --------------------------------- |
| `/`            | Catálogo                  | anyone                            |
| `/cafe/:id`    | Ficha del café            | anyone                            |
| `/mis-ordenes` | Historial de compras      | **sí**                            |
| `/cuenta`      | Perfil y cierre de sesión | **sí**                            |
| `/entrar`      | Acceso                    | **no**, si la hay va a la portada |
| `/registro`    | Crear cuenta              | **no**, si la hay va a la portada |

Las pantallas con sesión no se pueden ver sin ella y **no dan un 404**: se redirige al
acceso, y de ahí a la portada. Y al revés, quien ya tiene sesión no ve un formulario de
acceso que no explica por qué aparece.

El proceso de compra **no es una ruta**: vive en un modal que se abre desde el catálogo, la
ficha o el carrito, porque los tres caminos llegan al mismo sitio.

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
4. Al pagar, el **estado final** de la transacción: aprobada, rechazada o pendiente. Si
   quedó pendiente, explica que se está confirmando y no lo deja como un fallo, porque
   muchas veces lo es.
5. Y vuelta a la **ficha del producto con el stock ya descontado**. Ese paso es el que
   comprueba que la tienda se enteró de la venta: si la ficha sigue con el stock
   anterior, el pago no se aplicó aunque la pantalla dijera que sí.

El paso 5 es también el que vacía el carrito. **El carrito se vacía cuando el pago se
aprueba, no al abrir el modal ni antes de cobrar**: si se vaciara antes, un pago rechazado
dejaría a la persona sin su compra y tendría que armarla entera otra vez. Hay un test que lo
comprueba en los dos repos.

**Ningún importe se calcula en el navegador.** Llegan enteros del backend y se
enseñan tal cual: calcular el IVA aquí haría que cada visitante viera un total y
el cobro fuera otro.

**El número de tarjeta no se persiste.** Vive en el estado en memoria mientras el
modal está abierto y no se escribe en `localStorage`, ni en `sessionStorage`, ni
sale en ninguna petición al backend. Al recargar hay que volver a escribirlo.

**El número de tarjeta no sale del navegador.** La tokenización la hace la pasarela
con la llave pública, que es la única credencial que puede ir en el cliente; a
nosotros solo llega el **token**. El número no se persiste ni se envía.

**La configuración de la pasarela la pide el navegador al backend** al abrir el modal,
y no viene compilada en el bundle: así un mismo build sirve para los dos ambientes y no
puede pasar que se tokenice en un sitio y se cobre en otro. Si la tienda no la tiene, el
pago avisa en vez de crear una orden que nadie puede cobrar.

El cobro es real contra el **ambiente de pruebas** del proveedor, y la tienda desplegada
paga de verdad contra ese mismo ambiente. Las cuatro llaves de la pasarela llegan al
contenedor por el almacén de secretos, no en el código ni en el bundle.

## Diseño móvil y recuperación al recargar

### Móvil primero, de verdad

**Los estilos sin prefijo son los del móvil.** No hay ningún `min-width` en el CSS ni
condiciones que se apliquen solo en pantallas grandes: se escribe primero la versión
estrecha y luego se sube con `sm:`, `md:` y `lg:`. Un `min-width` suelto en un componente es
justo la forma de romperlo, y hay que evitarlo.

Se ve en la página del catálogo:

```html
<!-- una columna en móvil, dos desde 640 px, tres desde 1024 px -->
<ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  <!-- el relleno y el tamaño de letra suben con la pantalla -->
  <main class="... p-4 sm:p-6 lg:p-8">
    <h1 class="text-3xl sm:text-4xl"></h1>
  </main>
</ul>
```

Comprobado a **375 px**, que es la anchura de un iPhone SE, sin scroll horizontal.

- **Los botones de acción principales miden 44 px de alto**, que es el mínimo para pulsar sin
  acertar a ciegas. Está puesto a mano, uno a uno, en los tres de la ficha del café.
- **El checkout va en un modal centrado y con ancho máximo**, no en varias páginas, para que
  confirmar el pago no obligue a desplazarse en un móvil.
- **La tarjeta dibujada se estrecha** en pantallas estrechas en vez de salirse.

- **Los botones de cantidad del cajón miden 44 × 44 px.** Usaban el tamaño pequeño de
  Material, que se queda en unos 34: hay que apuntar y a la persona le pulsa el café de al
  lado. Con la compra ya decidida, un toque de más quita un café del carrito.

### El progreso no se pierde al recargar

Una recarga, un cierre de pestaña o un salto atrás no borra lo que la persona había hecho.
Lo que se guarda, y lo que **no**:

| Qué                   | Dónde                                         | Por qué                                                                                                                                                |
| --------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Carrito del invitado  | `localStorage`, solo identificador y cantidad | Es lo que hay que recuperar. **El precio y el stock los pone el servidor** al abrir el cajón, así que una copia vieja nunca muestra un precio caducado |
| Carrito con sesión    | En el servidor                                | El del navegador se sube al iniciar sesión y se vacía al aprobar el pago                                                                               |
| Token de acceso       | En memoria                                    | No se escribe en ningún almacenamiento: es lo que evita que un XSS se lo lleve                                                                         |
| Token de refresco     | Cookie `httpOnly`                             | El JavaScript no puede leerla. Con CSRF de doble envío                                                                                                 |
| **Número de tarjeta** | **En nada**                                   | Vive mientras el modal está abierto y desaparece al cerrarlo. A propósito: al recargar hay que volver a escribirlo                                     |

El modo de recuperación de la sesión es lo que hace que recargar no eche a nadie: al arrancar,
la aplicación **no sabe todavía** si hay sesión, así que no expulsa a nadie durante ese
intervalo. Si lo hiciera, la persona que sí tiene sesión caería en la pantalla de acceso cada
vez que recarga, y el token de refresco no se usaría nunca.

## Acceso desde Windows

| Servicio            | URL                              |
| ------------------- | -------------------------------- |
| Frontend (Vite)     | `http://localhost:5173`          |
| API (proxy `/api`)  | `http://localhost:5173/api`      |
| Swagger del backend | `http://localhost:8000/api/docs` |

## Despliegue

La guía está en
[`bruma-coffee-backend/DEPLOYMENT.md`](../bruma-coffee-backend/DEPLOYMENT.md).

Resumen de cómo está montado:

| Pieza         | Servicio                                                             |
| ------------- | -------------------------------------------------------------------- |
| Build         | S3, bucket privado                                                   |
| Tienda        | CloudFront con función de reescritura de rutas                       |
| API           | CloudFront en una **segunda distribución**, con la caché desactivada |
| Backend       | ECS Fargate detrás de un balanceador                                 |
| Base de datos | RDS PostgreSQL                                                       |
| Secretos      | Secrets Manager                                                      |

Dos detalles que no son evidentes:

- **La API necesita su propia distribución** porque el balanceador no puede dar HTTPS sin un
  dominio, y el servicio de certificados no emite para el nombre de un balanceador. Con una
  sola distribución, la regla que convierte los 403 y 404 en `index.html` para que funcione
  el router se aplicaría también a las respuestas de la API y devolvería HTML donde el
  cliente espera JSON.
- **`index.html` y los assets se suben con TTL distintos.** El `index.html` cambia en cada
  compilación y lleva un TTL corto; los assets llevan el hash del contenido en el nombre, así
  que nunca cambian y pueden tener un TTL de un año.
