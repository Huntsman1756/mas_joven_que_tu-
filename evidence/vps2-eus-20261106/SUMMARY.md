# QA de la release 077c2824d0ab en masjovenquetu.eus — 06-11-2026

Destino: `https://masjovenquetu.eus` (h1756-vps2, ADR-029). Build
`077c2824d0ab74513736510dcd582f05e9169596` = `main`, árbol limpio. Release anterior
conservada para rollback: `961ec281ef06`.

| Prueba | Resultado | Fichero |
|---|---|---|
| `deploy-check --profile=vps` (`EXPECTED_BUILD`) | 13/13 PASS (TLS Let's Encrypt, 301 HTTP→HTTPS, 404 real, Range 206 + firma PMTiles, caché, cabeceras) | `deploy-check.json` |
| Redirecciones | `www` y `http://` → `https://masjovenquetu.eus/…` con 301, conservando ruta y query | — (curl, registrado aquí) |
| `smoke_public` | PASS | `smoke-public.json` |
| `prod_smoke` | PASS | `prod-smoke.log` |
| `competition-matrix --public` | 9/9 perfiles PASS: Chromium, Firefox, WebKit escritorio; Pixel 5, Galaxy S9+, iPhone SE, iPhone 13 (vertical y apaisado), iPad Mini | `competition-matrix.json` |

DNS verificado en Google, Cloudflare y `ns1.dondominio.com`: solo `2.58.32.186`.
Capturas no versionadas; se regeneran con el mismo comando. Emulación Playwright:
no acredita Safari en iPhone físico ni Android físico (ADR-027).
