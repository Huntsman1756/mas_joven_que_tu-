# Revisión editorial y visual final

Alcance: portada ES, resultado Mungia 1979, Evolución, comparación de ortofotos,
capítulo f4036 y metodología. Chrome, escritorio y emulación 390 × 844.
Capturas de desarrollo local: no equivalen a una auditoría de producción ni a Safari físico.

## Recorrido y evidencia

1. Producción inicial: `00-production-before.png`; se observó la portada anterior.
2. Portada local: `01-home.png` y `05-mobile-before.png`.
3. Capítulo: `02-example-before.png`; resultado corregido en `../../docs/submission/media/05-story.png`.
4. Comparación: `03-swipe.png`; captura nueva `../../docs/submission/media/04-swipe.png`.
5. Método: `04-method-before.png`; captura nueva `../../docs/submission/media/06-method.png`.
6. Móvil corregido: `05-mobile-after.png` (imagen válida recapturada tras reiniciar el viewport).

## Hallazgos corregidos

- Cabecera móvil: subtítulo comprimido por controles laterales. Marca ocupa fila completa y controles fila propia.
- Capítulo: porcentaje seguido de «de cada 100» redundante. Eliminada duplicidad.
- Conclusión f4036: diferencia de 96 puntos no explicaba el mismo corte temporal mostrado. Ahora 60/70 después de 1979 y 1,9 % de huella, sin nuevas métricas.
- Jerarquía: cifras pequeñas en el hallazgo. Aumentadas a 1,5–2 rem, etiquetas a 0,95 rem.
- Método: enlaces con color, subrayado y foco explícitos coherentes con el sistema existente.
- Estado del concurso: «preparada» no afirma que se haya presentado administrativamente.

No se ha rediseñado la marca ni cambiado la paleta por gusto. Se mantiene tipografía
editorial para titulares y sans para lectura/controles; se priorizan contraste, jerarquía
y denominadores comprensibles. La animación no debe leerse como reconstrucción histórica.

## Referencias usadas

- Bases oficiales conservadas: `docs/COMPETITION.md` y `docs/legal/`, versión corregida 24-08-2026. Claridad y rigor prevalecen sobre ornamentación; el vídeo complementa la pieza.
- [WCAG: contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- [WCAG: uso del color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).
- [WCAG: tamaño de objetivo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- [WAI: medios accesibles](https://www.w3.org/WAI/media/av/): subtítulos y transcripción.

## Verificación y límites

`npm run check`: 0 errores, 2 avisos preexistentes. `npm run test`: 275/275 y
15/15 del servidor estático. Inspección visual real de las escenas y cabecera móvil.
Los ajustes de UI fueron incorporados por el otro agente en `c417f34`.
Esta revisión no certifica WCAG completa, EU nativo, NVDA, zoom real, iPhone/Safari,
Firefox real, aceptación por usuarios nuevos ni publicación. Esos gates siguen abiertos.
