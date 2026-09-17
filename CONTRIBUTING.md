# Contribuir

Gracias por tu interés. Este repositorio se construye *evidence-first*: las reglas
de trabajo están en [`AGENTS.md`](AGENTS.md) y son **obligatorias**. Léelas antes
de proponer cambios — en particular los principios 1–12 y las reglas semánticas
no negociables (p. ej. `Ano_Constr` es la métrica primaria; `UNKNOWN != 0`).

## Puesta en marcha

```powershell
# 1. Comprueba que tu entorno tiene lo necesario (no instala nada)
powershell -File scripts\preflight.ps1 -Phase app

# 2. Pipeline de datos (opcional; solo si tocas datos)
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r pipeline\requirements.txt
python -m pytest tests/data -q

# 3. App (SvelteKit estático)
cd app
npm install
npm run dev          # http://localhost:5173
```

Los PMTiles no se versionan: sin ejecutar el pipeline de datos + tiles la app
arranca pero no muestra edificios. Ver `AGENTS.md` §Comandos.

## Antes de abrir un PR

```powershell
cd app
npm run check        # tipos + a11y (svelte-check)
npm run lint         # eslint
npm run format       # prettier --write (CI comprueba formato)
npm run test         # vitest
npm run build        # build estático
cd ..; python -m pytest tests/data -q
```

O todo junto: `powershell -File scripts\verify.ps1` (requiere haber generado
los PMTiles de G1; con `-Quick` se omite la comprobación del servidor Range).

## Reglas rápidas

- Copy en **español** (`docs/UX_COPY.md` es la fuente canónica; hay un copy-lint
  en los tests). La estructura i18n está preparada para euskera, sin traducciones
  automáticas.
- Cambios de datos → actualiza `data/manifests/` y `data/qa/`.
- Cambios de arquitectura → ADR nuevo en `docs/adrs/`.
- Cambios de producto → `docs/PRODUCT.md` y `docs/UX_COPY.md` a la vez.
- No afirmes que un endpoint, imagen o tile «funciona» sin comprobar su contenido
  (HTTP 200 no basta — ver `AGENTS.md` principio 2).
- Material de terceros: revisa la licencia del **dato** (no solo del software) y
  documéntala en `docs/DATA_SOURCES.md` / `docs/OSS_REUSE.md`.

## Reportar problemas

Abre un issue describiendo qué intentabas, qué esperabas y qué ocurrió, con el
navegador/entorno si es un problema de la app. Para problemas de seguridad usa el
proceso de [`SECURITY.md`](SECURITY.md), no un issue público.
