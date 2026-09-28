import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { ApiError } from '../../app/api/ApiError'
import { httpClient } from '../../app/api/httpClient'
import type { RootState } from '../../app/store'

export interface UsuarioSesion {
  id: string
  email: string
  fullName: string
  role: string
  isEmailVerified: boolean
}

export interface Sesion {
  accessToken: string
  accessTokenExpiresIn: number
  csrfToken: string
  user: UsuarioSesion
}

export type AuthStatus = 'iniciando' | 'autenticada' | 'anonima'

export interface AuthState {
  /**
   * El token de acceso vive aquí y solo aquí: en memoria, dentro del store, que
   * se pierde al recargar. No se escribe nunca en `localStorage` ni en
   * `sessionStorage`, porque cualquier JavaScript de la página podría leerlo y
   * llevarse la sesión entera. Al recargar, la cookie `httpOnly` del refresh es
   * la que devuelve la sesión sin que nadie haya tenido que guardar el token.
   */
  accessToken: string | null
  user: UsuarioSesion | null
  /**
   * El token de CSRF, tal y como lo devuelve el servidor. Viaja en el cuerpo de la
   * respuesta, no en una cookie legible desde aquí: con la tienda y la API en dominios
   * distintos, la cookie es del dominio de la API y esta pagina no la ve.
   */
  csrfToken: string
  status: AuthStatus
  error: string | null
  /**
   * Si ya se intentó recuperar la sesión en esta carga. Vive en el store y no en
   * un `useRef` del layout a propósito: el layout se vuelve a montar en cada
   * navegación y con un `ref` pediría la sesión otra vez, que es un refresh de más
   * y, peor, una rotación de token innecesaria.
   */
  sesionSolicitada: boolean
}

export const sesionInicial: AuthState = {
  accessToken: null,
  user: null,
  csrfToken: '',
  status: 'iniciando',
  error: null,
  sesionSolicitada: false,
}

/**
 * Recupera la sesión al arrancar. Falla sin drama cuando no la hay, que es el
 * caso normal de quien entra sin registrarse: un 401 aquí no es un error que
 * enseñar, es la respuesta correcta a "no tienes sesión".
 */
export const restoreSession = createAsyncThunk<
  Sesion | null,
  void,
  { state: { auth: AuthState }; rejectValue: string }
>('auth/restore', async (_void, { getState, rejectWithValue }) => {
  try {
    // El token CSRF va explícito, y no leído de una cookie, porque con la tienda y la API
    // en dominios distintos la cookie es del otro sitio y aquí no se ve. Sin esta cabecera
    // el refresco sale rechazado, la sesión no se recupera al recargar, y quien lo pierde
    // no recibe ningún aviso: solo aparece fuera de la sesión.
    return await httpClient.post<Sesion>('/auth/refresh', undefined, {
      csrf: getState().auth.csrfToken,
    })
  } catch (error) {
    return rejectWithValue(
      error instanceof ApiError ? error.message : 'No se pudo recuperar la sesión',
    )
  }
})

export interface Credenciales {
  email: string
  password: string
}

export interface Registro extends Credenciales {
  fullName: string
}

/**
 * El registro **no** devuelve sesión: el backend responde siempre lo mismo para no
 * decir qué correos existen, y quien acaba de registrarse todavía no ha
 * verificado su correo. Por eso esta acción deja la app en modo invitado y la
 * interfaz pide iniciar sesión.
 */
export const signUp = createAsyncThunk<void, Registro, { rejectValue: string }>(
  'auth/signUp',
  async (datos, { rejectWithValue }) => {
    try {
      await httpClient.post<{ message: string }>('/auth/register', datos)
    } catch (error) {
      return rejectWithValue(
        error instanceof ApiError ? error.message : 'No se pudo completar el registro',
      )
    }
  },
)

export const signIn = createAsyncThunk<Sesion, Credenciales, { rejectValue: string }>(
  'auth/signIn',
  async (credenciales, { rejectWithValue }) => {
    try {
      return await httpClient.post<Sesion>('/auth/login', credenciales)
    } catch (error) {
      return rejectWithValue(
        error instanceof ApiError ? error.message : 'No se pudo iniciar sesión',
      )
    }
  },
)

/**
 * El logout avisa al servidor para que revoke el refresh. Aunque el servidor
 * falle, la sesión local se cierra igual: dejarla "medio cerrada" dejaría al
 * usuario creyendo que sigue dentro con un token vivo en memoria.
 */
