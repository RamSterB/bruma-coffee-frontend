/**
 * Babel solo para Jest.
 *
 * `babel.config.cjs` a propósito: el paquete es `"type": "module"`, así que un
 * `babel.config.js` se interpretaría como ESM y Babel no lo podría cargar con `require`.
 *
 * Solo se usa en los tests. El build de la aplicación lo hace Vite con Rolldown, sin
 * pasar por Babel.
 */
module.exports = {
  presets: [
    // `node: current` compila justo lo que necesita la versión de Node que ejecuta
    // Jest. No se baja a ES5: eso es trabajo que no aporta nada en un entorno de test.
    ['@babel/preset-env', { targets: { node: 'current' } }],
    // `runtime: 'automatic'` es el mismo modo que usa tsconfig (`jsx: react-jsx`):
    // no hace falta importar React en cada archivo.
    ['@babel/preset-react', { runtime: 'automatic' }],
    // Babel quita los tipos; el typecheck real lo hace `pnpm typecheck` con tsc.
    '@babel/preset-typescript',
  ],
}
