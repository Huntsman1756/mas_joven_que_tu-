# ADR-027 — Caso editorial junto al mapa y QA por motores

Estado: aceptado, 30-09-2026.

El ejemplo de portada enfocaba un capítulo situado después del contexto y la
distribución. El mapa quedaba fuera de ese recorrido y las cifras municipales
podían confundirse con el conjunto local. Se monta el capítulo lazy en la columna
del resultado, junto al lienzo. Su título es el h1; el municipio completo es un
details etiquetado de contexto. El índice inferior sigue permitiendo otros casos.
Las métricas, fuentes y snapshots personales no cambian.

`competition-matrix.mjs` verifica secuencialmente Chromium, Firefox y WebKit y
perfiles Android/iPhone/tablet. Las fixtures verifican comportamiento de la app;
`--live` caracteriza aparte servicios reales. Cada ejecución registra versiones,
sello, checks, errores y capturas sin sobrescribir corridas anteriores.
Una captura o canvas no bastan: se exigen features vectoriales renderizadas.
Las pruebas emuladas no acreditan teléfonos físicos ni revisión humana/nativa.

Los tests Vitest usan un trabajador para evitar competencia de disco en barridos
reales. No se amplían timeouts ni se eliminan comprobaciones para lograr un PASS.

Rollback: devolver el capítulo a StoriesSection y el bloque municipal a section;
retirar únicamente la matriz y su job CI. Los archivos de datos quedan intactos.