export const signOut = createAsyncThunk<void, void, { state: { auth: AuthState } }>(
  'auth/signOut',
  async (_void, { getState }) => {
    try {
      await httpClient.post<{ message: string }>('/auth/logout', undefined, {
        csrf: getState().auth.csrfToken,
      })
    } catch {
      // Se traga cualquier fallo, incluido uno que no sea un error de la API. La
      // alternativa es que un corte de red deje a la persona con un token vivo en
      // memoria y una pantalla que dice que acaba de cerrar la sesión. Cerrar
      // sesión en el navegador tiene que ser algo que siempre pasa.
    }
  },
)

const authSlice = createSlice({
  name: 'auth',
  initialState: sesionInicial,
  reducers: {
    sesionSolicitada: (estado) => {
      estado.sesionSolicitada = true
    },
    sesionRestaurada: (estado, accion: PayloadAction<Sesion>) => {
      estado.accessToken = accion.payload.accessToken
      estado.user = accion.payload.user
      // El token de CSRF es lo que permite hablar con el servidor en las peticiones que se
      // apoyan en la cookie de refresh. Sin guardarlo, esas peticiones salen sin cabecera.
      estado.csrfToken = accion.payload.csrfToken
      estado.status = 'autenticada'
      estado.error = null
    },
    sesionCerrada: (estado) => {
      estado.accessToken = null
      estado.user = null
      estado.csrfToken = ''
      estado.status = 'anonima'
      estado.error = null
    },
    sesionNoRestaurada: (estado) => {
      estado.accessToken = null
      estado.user = null
      estado.csrfToken = ''
      estado.status = 'anonima'
      estado.error = null
    },
    errorDeOperacion: (estado, accion: PayloadAction<string>) => {
      estado.error = accion.payload
    },
  },
  extraReducers: (constructor) => {
    constructor
      .addCase(restoreSession.fulfilled, (estado, accion) => {
        // Una respuesta que no trae sesión es lo mismo que no tenerla. Comprobar
        // solo por null dejaría fuera el caso de una respuesta vacía, que es lo
        // que devuelve el servidor cuando el refresh ya no vale.
        if (!accion.payload || !accion.payload.accessToken) {
          estado.accessToken = null
          estado.user = null
          estado.status = 'anonima'
          estado.error = null

          return
        }

        estado.accessToken = accion.payload.accessToken
        estado.user = accion.payload.user
        estado.status = 'autenticada'
        estado.error = null
      })
      .addCase(restoreSession.rejected, (estado) => {
        estado.accessToken = null
        estado.user = null
        estado.status = 'anonima'
        estado.error = null
      })
      .addCase(signIn.fulfilled, (estado, accion) => {
        estado.accessToken = accion.payload.accessToken
        estado.user = accion.payload.user
        estado.status = 'autenticada'
        estado.error = null
      })
      .addCase(signIn.rejected, (estado, accion) => {
        estado.accessToken = null
        estado.user = null
        estado.status = 'anonima'
        estado.error = accion.payload ?? 'No se pudo iniciar sesión'
      })
      .addCase(signUp.rejected, (estado, accion) => {
        estado.error = accion.payload ?? 'No se pudo completar el registro'
      })
      .addCase(signUp.fulfilled, (estado) => {
        // Registrarse deja a la persona en modo invitado y con la pantalla de
        // "revisa tu correo": no hay sesión hasta que verifique y entre.
        estado.accessToken = null
        estado.user = null
        estado.status = 'anonima'
        estado.error = null
      })
      .addCase(signOut.fulfilled, (estado) => {
        estado.accessToken = null
        estado.user = null
        estado.status = 'anonima'
        estado.error = null
      })
  },
})

export const {
  sesionSolicitada,
  sesionRestaurada,
  sesionCerrada,
  sesionNoRestaurada,
  errorDeOperacion,
} = authSlice.actions

export const authReducer = authSlice.reducer

export const selectSesionSolicitada = (estado: RootState): boolean => estado.auth.sesionSolicitada
export const selectAccessToken = (estado: RootState): string | null => estado.auth.accessToken
export const selectUsuario = (estado: RootState): UsuarioSesion | null => estado.auth.user
export const selectEstaAutenticada = (estado: RootState): boolean =>
  estado.auth.status === 'autenticada'
