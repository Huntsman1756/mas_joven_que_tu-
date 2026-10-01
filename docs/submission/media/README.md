# Demo de la publicación — 1 octubre 2026

`demo-silenciosa.mp4` se ha regenerado con capturas directas de la web pública.
Fuente `252edcd`, Pages `bc47687`.
`capture-provenance.json` y `silent-provenance.json` vinculan imágenes, vídeo y
sello comprobado. El montaje conserva guion y subtítulos; no mide rendimiento.
El snapshot local previo está en el paquete `output/pdf/candidate-20261001/`;
la narración anterior permanece histórica y no se entrega.
Para recapturar: `CAPTURE_BASE` con la URL pública y
`node scripts/capture-submission.mjs` desde app, con el build publicado en app/build;
después `python scripts/build_silent_presentation.py` desde la raíz.

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
