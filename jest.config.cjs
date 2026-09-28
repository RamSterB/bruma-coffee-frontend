/**
 * Configuración de Jest para el frontend.
 *
 * Sustituye a `vitest.config.ts`: Jest es el runner de los dos repos, y en este se
 * migró desde Vitest para que ambos tuvieran el mismo.
 *
 * Lo que Vitest heredaba de `vite.config.ts` y aquí hay que replicar a mano, porque
 * Jest no lee la configuración de Vite:
 *   - la transformación de TS/TSX (aquí, `babel-jest`; ver `babel.config.cjs`),
 *   - el archivo de `setup`,
 *   - `css: false`.
 *
 * No hay alias `@/` ni `import.meta.env` en el código, así que no hace falta
 * `moduleNameMapper` para ninguno de los dos.
 *
 * Los globals de Web API que jsdom no implementa (`Response`, `fetch`, `TextEncoder`...)
 * los aporta `jest.environment.cjs`, no este archivo.
 */

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: '<rootDir>/jest.environment.cjs',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],

  // Los tests del modal escriben siete campos con `userEvent`, que pulsa tecla por
  // tecla, y con la suite completa en paralelo se queda sin tiempo de CPU. Con los 5 s de
  // Jest por defecto fallan tests que pasan en solitario, y ese tipo de fallo
  // intermitente por lentitud es peor que ningún test: entrena a ignorar los rojos.
  testTimeout: 20000,

  // Se usa `babel-jest` y no un transformador de TypeScript por tres motivos, todos
  // comprobados durante la migración y no supuestos:
  //
  //  1. Importar `jest` desde `@jest/globals` (que es lo que exige `verbatimModuleSyntax`
  //     para tener tipos) deja de funcionar los `jest.mock()` de los tests: el mock se
  //     registra pero el módulo ya se había cargado real. Con SWC fallaban 47 tests.
  //  2. Babel quita los tipos correctamente, incluidos los argumentos de tipo de las
  //     llamadas (`createAsyncThunk<A, void, {...}>(...)`). Ojo: si `@babel/core` y los
  //     presets son de majors distintos, el stripping NO ocurre y el fallo se ve como un
  //     error de sintaxis confuso. Los dos tienen que estar en 7.
  //  3. `babel-jest` instrumenta la cobertura por su cuenta, sin montar nada.
  transform: {
    '^.+\\.(t|j)sx?$': 'babel-jest',
  },

  // `restoreMocks` es el equivalente exacto de la opción homónima de Vitest: cada
  // test empieza con los spies limpios.
  restoreMocks: true,

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Mismo criterio que Vitest: solo los archivos de src, sin los propios tests.
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/test/**',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageReporters: ['text', 'html'],

  // El piso de cobertura está en 86 % en los cuatro indicadores. Es un piso, no un techo.
  // Se mantiene el mismo 86 que usaba Vitest: la migración cambia el runner, no el
  // listón.
  coverageThreshold: {
    global: {
      statements: 86,
      branches: 86,
      functions: 86,
      lines: 86,
    },
  },
}
