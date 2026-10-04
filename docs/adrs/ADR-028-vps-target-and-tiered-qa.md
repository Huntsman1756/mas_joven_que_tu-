# ADR-028 — VPS como destino y QA por niveles

Estado: aceptado, 04-10-2026.

## Contexto

El candidato del concurso se publica en GitHub Pages bajo
`/mas_joven_que_tu-/`. Se quiere servir después desde un VPS con dominio propio.
La app sigue siendo estática (ADR-002, ADR-006): cambia el servidor, no el
producto. La URL de Pages estaba escrita en unos diez scripts de QA, de modo que
reutilizar la batería contra otro destino obligaba a editarlos.

## Decisión

1. **Sin cambios de front para migrar.** El único cambio que llega al build es
   `BASE_PATH=''` (dominio raíz). Las mejoras de front se hacen en releases
   separadas para no mezclar dos causas posibles de un fallo por navegador.
2. **Destino de QA único**: `scripts/qa-target.mjs` lee `QA_BASE_URL` (Pages por
   defecto). Lo usan `competition-matrix --public`, `smoke_public`, `prod_smoke`
   y las sondas Android. `competition-matrix --public` ya no exige build local.
3. **Contrato HTTP sin navegador**: `scripts/deploy-check.mjs` comprueba rutas,
   404 real, Range con firma `PMTiles`, caché y, con `--profile=vps`, revalidación
   del HTML, cabeceras del Caddyfile y redirección HTTP→HTTPS. El Range se pide con
   `Accept-Encoding: identity`, como hace un navegador (estándar Fetch). Con gzip,
   GitHub Pages sirve un rango del fichero comprimido entero; se registra como dato
   (`evidence/front-fix-20261004/SUMMARY.md`).
4. **Caddyfile**: `/data/*` pasa de `no-cache` a `max-age=3600`. Antes cada
   Range de PMTiles revalidaba contra el servidor. Tras un cambio de release, un
   cliente puede ver datos anteriores hasta 1 h; si mezcla rangos de dos
   versiones, `pmtiles` 4.5.0 detecta el ETag distinto, invalida la cabecera y
   reintenta con `cache: "reload"` (comprobado en `node_modules/pmtiles`).
   Se añade HSTS (`max-age=31536000`, sin `includeSubDomains` ni `preload`,
   porque el dominio aún no existe). HTTP/3 queda con el valor por defecto de
   Caddy y se registra `alt-svc` como dato, no como check.
   La prueba con Caddy 2.11.4 en Docker mostró que el `Cache-Control "no-cache"`
   global pisaba el de `@immutable`: la caché de un año nunca se aplicaba. Se
   corrige con `?Cache-Control` (valor por defecto); evidencia en
   `evidence/vps-local-caddy-20261004/SUMMARY.md`.
5. **Workflow `release-qa-vps.yml`**: misma batería que `release-qa.yml` más la
   matriz de motores, contra `base_url`, verificando `mjt:build` servido.

## Niveles de prueba

| Cambio | Mínimo exigido |
|---|---|
| Solo servidor (cabeceras, caché, TLS, Caddy) | `deploy-check --profile=vps` + `smoke_public` + mapa en un móvil real |
| `BASE_PATH`, dependencias o build | Lo anterior + `competition-matrix` completa (local y `--public`) |
| Código del front | Lo anterior + `reading-qa` + `map-navigation-qa` + iPhone y Android físicos |

Las pruebas emuladas no acreditan Safari iOS real (ADR-027).

## Consecuencias

- Dos destinos mientras dure el concurso; el canonical del build del VPS apunta
  a su dominio (`SITE_URL`), el de Pages a Pages.
- Datos actualizados tardan hasta 1 h en llegar a clientes con caché.

Rollback: devolver `/data/*` a `no-cache` en el Caddyfile; `QA_BASE_URL` sin
definir mantiene el comportamiento previo de todos los scripts.
