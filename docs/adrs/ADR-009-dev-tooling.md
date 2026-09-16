# ADR-009 — Toolchain de desarrollo G1: Vitest, ESLint, Prettier

- Estado: aceptada
- Fecha: 2026-09-16
- Contexto: gate G1 requiere QA automatizada del dominio (umbrales de escala,
  URL state, proyección C-05, buckets, copy-lint) y coherencia de estilo.

## Decisión

- **Vitest** como runner de tests de dominio (unitarios TS puros, `environment: node`).
- **ESLint 9 flat config** + `typescript-eslint` + `eslint-plugin-svelte` +
  `eslint-config-prettier` (reglas de formato desactivadas vía Prettier).
- **Prettier** + `prettier-plugin-svelte` para formato.
- **PowerShell** `scripts/verify.ps1` como verificador local de fase.
- **GitHub Actions** `.github/workflows/ci.yml`: pytest + svelte-check + eslint +
  vitest + build + contrato HTTP Range del servidor estático.

## Alternativas consideradas

- Jest: más pesado, configuración ESM/Svelte más frágil que Vitest (mismo runner que Vite).
- Biome: rápido pero sin reglas svelte maduras; se descarta para no duplicar toolchain.
- Tests en `tests/` (Playwright e2e/a11y/visuales) se mantienen separados de los
  unitarios de dominio (`app/src/**`, Vitest) para poder correr en CI sin navegador.

## Consecuencias

- Nuevas devDependencies (todas MIT): vitest, eslint, prettier, eslint-plugin-svelte,
  typescript-eslint, svelte-eslint-parser, eslint-config-prettier, prettier-plugin-svelte,
  @eslint/js, @vitest/coverage-v8.
- `npm run test` ahora ejecuta Vitest (los tests G0 de `tests/data` siguen en pytest).
- Ninguna dependencia de runtime nueva: la superficie de producción no cambia.
