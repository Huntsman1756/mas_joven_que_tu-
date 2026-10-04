# Preparación de dominio y VPS

La aplicación es estática. El pipeline Python prepara los datos fuera del servidor;
no hace falta ejecutar SvelteKit, Python, una base de datos ni un servidor de desarrollo
en producción. Configuración propuesta: `deploy/Caddyfile`, pendiente de validar con
Caddy en el VPS elegido. No se ha comprado dominio ni desplegado este candidato.

## Construcción

Desde `app/`, con el dominio definitivo (el siguiente es un ejemplo reservado):

```powershell
$env:SITE_URL = 'https://ejemplo.invalid'
$env:BASE_PATH = ''
npm ci
npm run check
npm run lint
npm run test
npm run build
```

`SITE_URL` se lee durante el build, no al arrancar el servidor. Genera canonical,
Open Graph, Twitter, robots y sitemap para ambas rutas. Para alojamiento bajo una
subruta, esa misma ruta debe constar en `BASE_PATH`. Sin `SITE_URL` se conserva la
URL de Pages existente. No publicar un build con el dominio de ejemplo.

**Los PMTiles están ignorados por Git.** Un clon limpio y `npm ci` no los recuperan.
Antes del build, reponer los artefactos verificados en `app/static/data/` siguiendo
sus manifests, o ejecutar el pipeline documentado. Conservar sus hashes.

## Publicación, cuando se disponga de destino

1. Apuntar A/AAAA al VPS real (publicar AAAA solo si IPv6 funciona). Configurar
   `MJT_DOMAIN` en el entorno del servicio Caddy con el dominio comprado.
2. Publicar **solo el contenido de `app/build/`** en
   `/srv/mas-joven/releases/<identificador>/`. Conservar el candidato anterior,
   manifiesto SHA-256 y copia de los datos de runtime; Git solo no es un backup.
3. El usuario de Caddy debe tener lectura, sin escritura sobre los artefactos.
   Validar `caddy validate --config /etc/caddy/Caddyfile` y cambiar el enlace
   `/srv/mas-joven/current` de forma atómica a la release comprobada.
4. Permitir HTTP/HTTPS para certificado y servicio, conservando acceso SSH.
   Acordar los cambios de firewall con el administrador del VPS.
5. Verificar HTTPS, redirección HTTP, ambas rutas, 404 real para recurso ausente,
   caché y mapas en navegador. La CSP por hashes ya está en los HTML del build;
   no sustituirla por una cabecera incompatible. No se activa listado de directorios.
6. Probar una petición `Range: bytes=0-126` a `/data/cells.pmtiles`: exigir 206,
   Content-Range coherente, 127 bytes y firma PMTiles, no solo Accept-Ranges.
   Abrir el mapa y comprobar contenido después. Probar también ortofotos reales.
7. Revisar canonical, tarjeta social, sitemap y links compartidos contra el dominio
   definitivo. Repetir smoke tras publicar y actualizar el paquete del concurso.
8. Rollback: cambiar `current` al candidato anterior y repetir rutas/Range/mapa.

El HTML se revalida siempre; `/data/*` usa `max-age=3600` (ADR-028: tras cambiar
`current`, un cliente puede tardar hasta 1 h en ver datos nuevos); solo
`_app/immutable` usa caché de un año. HSTS va sin `includeSubDomains`. Caddy gestiona HTTPS al disponer de DNS
y conectividad correctos. Los logs de acceso no se activan aquí: si se habilitan,
revisar conservación de IP y query del año personal antes de cambiar la política.

## Verificación del despliegue

Todos los scripts de QA publicada leen `QA_BASE_URL` (por defecto, GitHub Pages).
Desde `app/`:

```powershell
$env:QA_BASE_URL = 'https://dominio-real'      # sin barra final
$env:EXPECTED_BUILD = '<sha de la release>'
node scripts/deploy-check.mjs --profile=vps    # rutas, 404, Range+firma, caché, cabeceras, HTTP→HTTPS
node scripts/smoke_public.mjs                  # ortofotos y servicios reales
node scripts/prod_smoke.mjs                    # recorrido sin stubs
node scripts/competition-matrix.mjs --public   # Chromium/Firefox/WebKit + perfiles móvil/tablet
```

En CI: workflow `VPS release QA` (`release-qa-vps.yml`) con `base_url` y
`source_sha`. Evidencia en `evidence/deploy-check/` y artefacto del workflow.

### Niveles de prueba (ADR-028)

| Cambio | Mínimo exigido |
|---|---|
| Solo servidor (cabeceras, caché, TLS, Caddy) | `deploy-check --profile=vps` + `smoke_public` + mapa en un móvil real |
| `BASE_PATH`, dependencias o build | Lo anterior + `competition-matrix` completa (local y `--public`) |
| Código del front | Lo anterior + `reading-qa` + `map-navigation-qa` + iPhone y Android físicos |

Prueba local de la configuración sin VPS (Docker, solo HTTP, sin HSTS efectivo):

```bash
BASE_PATH='' npm run build   # desde app/
docker run --rm -p 8080:8080 -e MJT_DOMAIN=http://:8080   -v "$PWD/../deploy/Caddyfile:/etc/caddy/Caddyfile:ro"   -v "$PWD/build:/srv/mas-joven/current:ro" caddy:2-alpine
QA_BASE_URL=http://localhost:8080 node scripts/deploy-check.mjs --profile=vps
```

Fuentes: [file_server](https://caddyserver.com/docs/caddyfile/directives/file_server),
[patrones oficiales](https://caddyserver.com/docs/caddyfile/patterns).

Pendiente en servidor real: validación de configuración, TLS/DNS, Range,
restauración, espacio de disco, actualizaciones y disponibilidad. La plantilla
no acredita esos controles ni presupone proveedor o coste.
