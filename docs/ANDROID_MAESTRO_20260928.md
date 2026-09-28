# Verificación Android — 28 septiembre 2026

Se ejecutó Maestro 2.10.0 sobre `Pixel8_API33` (Android 13, 1080×2400),
con Chrome 109.0.5414.123. Es un emulador Android real, no un viewport de
escritorio. No acredita móvil físico, Chrome actual ni Safari iPhone.

## Fallo corregido

En la portada, el teclado tapaba la opción del municipio. `PlaceSearch.svelte`
ahora mide el viewport visual y desplaza la página lo necesario para mostrar la
primera opción en pantallas táctiles pequeñas, conservando el foco. No aplica
este desplazamiento durante zoom con los dedos ni en escritorio.

La captura `suite-r1/.../screenshots/step-011-tapOnElement-place-opt-0.png`
conserva el fallo. `suite-r4/.../takeScreenshot/keyboard-option-visible.png`
muestra Leioa visible con el teclado abierto; el mismo flow seleccionó Leioa y
verificó el resultado de 1987 (47,6 %).

La inspección del editor también detectó que Cancelar desbordaba su botón. Se
reservó una fila completa para las acciones en móvil y se evitó comprimir Cancelar.

## Contenido comprobado

Maestro: **3/3 flows PASS**, salida nativa 0, en
[final.xml](../evidence/android-maestro-20260928/final.xml): formulario táctil y
apertura del editor; visor con reproducción/pausa, orientación, fotos,
comparación y mapa histórico; metodología y retorno. Las capturas de paisaje
incluyen el control temporal completo después del desplazamiento.
Esta suite precede al ajuste de anchura de Cancelar/Aplicar; ese ajuste no toca
los mapas. El formulario se volvió a verificar por separado sobre el build final:
[editor-final.xml](../evidence/android-maestro-20260928/editor-final.xml), 1/1 PASS,
salida nativa 0. La captura final del editor se inspeccionó: Cancelar y Aplicar
contienen sus textos completos sin solapamiento.

[Informe automático CDP](../evidence/android-maestro-20260928/content/report.json):
5/5 verificaciones, sin errores JavaScript, sin respuestas simuladas.

| Comprobación | Evidencia |
| --- | --- |
| Resultado y PMTiles | Leioa/1987; 148 entidades renderizadas |
| Evolución | Avance a 1988 y pausa conservada |
| Fotografía | Estado CONTENT; campaña 1989, imagen aérea visible |
| Antes/ahora | Cortina pasa de 50 a 52; ambos lados contienen imagen |
| Cartografía 1923–25 | AVAILABLE; mapa dibujado con contenido y atribución |

Se inspeccionaron visualmente `content/photo.png`, `content/swipe.png` y
`content/historical.png`. Los estados de carga por sí solos no se usaron como
prueba del contenido. Estas muestras no certifican todas las campañas y zonas.

## Entorno y fallos de los tests

El primer arranque sufría un bloqueo de Pixel Launcher y DNS sin resolución.
Se inició el AVD sin cargar/guardar snapshot, sin borrar datos, usando como DNS
el servidor secundario ya presente en el host. La resolución de geo.bizkaia.eus
y los recursos externos quedaron comprobados. No cambió la red de Windows.

Los intentos fallidos se conservan: una ejecución simultánea de `hierarchy`
interrumpió el driver; la espera automática de Maestro dejaba acabar la animación;
un `hideKeyboard` redundante salía de Chrome; el selector de Cambiar debía usar
su nombre accesible completo «Cambiar año o lugar»; algunos controles estaban
fuera del viewport y requerían desplazamiento. Los flows se ajustaron para representar esos
gestos, sin relajar las comprobaciones del resultado. No ejecutar Maestro y CDP
simultáneamente sobre el mismo dispositivo.

En horizontal el mapa captura los arrastres hechos sobre él. Para desplazar la
página se usa la zona de navegación. Es una fricción de uso que conviene observar
con personas nuevas, aunque el contenido y los controles existan.

## Regresiones después del cambio

- Build: PASS; Svelte: 0 errores y 2 avisos existentes.
- Lint: 0 errores y 5 avisos existentes.
- Tests: 279 Vitest y 18 servidor/raster/SEO, todos PASS.
- Navegación Playwright: PASS, incluyendo 1440/390 px, edición/cancelación,
  historial, cambio de breakpoint, ES/EU y movimiento reducido.

Logs, XML y capturas: [evidence/android-maestro-20260928](../evidence/android-maestro-20260928/).
Reproducción: [tests/mobile/maestro/README.md](../tests/mobile/maestro/README.md).

Esto cierra la comprobación de contenido Android del candidato local. No cierra
Firefox pendiente del informe general, las pruebas físicas/asistivas ni el ensayo
de publicación con dominio, HTTPS, Range y rollback en el VPS real.
