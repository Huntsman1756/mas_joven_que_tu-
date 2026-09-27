# Revisión ejecutiva — FASE A

27 de septiembre de 2026. Auditoría secuencial con perspectivas profesionales distintas; no son evaluaciones de personas independientes ni una prueba de usuarios. Producción y candidato local se distinguen. No se ha modificado producto ni realizado commits.

**Veredicto: tiene fundamentos competitivos y gaps materiales; no lo entregaría todavía.** Es una visualización personalizada del parque edificado actual de Bizkaia, con fotografía y cartografía histórica complementarias. Encaja razonablemente en **Visualización de datos**, no necesita convertirse en un reportaje para ser elegible. La base 1.3.a incluso excluye trabajos cuyo eje principal sea el reportaje. No se ha encontrado un STOP de categoría. La elegibilidad personal y la presentación administrativa siguen sin verificarse.

**Fortaleza nº1:** un universo y unos denominadores defendibles. Los 112 JSON municipales suman 139.447 edificios, 138.501 con año válido; distribución y acumulado coinciden en los 112. Las fotos no se utilizan para inventar series históricas. Esta disciplina importa especialmente porque el rigor pesa **25 %** en 2026, frente al 10 % de Representación Dinámica de 2025. [Contrato](CONTEST_2026_CONTRACT.md), [invariantes](EVIDENCE/data-invariants.json).

**Riesgo nº1:** entregar una versión distinta de la evaluada, con fricción en la primera experiencia fotográfica y pruebas humanas abiertas. HEAD es `0a2c7f6`; último producto `9a1a782`; Pages publica `df842fb`, cuyo mensaje atribuye el build a `1848c74`. El último CI consultado falla. No hay un único candidato publicado, probado y documentado que permita cerrar entrega.

**Dónde falla competitivamente:** la promesa personal es clara, pero los hallazgos que podrían recordarse quedan detrás del visor y del contexto secundario. Entrar en Fotos aéreas deja un lienzo vacío con «1945» seleccionado: no es una caída demostrada, es una activación adicional poco evidente. «La cifra exacta: 0 %» puede acompañar a 1 edificio de 3.528; al contraste de huella de Mungia le falta la unidad. La memoria describe una comparación antigua y el README todavía presenta fases implementadas como futuras.

**Cinco acciones de mayor retorno, sin implementar:**

1. Cerrar una release verificable: SHA, CI, producto público, memoria y gates Safari/NVDA sobre el mismo candidato.
2. Hacer coherente la entrada en Fotos aéreas: imagen activa o estado inicial inequívoco, sin una campaña que parece visible y no lo está.
3. Corregir precisión editorial demostrablemente falsa: redondeo extremo, unidad de huella y promesa absoluta sobre privacidad del enlace.
4. Adelantar un hallazgo visual existente y un recorrido breve para el jurado; mantener la exploración como eje de categoría.
5. Reparar el paquete de entrega y reproducibilidad: instrucciones ejecutables, fuentes congeladas, versiones y documentación del producto real.

**Quick wins:** unidad «%» de huella; evitar «exacta» en una cifra redondeada; actualizar memoria/README; describir los datos incluidos al compartir. Son cambios pequeños, no autorizados todavía.

**No tocaría:** stack estático, contratos de métricas, clasificación de años, fuentes oficiales, separación campaña/vuelo, paleta/tipografía completa ni arquitectura por un deseo de novedad. No añadiría IA, backend, 3 D, nuevos modos ni una segunda aplicación narrativa antes del concurso.

**Límites:** no se certifica WCAG AA ni Safari físico. Se ejecutaron check, lint, formato, build, 244 tests Vitest, 15 de servidor y 45 de datos; axe en dos estados no encontró violaciones, pero dejó contrastes sin resolver. Las mediciones son muestras de laboratorio, no Core Web Vitals de campo. [Detalle técnico](TECH_REVIEW.md), [UX](UX_REVIEW.md), [findings](GAPS.md).

**FASE B RECOMENDADA: YES**, exclusivamente los cinco bloques de [TOP_5](TOP_5.md), con el cierre humano de release como condición de publicación. FASE A termina sin implementar. Se requiere «GO FASE B».
