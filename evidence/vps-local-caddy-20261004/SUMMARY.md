# Caddy local frente al build en raíz — 04-10-2026

Objetivo: validar `deploy/Caddyfile` y el cambio a `BASE_PATH=''` antes de tener VPS
(ADR-028). No es un despliegue: HTTP en `localhost:8080`, sin TLS, DNS ni HSTS efectivo.

- Build: `eb3c3d4+dirty(16)` (cambios de este ADR sin commitear), `BASE_PATH=''`,
  sin `SITE_URL` (canonical sigue apuntando a Pages; no publicable).
- Servidor: imagen `caddy:2-alpine`, Caddy v2.11.4, `MJT_DOMAIN=http://:8080`.

## Contrato HTTP (`deploy-check --profile=vps`)

1. Primera ejecución con el Caddyfile previo + cambios: **FAIL** en
   `immutable-assets-cached` y `data-short-cache`; ambos respondían `no-cache`.
   El bloque `header` sin matcher se ordena después y pisa los de `@immutable`,
   así que la caché de un año de `_app/immutable` **tampoco funcionaba en la
   plantilla original**.
2. Corrección: `?Cache-Control "no-cache"` (valor por defecto). Segunda ejecución:
   12/12 PASS (`evidence/deploy-check/2026-10-04T04-34-06-639Z/report.json`).
   Range 0-126 → 206, `bytes 0-126/1681173`, 127 bytes, firma `PMTiles`, sin
   `Content-Encoding`. Recurso ausente → 404.

## Matriz de navegadores (`competition-matrix --public`, fixtures)

| Corrida | Resultado |
|---|---|
| `matrix/` (9 perfiles, Caddy) | 5 PASS; FAIL firefox, webkit desktop, iphone-se, iphone13 (timeouts de 15 s sin pageerror ni peticiones fallidas) |
| `baseline-static-server/` (4 fallidos, servidor del proyecto) | webkit ×3 PASS; firefox FAIL (`page.goto` timeout) |
| `matrix-rerun/` (4 fallidos, Caddy) | webkit ×3 PASS; firefox FAIL |
| `matrix-firefox/` (solo firefox, Caddy) | FAIL (`page.goto` timeout) |

Lectura: los fallos de WebKit no se reproducen al repetir y las capturas muestran la
página renderizada, así que se atribuyen a carga de la máquina. Firefox falla igual con
ambos servidores y ya fallaba en local el 01-10
(`mobile-map-stability-20261001/matrix-size`), así que no se atribuye a Caddy.
**Firefox queda NO VERIFICADO** para este cambio hasta una corrida en CI (contenedor
Playwright) o en el VPS. No se ampliaron timeouts.

Pendiente en VPS real: TLS, HSTS, redirección HTTP→HTTPS, HTTP/3, móviles físicos.
