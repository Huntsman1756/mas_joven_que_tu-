# Demo editorial producida

Abrir `index.html` para el paquete compacto. `demo-es.mp4` incluye voz y
subtítulos incrustados; `demo-silenciosa.mp4` conserva subtítulos sin audio.
`demo.es.srt`, `demo.es.vtt`, `transcript.es.md` y `timing.json` son editables.

Origen visual: Chrome sobre http://127.0.0.1:5202, candidato local con ajustes
del commit c417f34. No grabado sobre el build congelado ni certificado contra
producción. No sustituye la captura final del release. Las imágenes son reales,
sin fixtures; Evolución contiene 55 fotogramas reales con tiempos registrados.
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
