# Mejora para el concurso — 30 septiembre 2026

Esta carpeta conserva intentos y resultados, incluidos fallos. El registro final
de despliegue será RELEASE.md; un resultado de otra versión no certifica el candidato.

## Evidencia anterior al candidato sellado

- 279 pruebas de aplicación y 18 de servidor/raster/SEO pasaron; 49 de datos pasaron.
- Inicialmente, el barrido de 112 archivos agotó 5 s. Carga y validación se separaron
  sin retirar comprobaciones ni ampliar ese límite. Vitest usa un trabajador.
- Chromium, Pixel 5 y Galaxy S9+ pasaron el recorrido. `pixel-action` añade el salto
  desde el capítulo al mapa. Las respuestas externas están simuladas en esas corridas.
- `g10-current`: 59 comprobaciones pasaron tras sustituir la expectativa de recorte
  por imágenes completas, contiguas, sin deformación y a la misma escala.
- `negative-controls`: cuatro fallos locales fueron detectados y la corrida normal
  posterior pasó. No se inyectaron fallos en producción.
- `performance`: 20 repeticiones por perfil; p75 entrada 117/2152 ms y resultado
  por deep link 199/3191 ms en escritorio/móvil CPU ×4 Slow4G. No mide CTA ni todo G1.
- Las capturas editoriales usan servicios reales; se inspeccionaron mapa y ambas fotos.

## Fallos conservados y límites

- Windows Firefox: `RenderCompositorSWGL failed mapping default framebuffer`;
  modo headless y visible no cerraron el recorrido. No es PASS de Firefox Windows.
- Windows WebKit: el ejecutor no completó el arranque; no se declara compatibilidad.
- CI ae1d776 se canceló durante instalación de dependencias: el mirror Ubuntu
  descargaba muy despacio 121 paquetes. No llegó a ejecutar la matriz.
- `ci-e0b0564`: Chromium, WebKit escritorio, Pixel/Galaxy e iPhone 13 pasaron.
  Firefox no arrancó como root con HOME de otro usuario; iPhone SE perdió el titular;
  iPad reportó errores CORS. Esa corrida se conserva como FAIL, no se recalifica.
- Maestro 2.10.0: API 33 no pudo inicializar instrumentación; API 34 encontró
  «Pixel Launcher isn't responding». Sesiones aisladas y Java 17 no cerraron el QA.
  No acredita Android físico ni Chrome Android vigente del nuevo candidato.
- Una revisión automática bloqueó la llamada de arranque de Chrome por ADB
  (`blocked by policy`); no se empleó para certificar ningún resultado.
- Revisión nativa EU, NVDA, Safari iOS físico y pruebas de comprensión humana pendientes.

## Cambios implementados

Capítulo junto al mapa con cifras locales; contexto municipal plegado; portada con
encuadres completos y fecha de vuelo; foco explícito de lectura; aviso si el contexto
gráfico no se crea; importaciones individuales de iconos; MapIntro separado;
constraints Python; matriz CI en imagen oficial fijada por digest y UID 1001;
demo silenciosa con capturas, guion y procedencia; PDF/ZIP rechazan procedencias mezcladas.

Las métricas y geometrías no se recalcularon. La fixture de Mungia es una copia
byte a byte del artefacto real, con manifiesto y QA. Se mantiene la arquitectura
estática: no hay necesidad demostrada de introducir backend, VPS o IA.

Referencias del ejecutor: https://playwright.dev/docs/ci#via-containers y
https://playwright.dev/docs/docker. La evidencia inicial y las bases verificadas
se conservan en `output/contest-review-20260930/`.
