# QA de la release 961ec281ef06 en h1756-vps2 (staging) — 06-11-2026

Destino: `https://masjoven.h1756.es` (canonical ya en `https://masjovenquetu.eus`, aún
sin DNS). Build `961ec281ef0617286b91352acdcc33cf82e44ea1`, árbol limpio.

| Prueba | Resultado | Fichero |
|---|---|---|
| `deploy-check --profile=vps` | 13/13 PASS (TLS Let's Encrypt, 301 HTTP→HTTPS, 404 real, Range 206 + firma PMTiles, caché, cabeceras) | `deploy-check.json` |
| `smoke_public` | PASS (ortofotos reales decodificadas, 10/12 muestras no uniformes; deep link; sin pageerrors) | `smoke-public.json` |
| `prod_smoke` | PASS | `prod-smoke.log` |
| `competition-matrix --public` | 9/9 perfiles PASS: Chromium, Firefox, WebKit escritorio; Pixel 5, Galaxy S9+, iPhone SE, iPhone 13 (vertical y apaisado), iPad Mini | `competition-matrix.json` |

Capturas no versionadas (13 MB); se regeneran con el mismo comando. Emulación
Playwright: no acredita Safari en iPhone físico ni Android físico (ADR-027).
