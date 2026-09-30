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

La matriz CI usa la imagen oficial Playwright 1.63.0 Noble (misma versión
que package-lock), fijada por digest Linux amd64. Incluye los tres motores y
sus bibliotecas; evita descargar 121 paquetes del mirror Ubuntu en cada run.
Referencia: https://playwright.dev/docs/ci#via-containers.
El diagnóstico de rendimiento registra 20 repeticiones por perfil; mide deep
link desde commit de navegación y no lo confunde con latencia desde CTA.
La introducción de los cinco modos se extrae a MapIntro conservando sus estilos.
Las importaciones individuales de Lucide evitan recorrer miles de iconos ajenos.

La prueba iPhone SE detectó un salto al lienzo tras el foco automático: el capítulo
espera el tick, enfoca sin desplazamiento implícito y posiciona su encabezado.
La matriz conserva ese aserto. Las fixtures raster declaran CORS como el proveedor;
la CSP permite conexiones blob locales para las imágenes del motor en WebKit,
sin añadir orígenes externos. El contenedor usa UID 1001 para que Firefox no
arranque como root dentro del HOME de pwuser. Un constructor gráfico fallido
deja un aviso recuperable y conserva los datos; no se cuenta como mapa renderizado.

Los tests Vitest usan un trabajador para evitar competencia de disco en barridos
reales. No se amplían timeouts ni se eliminan comprobaciones para lograr un PASS.

Rollback: devolver el capítulo a StoriesSection y el bloque municipal a section;
retirar únicamente la matriz y su job CI. Los archivos de datos quedan intactos.
