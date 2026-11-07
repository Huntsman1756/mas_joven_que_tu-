# Demo silenciosa: subtítulos en franja propia (07-11-2026)

- Problema observado: en `demo-silenciosa.mp4` la primera línea del subtítulo se
  superponía a la captura (texto oscuro sin fondo sobre el mapa).
- Cambio (`scripts/build_silent_presentation.py`): la captura se escala a 1920×840 y
  los subtítulos van en blanco sobre una franja #182631 de 240 px (y = 840–1080).
  Mismo SRT, mismas capturas y mismos tiempos; solo cambia la composición.
- Sello del build acreditado: `published-index.html`, descargado de
  https://masjovenquetu.eus/ (`mjt:build` = 32e4831), el mismo build de las capturas.
- Paquete regenerado en `output/pdf/final-20261107-v2/` (el de `final-20261107/` queda
  como estaba). `pdf/` contiene las páginas renderizadas para revisión visual.
