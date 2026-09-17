# ADR-003 — PMTiles (estático) frente a GeoJSON/WFS en runtime

- **Estado:** aceptado
- **Fecha:** 2026-09-16

## Contexto

Debemos servir potencialmente cientos de miles de polígonos de edificios con atributos
(año, uso, estado) a múltiples zooms. Opciones: PMTiles estáticos, GeoJSON/WFS servidos
en runtime, o tile server propio.

## Decisión

Generar **PMTiles** con **tippecanoe** y servirlos como fichero estático.

## Motivos

- Sin servidor de tiles: encaja con el principio *static-first* y con "no backend por defecto".
- Multizoom y generalización gestionados en la generación, no en el cliente.
- CORS trivial (mismo origen servido por el hosting estático).
- Licencias permisivas (PMTiles BSD-3/spec CC0, tippecanoe BSD-2).
- Menos dependencias operativas y menor coste que un tile server.

## Alternativas consideradas

- **GeoJSON en runtime:** inviable a la escala de toda Bizkaia; el cliente no debe
  descargar y dibujar miles de polígonos a zoom bajo. `REJECT`.
- **WFS Catastro en runtime:** útil para consultas puntuales, pero no para render masivo
  (formato GML, sin JSON, latencia). `REJECT` como capa principal; se conserva como
  fuente de verificación puntual.
- **Tile server propio (PostGIS/tileserver):** viola "no backend sin necesidad". `REJECT`.

## Consecuencias

- El pipeline debe ejecutarse offline para regenerar tiles (documentado en `METHODOLOGY.md`).
- Hay que versionar/depositar los PMTiles como artefacto de build (no en git si son grandes).
- Las capas de edificios, agregados por celda y municipios se empaquetan con `minzoom`/`maxzoom`.

## Enmienda (2026-09-16) — vía reproducible para `tippecanoe`

**Problema:** `tippecanoe` no está instalado de forma nativa en el entorno
(Windows). Declarar el pipeline «reproducible» con una dependencia sin vía de ejecución
definida invalidaba la afirmación.

**Estado del entorno medido:** Docker **29.7.2** (cliente y motor Linux) operativo;
WSL2 con Ubuntu presente (detenido). Nada más.

**Decisión — vía primaria: contenedor Docker con versión fijada.**

- `pipeline/docker/tippecanoe.Dockerfile` compila **tippecanoe 2.79.0** (release fijado)
  desde fuente sobre una base Debian fijada por digest/tag.
- Comando de construcción y uso: `scripts/g1_build_tiles.ps1` (o
  `scripts/g1_build_tiles.sh`; `docker build -t mjt-tippecanoe:2.79.0 ...` y
  `docker run --rm -v ...`).
- Verificación: `scripts/preflight.ps1 -Phase tiles` comprueba `docker version` (servidor)
  y que la imagen responde `tippecanoe --version` = 2.79.0.

**Fallback documentado:** WSL2 Ubuntu — compilar tippecanoe 2.79.0 con
`apt install build-essential libsqlite3-dev zlib1g-dev` y las dependencias de la release.
Se usa solo si Docker no está disponible.

**Alternativas descartadas:** imágenes comunitarias de Docker Hub
(`klokantech/tippecanoe`, etc.) — mantenimiento y versiones no garantizados, no auditables.
`REJECT` como vía reproducible; se admite solo como prueba exploratoria.

**Impacto:** el «pipeline reproducible» deja de depender de una instalación nativa ausente;
la versión de tippecanoe queda congelada y verificable por preflight.

**Verificación ejecutada (2026-09-16):** `docker build` completó correctamente y
`docker run --rm mjt-tippecanoe:2.79.0 --version` devuelve **`tippecanoe v2.79.0`**.
Imagen resultante: `mjt-tippecanoe:2.79.0`, 628 MB,
digest de manifest list `sha256:4b9951936dff13a4d05dff65e01ef464cf134fc4ddc1e0615c9668369cf7acf2`.
`scripts/preflight.ps1 -Phase g0` pasa: `docker client` 29.7.2, `docker server` 29.7.2,
imagen presente y respondiendo.
