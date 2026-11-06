# ADR-029 — Contenedor Caddy en h1756-vps2 con releases inmutables

Estado: aceptado, 06-11-2026. Concreta el destino que ADR-028 dejaba abierto.

## Contexto

ADR-028 preparó un Caddyfile para un VPS sin decidir cuál. El servidor elegido,
`h1756-vps2`, ya sirve otras webs detrás del Traefik de Coolify (TLS con Let's
Encrypt, reto HTTP) y tiene un desplegador automático (`h1756-deploy`) que:

- solo acepta dominios bajo `h1756.es`; el dominio del proyecto es
  `masjovenquetu.eus`;
- construye desde el tarball del commit, y los PMTiles no están en Git
  (`.gitignore`, `RETENTION.md`): una imagen así saldría sin mapa y pasaría la
  salud por defecto (2xx en `/`).

Adaptar ese desplegador implicaría tocar infraestructura compartida con otras
webs a dos semanas del plazo.

## Decisión

1. **Contenedor propio, fuera de `h1756-deploy`.** `deploy/vps/compose.yml`
   arranca `caddy:2.11.4-alpine` fijado por digest, sin root, con sistema de
   ficheros de solo lectura, sin capacidades y sin puertos publicados; Traefik
   enruta por etiquetas con la plantilla del servidor. Todo vive en
   `/srv/h1756/masjoven`. Sin receta en `/etc/h1756-deploy/projects`, el
   desplegador no lo gestiona ni lo toca.
2. **Un router por dominio.** `masjoven.h1756.es` (cubierto por el comodín DNS
   del servidor) y `masjovenquetu.eus` tienen routers distintos: si el
   certificado de uno falla, el otro sigue sirviendo. El del `.eus` se añade
   cuando su registro A apunte al servidor.
3. **Releases inmutables.** `scripts/deploy-vps.sh` exige árbol limpio y PMTiles
   presentes, construye con `SITE_URL`, genera `SHA256SUMS`, lo verifica en el
   servidor y publica en `releases/<sha12>`. `releases/current` es un enlace
   relativo que se cambia de forma atómica (`mv -T`); el contenedor monta
   `releases/` en solo lectura y sirve `current`. Rollback:
   `deploy-vps.sh --rollback <sha12>`.
4. **Un solo Caddyfile** (`deploy/Caddyfile`) para contenedor y host, mediante
   `MJT_DOMAIN`/`MJT_ROOT`. Cambios respecto a ADR-028: `admin off`, sin
   `encode` para `*.pmtiles` (el Range describe siempre los bytes del fichero),
   `/healthz` para el healthcheck, 404 real con cuerpo `404.html`, sin cabecera
   `Server`.
5. **GitHub Pages sigue publicado** como URL permanente y gratuita: las bases no
   obligan a mantener el dominio y la memoria cita ambas.

## Consecuencias

- Un despliegue es manual (`deploy-vps.sh`) y lo valida `deploy-check
  --profile=vps` + la batería de ADR-028. No hay despliegue al fusionar en
  `main`.
- Los PMTiles viajan con cada release (≈ 80 MB); se conservan las cuatro
  releases más recientes además de la actual y la anterior.
- La limpieza de disco del servidor (`docker image prune`) no afecta: la imagen
  está en uso y los datos no están en imágenes.

Rollback de la decisión: `docker compose down` en `/srv/h1756/masjoven`; Pages no
se ve afectado.
