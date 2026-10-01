# Mejora de lectura y acciones — 01-10-2026

Implementa las cuatro prioridades del [diagnóstico previo](../language-ux-review-20261001/REVIEW.md):
ejemplo destacado, capítulo compacto con acciones antes del dato, hallazgo de
Mungia limitado a su municipio y base cartográfica desaturada. No cambia datos,
proveedores, traducciones ni contratos. PRODUCT.md y UX_COPY.md fijan el alcance
y los criterios antes de ejecutar la matriz.

## Verificación local

- Tipos/a11y: cero errores y avisos; formato PASS.
- Lint: cero errores, cinco avisos previos de variables sin uso.
- Dominio: 283 pruebas Vitest y 18 pruebas Node PASS; verify:eu PASS.
- [Matriz](matrix/report.json): nueve perfiles, 16 comprobaciones por perfil,
  todos PASS. Chromium, Firefox y WebKit; Pixel 5, Galaxy S9+, iPhone SE,
  iPhone 13 vertical/horizontal e iPad Mini. Rasters externos simulados.
- [Lectura](reading/report.json): 19 PASS a 320, 390, 768 y 1440 px.
- [Navegación](navigation/report.json): 14 PASS, teclado y gestos emulados.
- [Regresiones](redteam/verify.json): 61 PASS con servicios simulados;
  hallazgo ausente en Leioa, presente en Mungia y retorno conservado.

La matriz usa HTTPS interceptado que transporta los bytes del build local;
no demuestra la publicación ni la disponibilidad de servicios oficiales.
La huella local conserva el sello +dirty real y no es publicable. Las pruebas
de publicación se registran por separado sobre un build de checkout limpio.

Publicación completada y pruebas con servicios reales: [RELEASE.md](RELEASE.md).
Este registro conserva la corrida local previa; el informe de publicación
incluye también los fallos de CI y los reintentos, sin sustituirlos por PASS.

## Inspección visual

Brave, servidor estático local y datos runtime existentes. Capturas en visual/:
portada móvil, capítulo móvil ES/EU, salto al mapa EU y mapa de escritorio.
La síntesis EU se abrió con Enter; el salto al mapa dejó su canvas a 289 px
del borde superior en 390×844. No se modificó la fecha, geometría o fuente.

Estos perfiles son emulados: no se afirma QA con móviles físicos ni Safari iOS
real. Xuxen aporta revisión asistida; revisión nativa EU y NVDA siguen pendientes.
Los servicios públicos externos pueden fallar de forma transitoria.
