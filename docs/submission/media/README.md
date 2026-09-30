# Demo silenciosa vigente — 30 septiembre 2026

La entrega utiliza `demo-silenciosa.mp4`, regenerada con capturas del candidato
actual. `capture-provenance.json` y `silent-provenance.json` vinculan imagen,
vídeo y sello del build. Reproducir con `node app/scripts/capture-submission.mjs`
(desde app: `node scripts/capture-submission.mjs`) y
`python scripts/build_silent_presentation.py` desde la raíz.
La narración anterior queda como material histórico y no se entrega.
El montaje conserva el guion y sus subtítulos; no mide rendimiento.

# Demo anterior — registro histórico

Abrir `index.html` para el paquete compacto. `demo-es.mp4` incluye voz y
subtítulos incrustados; `demo-silenciosa.mp4` conserva subtítulos sin audio.
`demo.es.srt`, `demo.es.vtt`, `transcript.es.md` y `timing.json` son editables.

Origen visual vigente: `capture-provenance.json`. La ronda 28-09 recaptura
Chrome sobre el build estático corregido, no Vite dev. No certificado contra
producción. Las imágenes son reales, sin fixtures; Evolución contiene 80
fotogramas nuevos con tiempos registrados en `play-frames-build/`.
La secuencia anterior de desarrollo se conserva en `play-frames/` como histórica.
El montaje mantiene el último fotograma durante la explicación; no prueba rendimiento.

Reproducir: Python con edge-tts==7.2.8, ffmpeg/ffprobe y
`python scripts/build_presentation_media.py`. Audios existentes se reutilizan;
si cambia el guion, conservar los anteriores y regenerar los segmentos afectados.

Voz sintética es-ES-ElviraNeural (Microsoft Edge). No se ha clonado una voz
personal. La licencia del programa edge-tts no concede por sí sola derechos
sobre el servicio de voz: revisar condiciones de distribución antes de usar
la narración como entrega pública; la versión silenciosa queda disponible.
Sin música, stock ni código copiado de otras candidaturas. Las atribuciones de
Open Data Bizkaia y geoEuskadi se conservan en las capturas; licencias en
`../SOURCES-LICENSES.md`. No afirmar licencia CC para la voz.

Pendiente humano: escucha editorial, pronunciación y revisión nativa EU;
los textos EU modificados siguen siendo borrador asistido. El subtítulo debe
probarse con personas nuevas. No se ha realizado ningún trámite administrativo.
