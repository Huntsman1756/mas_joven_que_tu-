# Lectura m?vil y estabilidad ? 1 octubre 2026

La portada usa ejemplos persistentes asociados a campos vac?os. En el cap?tulo
m?vil, cifras y universo preceden al mapa; s?ntesis y l?mites se despliegan despu?s.
La nueva frase EU reutiliza ?Adibidez? del diccionario existente. No es revisi?n nativa.

## Evidencia y l?mites

- `matrix-local/`: nueve perfiles y 144 checks, con contenci?n solo de layout.
- `matrix-size/`: misma matriz sobre contenci?n de layout y tama?o, 144 checks.
- `layout/`: tres motores ES/EU; comienzo del mapa 660?678 px en 390 ? 844,
  objetivos 44 px y reflow 320 px, cambio m?vil/escritorio y 40 aperturas WebKit.
- `reading-local/` y `navigation-local/`: lectura y navegaci?n con fixtures.
- Los logs `.txt` guardan tipos, lint (cinco avisos previos), 283 tests Vitest,
  18 tests Node, dos verificaciones EU y regresi?n de cancelaci?n G13.
- `linux-before.json`: reproducci?n del ResizeObserver sobre la publicaci?n previa.
- `linux-css-control.json`: 40 aperturas con CSS de contenci?n inyectado; ensayo,
  no equivalente a verificaci?n del CSS compilado.
- Los directorios Linux con `pass: false` conservan ensayos fallidos. El primer
  ensayo de Firefox sin configuraci?n de WebGL de CI no sirve para validar ese motor.
  Otro ensayo detect? solicitudes de glyphs abortadas por recargas precipitadas;
  el harness ahora espera a que terminen antes de la siguiente navegaci?n.

El lienzo usa `contain: layout size`: sus descendientes no determinan el tama?o
intr?nseco del ?tem flex observado. Se mantienen los m?nimos y el resize existente.
No se filtran errores de p?gina ni avisos de ResizeObserver.
La prueba de cancelaci?n usa respuestas NORA sint?ticas expl?citas exclusivamente
para probar invalidaci?n; no observa ni certifica una direcci?n real.

La observaci?n con personas est? preparada en `docs/UX_OBSERVATION.md`, pendiente
sin participantes ni resultados inventados. QA emulado no equivale a m?viles f?sicos.
La publicaci?n y sus comprobaciones se registrar?n separadas del build local sucio.

`layout-linux-settled/report.json`: WebKit Linux ES/EU y 40 aperturas consecutivas,
cero errores de p?gina. El contenedor usa el digest fijado en el CI; ejecuci?n
headless local. La ejecuci?n headed de los tres motores queda como gate del CI.
El primer intento local con xvfb-run no inici? Node; no se presenta como QA pasado.
