# Evidencia acotada de auditoría UX — 2026-09-20

Auditoría solicitada por el usuario. No se modificó código de producto.

## Alcance y límites

- Código actual de `app/src`, contratos de `docs/DATA_SEMANTICS.md`, estructura de producto y copy.
- Navegación mediante árbol de accesibilidad del frontend local servido en `http://127.0.0.1:58764/`.
- Capturas existentes G7 after2, G8 y G9 contrastadas con código; no son capturas generadas por esta auditoría. La captura nueva del navegador falló por timeout en dos intentos. No se certifica equivalencia del servidor con el HEAD ni auditoría visual exhaustiva en todos los tamaños.
- Se descartó la captura `evidence/launch-qa/reflow-320.png` como prueba de la UI actual: muestra una versión anterior.
- No se verificó visualmente el contenido actual de las teselas remotas ni se midió rendimiento real, lector de pantalla o cumplimiento WCAG completo.

## Observaciones en vivo

1. Portada: año 1988 y búsqueda Getxo; aparece «1 resultado en NORA · 1 con datos disponibles». Seleccionar Getxo habilita «Ver mi Bizkaia».
2. Resultado: 30,3 %, 1.883 posteriores a 1988, 6.211 con año conocido, 6.221 totales, 10 anómalos, cobertura 99,8 %. El titular y la aproximación omiten la restricción a año conocido; el texto de apoyo sí la explica.
3. Evolución: `play=1988&view=time`; la leyenda cambia a cuota del parque actual constatada hasta 1988, pero conserva «menos / más posteriores».
4. CTA de foto: `ortho=1989&view=photo`; panel «campaña 1989», «1 año después de que nacieras» y opción «Comparar con 2025». Esto verifica el flujo y las etiquetas, no el contenido de la imagen remota.
5. Cambiar año o lugar → introducir 1899 → Aplicar: el formulario se cierra, la URL mantiene 1988 y no aparece error en el árbol accesible. Coincide con `ResultView.applyChange`.

## Hallazgos corroborados por código y captura previa

- HeroVisual: ambas imágenes absolutas ocupan todo el marco; `.past` recortada a la izquierda, `.now` posterior sin recorte ni z-index corrector. `evidence/g7/after2/w1440-home.png` muestra imagen en color continua bajo etiquetas 1956/hoy. Misma composición en w768-home y w360-home.
- DecadeDistribution: barra base siempre `.before`; overlay `.after` solo cuando `0 < nAfter < n`, nunca cuando toda la década es posterior. `evidence/g9/mungia-dist.png` confirma todas las décadas posteriores a 1979 en azul.
- El eje temporal utiliza todo W-PAD, mientras «sin año» se coloca en W-PAD.r-52 dentro de ese mismo ancho. La captura G9 muestra etiquetas 2020/sin año superpuestas.
- Tooltips del histograma: handlers mouseenter/mouseleave, sin equivalente de foco/tap en las barras. Hay tabla para lector de pantalla, oculta visualmente.
- Timeline: `restart()` activa timer sin comprobar reduced-motion, aunque los botones normales cambian a pasos manuales.
- Buscador: calcula candidatos locales antes del fetch NORA pero los devuelve al componente solo después de respuesta/fallo; timeout configurado 10 s.
- Hotspots: resultados guardados al pulsar; no hay efecto de invalidación por año/municipio y guard de solicitud solo compara municipio. Riesgo de resultados obsoletos, no reproducido en vivo.
- BuildingCard: `fmt(p.area_m2 ?? 0)` presenta ausencia de área como cero. Alcance condicional; no se comprobó un registro real con área nula.

## Contraste calculado

Fórmula sRGB WCAG sobre colores opacos de tokens, sin certificar composiciones reales:

| Colores | Ratio |
|---|---:|
| #c9403b / #f5f1e8 | 4,35:1 |
| #ffffff / #c9403b | 4,91:1 |
| #655f54 / #f5f1e8 | 5,61:1 |
| #3f6f8e / #f5f1e8 | 4,81:1 |
| #c9403b / #3f6f8e | 1,10:1 |

El primer par no alcanza 4,5:1 para texto normal. El último par no implica por sí solo incumplimiento de texto, pero evidencia escasa diferencia de luminancia entre categorías.
