import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // `cloudfront/` no es codigo de la aplicacion: son las funciones que ejecuta el
  // servicio de CDN. La de la tienda declara un `handler` que el runtime invoca, y a
  // eslint le parece una variable sin usar porque nadie la llama desde el codigo.
  { ignores: ['dist', 'cloudfront/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    // Configuración de Jest y Babel. Son CommonJS a propósito: el paquete es
    // `"type": "module"` y Jest no lee un `jest.config.js` que se interprete como ESM.
    // Se ejecutan en Node, no en el navegador, y por eso necesitan `require` y `module`.
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
)
