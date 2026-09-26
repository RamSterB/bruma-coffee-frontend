/**
 * Entorno de test: jsdom con los globals de Web API que jsdom no implementa.
 *
 * ¿Por qué un entorno propio y no un `setupFiles`? Porque este módulo se carga en
 * el realm de **Node**, no dentro del sandbox de jsdom. Eso permite leer los globals
 * reales de Node (`globalThis.Response`) y copiarlos a la ventana de jsdom. Con un
 * `setupFiles` no se podría: ahí dentro ya solo existen los globals de jsdom, y
 * por eso había que traer `undici` a mano.
 *
 * Se copian solo los que falten: si jsdom ya trae el suyo (Headers, FormData, Blob),
 * se respeta el de jsdom.
 *
 * Por qué NO se inyecta `MessageChannel`: React 19 lo detecta y, si lo encuentra, su
 * `scheduler` deja de usar su fallback de `setTimeout` y crea un `MessagePort` que
 * nunca se destruye. Jest responde "A worker process has failed to exit gracefully".
 * Sin `MessageChannel`, React usa el fallback y no queda ningún handle abierto.
 */
const JSDOMEnvironment = require('jest-environment-jsdom').default

const NODE_WEB_GLOBALS = [
  'Response',
  'Request',
  'fetch',
  'ReadableStream',
  'structuredClone',
  'TextEncoder',
  'TextDecoder',
  'crypto',
  'performance',
]

class BrumaTestEnvironment extends JSDOMEnvironment {
  async setup() {
    await super.setup()

    for (const name of NODE_WEB_GLOBALS) {
      if (this.global[name] === undefined && globalThis[name] !== undefined) {
        this.global[name] = globalThis[name]
      }
    }
  }
}

module.exports = BrumaTestEnvironment
