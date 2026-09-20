# GA3-MOBILE — tabla de casos congelada (declarada ANTES de la prueba)

Dispositivo físico real (no DevTools) sobre el build congelado
`1765a64`+ (`0781832`). Un único recorrido; los hallazgos se anotan por
caso, no como impresión general.

## Entorno (rellenar en la sesión)

| campo             | valor                                          |
| ----------------- | ---------------------------------------------- |
| Modelo            |                                                |
| SO + versión      |                                                |
| Navegador + vers. |                                                |
| Viewport aprox.   |                                                |
| Red               |                                                |
| Fecha             |                                                |
| Build             | `0781832` (`app/build`)                        |
| URL               | `http://192.168.1.35:4173/` (LAN; mismo Wi-Fi) |

Servir con `node app/scripts/static-server.mjs 4173 app/build` (el
server escucha en todas las interfaces; si el firewall bloquea, abrir
el puerto 4173 solo para la sesión). Si hay despliegue público previo,
usar la URL pública y anotarla.

## Severidad (congelada)

- **FAIL**: bloqueo de navegación, información esencial inaccesible,
  foco perdido, control sin nombre accesible, interacción principal
  imposible en móvil.
- **Finding**: defecto cosmético o fricción secundaria documentada; no
  necesariamente bloqueante.
- Veredicto global: `PASS` | `FAIL` | `PASS_WITH_FINDINGS`.

## Casos

| ID     | Acción                     | Esperado                                                                                      | Observado | Veredicto | Evidencia |
| ------ | -------------------------- | --------------------------------------------------------------------------------------------- | --------- | --------- | --------- |
| MOB-01 | Carga limpia `/`           | Hero + selector de año utilizables; sin scroll horizontal; sin overlay bloqueante             |           |           |           |
| MOB-02 | Introducir año → resultado | Golden path completo: teclado virtual no tapa input ni CTA; resultado visible tras enviar     |           |           |           |
| MOB-03 | Scroll completo            | Todas las secciones cargan (lazy below-fold incluido) en orden; sin saltos/CLS molestos       |           |           |           |
| MOB-04 | Mapa: pan/zoom/tap         | Pan fluido, pinch-zoom, tap en celda abre detalle; zoom controls accesibles                   |           |           |           |
| MOB-05 | Comparador fotos           | Si hay modo dúo/comparador: gesto o control alternativo funciona con dedo                     |           |           |           |
| MOB-06 | Timeline                   | «En el tiempo» muestra el eje inmediatamente (scroll automático); slider arrastrable con dedo |           |           |           |
| MOB-07 | Cambio orientación         | Si la app admite rotación: layout no se rompe; estado conservado                              |           |           |           |
| MOB-08 | Atrás/adelante navegador   | Historial funciona; estado se restaura o reinicia según contrato (deep links)                 |           |           |           |
| MOB-09 | Enlaces/CTAs               | «Buscar una dirección», «Añade otro año», «Compartir», historias: todos pulsables             |           |           |           |
| MOB-10 | Lazy below-fold            | Al bajar, secciones montan sin quedarse en blanco; indicador de carga si tarda                |           |           |           |
| MOB-11 | Targets táctiles           | Botones/enlaces principales ≥ ~44px efectivos; sin taps fallidos repetidos                    |           |           |           |
| MOB-12 | Texto                      | Sin cortes ni truncado ilegible; safe areas respetadas (notch)                                |           |           |           |
| MOB-13 | Teclado virtual            | No tapa el input de dirección ni el CTA al escribir                                           |           |           |           |
| MOB-14 | Recarga                    | Estado conservado o reinicio limpio según contrato; sin página rota                           |           |           |           |
| MOB-15 | Red móvil                  | Si es posible con datos móviles (no Wi-Fi): golden path completo usable                       |           |           |           |
| MOB-16 | Fuente sistema grande      | Pasada con tamaño de fuente aumentado: sin cortes bloqueantes ni targets inalcanzables        |           |           |           |

## Registro de la sesión

- Vídeo continuo del golden path: `mobile-golden.*`
- Capturas de findings: `mobile-<id>-*.png`
