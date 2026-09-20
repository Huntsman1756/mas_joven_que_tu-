# G10 — FINDINGS

Input normativo: `evidence/ux-audit-20260920/OBSERVATIONS.md` sobre `5df397d`.
Todos los G10-01..13 adjudicados PASS (14 → PASS_WITH_FINDINGS por hallazgos
nuevos descubiertos y corregidos). Detalle completo en `docs/gates/G10.md`.

## Nuevos defectos encontrados durante G10

| # | Defecto | Dónde | Fix |
|---|---------|-------|-----|
| N1 | `Number()` acepta hex/científico — `'0x7c0'` → 1984 pasaba como año válido | inputs Hero/ResultView/CompareYear **y** `parseUrl` (`?year=0x7c0`) | `parseYearInput`/`yr()` con regex `\d{1,4}` |
| N2 | Decimal en URL se truncaba (`1960.7` → 1960) — reparación silenciosa | `parseUrl` | fuera de dominio → `null`; test actualizado |
| N3 | Hotspots: `loading` eterno si el año cambiaba durante la request | `Hotspots.svelte` | invalidación por clave activa (`doneKey ?? reqKey`); descubierto por el E2E |
| N4 | Chip del díptico decía «hoy» sobre la campaña 2025 (contrato G9) | `es.ts` | `2025`; caption nombra ambas campañas |
| N5 | `{b.area_m2} m²` crudo → «null m²» en candidatos Catastro | `AddressSearch.svelte` | `—`/`fmt` |

## Clasificados sin bug

- `MapView` `app.year ?? 0`: inalcanzable (MapView solo monta dentro de
  ResultView, que exige `app.year`). `shareAfter` devuelve `null` sin serie.
- `ortho-probe` `app.year ?? 0`: solo ordena alternativas por cercanía.
- `cells.ts` `?? 0` en acumulador: correcto (suma).
- `AddressSearch`/`PlaceSearch` `onmouseenter` en listbox: sincroniza
  highlight con teclado ya existente — redundante, no exclusivo.
- `scrollIntoView` sin `behavior`: no hay `scroll-behavior: smooth` en CSS
  → 'auto' instantáneo; los que sí animan ya comprueban reduced-motion.
- `.bignum` en `--accent` sobre papel (4,35:1): texto ≥24 pt bold →
  AA Large (≥3:1). El único uso de acento como texto normal era el hover
  de `.cta-era` → corregido a `--accent-deep` (7,18:1).

## Adversarial cubierto

- Año inválido por click y por Enter; texto/decimal/hex/espacios.
- NORA bloqueado (request sin resolver): locales visibles <2 s.
- Request de hotspots en vuelo + cambio de año → respuesta descartada.
- Reduced-motion emulado: sin autoplay, pasos manuales OK.
- Viewport 320 px con municipio pequeño (Arakaldo 1987): sin overflow.
