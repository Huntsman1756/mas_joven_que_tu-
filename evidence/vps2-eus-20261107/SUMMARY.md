# QA de la release 32e483174bb9 en masjovenquetu.eus — 07-11-2026

Build `32e483174bb99c9da42ce3576c79a548ef0c786e` (`main`, PR #9: transparencia de la huella,
arreglos móvil/Safari, subtítulos, control ortográfico EU). Release anterior conservada
para rollback: `223b0b5f4bc0`.

| Prueba | Resultado | Fichero |
|---|---|---|
| `deploy-check --profile=vps` (`EXPECTED_BUILD`) | 13/13 PASS | `deploy-check.json` |
| `smoke_public` | PASS | `smoke-public.json` |
| `prod_smoke` | PASS | `prod-smoke.log` |
| `competition-matrix --public` | 9/9 perfiles PASS (Chromium, Firefox, WebKit escritorio; Pixel 5, Galaxy S9+, iPhone SE, iPhone 13 vertical y apaisado, iPad Mini) | `competition-matrix.json` |

Antes de publicar: matriz local 9/9, `mobile-map-qa` 6/6 (Chromium, Firefox, WebKit ×
ES/EU) y CI de la PR #9 en verde. Emulación Playwright: no acredita Safari en iPhone
físico ni Android físico (ADR-027).
