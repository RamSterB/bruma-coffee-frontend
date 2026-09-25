---
name: test-driven-development
description: Use when writing ANY new feature, bugfix, or refactor in this repo. Enforces Red-Green-Refactor with Jest + React Testing Library. Write the failing test first, watch it fail, then implement.
---

# Test-Driven Development (Jest + RTL)

**Iron Law — NO production code without a failing test first.**

## Ciclo RED → GREEN → REFACTOR

1. **RED** — escribe un test mínimo que falle por la razón correcta.
2. **Verifica RED** — ejecuta `pnpm test <ruta>`. Debe **fallar** (no pasar, no dar error de tipado).
3. **GREEN** — código mínimo para pasar el test.
4. **Verifica GREEN** — ejecuta `pnpm test <ruta>`. Debe **pasar**.
5. **REFACTOR** — limpia duplicación, mejora nombres. Los tests siguen verdes.

## Stack de testing

- **Jest** con `jsdom`/RTL para componentes.
- Redux: probar **slices** (reducers puros) y **thunks** con un store real (`configureStore`), no mocks innecesarios.

```ts
test('rejects empty email', async () => {
  const result = await submitForm({ email: '' });
  expect(result.error).toBe('Email required');
});
```

## Buenos tests (y malos)

| Bien | Mal |
|---|---|
| Un solo comportamiento | `test('test1')` / nombre vago |
| Nombre describe la conducta esperada | Prueba la implementación |
| Usa código real | Mock de todo (solo mock cuando es inevitable) |

## Requisitos

- `pnpm test` (suite completa) debe pasar **sin warnings ni errores** antes de dar una tarea por cerrada.
- Si un test pasa inmediatamente al escribirlo: algo mal — borra y vuelve a RED.
- Si los tests fallan pero el código "parece bien": el test enseña un problema real. Escúchalo.
- Corre siempre la suite completa al terminar, no solo "el archivo del cambio".

## Scoreboard de atajos "atravesarse" — prohibidos

| Excusa | Realidad |
|---|---|
| "Ya lo probé a mano" | No es repetible ni cubre casos edge. |
| "Los tests después cumplen lo mismo" | Los tests que pasan al instante no prueban nada — escribiste para pasar, no para fallar. |
| "Esto es muy simple para TDD" | El código simple también se rompe. 30 segundos de test. |
| "Adaptar código existente" | Borra y empieza con el test. Keeping as reference = test-after. |

## Final

```
Production code → test existe y falló antes
Otherwise → no es TDD
```

Callback a "necesito ver el fallo" es la regla de oro: **si no viste fallar el test, no puedes confirmar que prueba lo correcto.**
