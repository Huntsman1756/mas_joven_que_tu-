# Cierre local - 28-09-2026

## Alcance e identidad

Revisión ES/EU, entrada, resultado, Evolución, comparación, capítulo y método;
memoria y entrega. HEAD de partida 11bc75e; build observado
`11bc75ea3458532ef0a1c25108ed1db2ec2f25ef+dirty(18)`.
No hay commit/push/deploy de esta ronda. Producción contrastada conserva
fuente 4b1b0c8 y Pages 21316b3. Datos y algoritmos de métricas sin cambios.

## Recorrido visual (capturas actuales)

1. Portada: `docs/submission/media/01-home.png`, lectura clara; entrada de ejemplo visible.
2. EU: `01-eu-before.png` y `03-eu-corrected.png`, título corregido sin desbordamiento.
3. Resultado: `docs/submission/media/02-result.png`, cifra, cobertura, universo y colores visibles.
4. Evolución: `docs/submission/media/03-play.png` y `play-frames-build/`, reproducción real con dos colores respecto a 1979 y cabezal independiente.
5. Comparación: `02-production-swipe.png` y `docs/submission/media/04-swipe.png`, ortofotos con contenido real y atribuciones; no solo HTTP 200.
6. Capítulo: `docs/submission/media/05-story.png`, 85,7 % / 1,9 %, conclusión y límites juntos.
7. Método: `docs/submission/media/06-method.png`, numerador, denominador y descargas.
8. Móvil: `docs/submission/media/mobile.png`, 390×844, subtítulo y controles legibles.

La portada conserva Bilbao/Abandoibarra: inspeccionado el JPG completo y su
manifest; no se corrigió un supuesto cambio de lugar basado solo en media imagen.
No se altera la identidad gráfica sin problema demostrado. Contrastes de tokens
opacos sobre #f7f8fa: ink 14,53; ink2 6,08; ink3 5,00; accent 6,09; accentDeep 7,87.
No son una certificación de todos los fondos o estados del mapa.

## Cambios y comprobaciones

- Correcciones asistidas de gramática/terminología EU, división singular y acciones.
- Copy ES/EU evita confundir año nominal con vuelo y parque actual con cambio histórico total.
- Cuatro tests nuevos de regresión editorial, dos controles raster negativos/positivos.
- Smoke público con identidad, JSON por UUID, imágenes originales y captura conservados;
  decodifica muestras y rechaza dimensiones mínimas, transparencia y uniformidad.
  Una muestra diversa no prueba por sí sola la ubicación geográfica.
- `verify.ps1`: TODO OK; check 0 errores/2 avisos preexistentes, ESLint 0 errores/5 avisos,
  formato, 279 Vitest, 17 tests Node, build, 49 pytest, artefactos y Range.
- `rt_pages_prefix.mjs`: 14/14. Baseline publicado preservado en `pages-prefix-published-baseline.json`.
- `editorial_verify.mjs`: 21/21, incluidos dos ciclos del ejemplo y restauración personal.
- `evolution_colors_verify.mjs`: 4/4 sobre build (evidence/evolution-colors-1790572748696).
- `g14_eu_qa.mjs`: 101/101 con CI_STUBS=1; fixtures declarados, no prueba de servicios externos.
- Smoke reforzado contra producción: 9/9; 11/12 muestras no uniformes.
  `evidence/public-smoke/5fa54371-78a4-44a0-9fa7-e647c12f03a6/report.json`.

## Entrega comprobada

- Smoke sobre la nueva build local: 9/9, identidad exacta y 10/12 muestras
  no uniformes; `evidence/public-smoke/e23e59eb-a2d0-40e8-b5df-f30dd0695439/report.json`.
- PDF: memoria de 4 páginas y resumen de 1; todas las páginas renderizadas
  e inspeccionadas, sin cortes de texto ni solapamientos observados.
- ZIP: 31 archivos más MANIFEST.json, CRC comprobado tras cerrar el archivo.
- Demo ES: 76,13 s, H.264/AAC, 1920×1080; decodificación completa FFmpeg sin
  errores y fotograma actual inspeccionado. La escucha humana sigue pendiente.
- Huella local separada: fuente `fded4808f85c3ef2…`, build `063b00dab1376025…`;
  sello dirty y `publishable_stamp: false`. No se sobrescribe la huella publicada.

## Criterios y límites de la revisión

Fuentes de diseño: W3C WCAG 1.4.1 y 1.4.3 (https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
y https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
Fuentes lingüísticas y alcance: `docs/submission/EU-REVIEW-20260928.md`.
Benchmark guardado: `NEXT_EDITORIAL_DELIVERY.md`; todas las propuestas útiles
inventariadas en `docs/submission/FINAL-CHECKLIST.md`, sin promesa de premio.
Pruebas humanas, nativo EU, NVDA, Safari/iPhone, Firefox instalado, zoom real y
presentación administrativa NO declarados realizados. Material audiovisual ES;
ZIP silencioso. La revisión nativa no se sustituye por IA ni tests de paridad.
