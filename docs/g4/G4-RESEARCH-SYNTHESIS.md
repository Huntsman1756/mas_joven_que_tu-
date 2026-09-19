# G4-R · SYNTHESIS — el dossier completo destilado

Fuentes: `evidence/g4/research/*` (atlas 45 capturas, layout metrics,
bugs.json, copy-strings, chunks, tokens, interaction graph) +
`docs/g4/*`. Todo medido sobre build `f869de0`. **Sin tocar producto.**

## Las 12 respuestas

### 1. ¿Qué es el producto ahora?

Una máquina de preguntas personales sobre el parque edificado de
Bizkaia: año+lugar → respuesta catastral → mapa → tiempo → foto →
edificio exacto → segundo año → planeamiento → entorno. Funcionalmente
completo (G1–G3 PASS); editorialmente **una secuencia plana de 11
bloques dentro de una tarjeta**.

### 2. ¿Qué debería ser?

Una secuencia editorial con un solo mapa-ancla: recompensa inmediata →
escena con modos (mapa/tiempo/foto/1923-25) → lectura → acción personal
→ descubrimiento editorial. **Más capaz, con menos controles visibles.**

### 3. ¿Su mayor ventaja competitiva?

**Dos fuentes de verdad declaradas + rigor visible en cada cifra.**
Ninguno de los 32 benchmarks muestra desacuerdo NORA↔Catastro ni lleva
denominador en cada cifra. Añade: tres tiempos en una escena y URL de
estado completo (nadie del benchmark serializa tanto).

### 4. ¿Qué le daña más ahora?

La **planitud**: todo tiene el mismo peso visual tras el mapa — 8
bloques seguidos, 3 CTAs oscuros casi consecutivos, 10 acciones en el
primer viewport. El usuario no sabe qué hacer después de la recompensa,
y el jurado puede no llegar a lo que le diferencia (Play, edificio,
historias).

### 5. ¿Qué debería desaparecer del flujo por defecto?

- OrthoControls (fundido en el modo FOTO/marcas de campaña).
- HistMapControls (fundido en modo 1923-25 de la escena).
- Contrast (a lectura editorial / herramienta de historias).
- La línea de área (al cálculo o leyenda).
- Los 3 estilos de CTA (a un solo patrón opt-in).

### 6. ¿Qué deberían ver primero los jueces?

Titular + cifra con denominador + mapa ya coloreado + Play — en ese
orden, en 30 segundos (JUDGE-JOURNEY A). Es lo único que demuestra los
4 primeros criterios sin una palabra.

### 7. ¿Qué debería descubrir después un usuario normal?

«Baja hasta tu calle» — MI EDIFICIO es la segunda experiencia (la más
personal). Luego DOS AÑOS. El contexto (planning/entorno) llega CON el
edificio, no como sección separada.

### 8. ¿Qué crea valor de retorno?

Otro lugar (1 clic) > mi edificio > otro año/DOS AÑOS > Descúbreme >
historias > compartir URL concreta. Sin engagement inventado: es un
producto de re-consulta por ocasión, y su viralidad es el deep link
completo — protegerlo (BUG-01/02 lo dañan hoy).

### 9. ¿Qué features impresionan técnicamente pero pesan editorialmente?

- **Contrast** (diagnóstico c05/c08: brillante, pero es una pregunta que
  nadie formula — salvo en las dos historias donde es protagonista).
- **Marcas de campaña** (función real, significado invisible).
- **FOTO como modo** (promesa de escena que entrega panel).
- **Los 3 módulos de contexto** (correctos, pero nacen solo con
  edificio — son profundidad, no sección).

### 10. Los 5 cambios de mayor impacto esperado

1. **Contrato de escena**: foto/histórico/comparador como modos del
   mapa — elimina 3 caminos duplicados y la promesa falsa de FOTO.
2. **Un tramo de acción personal**: address+compare juntos; la
   profundidad aparece donde se pide, no 2 viewports abajo.
3. **`.sheet` reducida a «la respuesta»** — el resto respira como
   tramos editoriales con un solo CTA cada uno.
4. **Historias + Descúbreme** (`story=` determinista) — convierte el
   corpus en producto y la innovación en algo visible en 1 clic.
5. **Un solo sistema de CTA + ≤6 acciones en primer viewport** —
   medido: hoy 10 acciones y 3 estilos.

### 11. ¿Qué NO debería construirse antes de la entrega?

- Nuevas fuentes (geoEuskadi protegidos, Eustat, garbigunes, servicios
  sociales) — reserva documentada.
- 3D, rainbow palettes, dashboards de capas — anti-patrones del
  benchmark.
- Autoplay obligatorio, feed infinito de historias, rutas nuevas.
- Lazy loading **salvo** que PERF4 calibrado lo exija (independiente
  de G4 — ver PERFORMANCE-ARCHITECTURE).
- Prosa larga de historias — capítulos de 1–1,5 vp, no artículos.

### 12. ¿Qué product cut recomiendo?

**CUT B — híbrido (IA-C)** — ver `PRODUCT-CUT.md` y `IA-ALTERNATIVES.md`.
Conserva el mejor primer minuto (headline→mapa→timeline), convierte la
sheet en tramos con un CTA cada uno, unifica superficies en la escena
y añade el tramo editorial (planning + historias + Descúbreme).
Móvil ~4 vp, controles −40 %, cero features perdidas.

## A–Z del pack (índice de entregables)

A. Baseline: `evidence/g4/research/BASELINE.json` (rama g4-research-pack
   desde b907a8a, 0 mutación de producto).
B. State atlas: 45 capturas + `STATE_ATLAS.md` + `atlas.json`.
C. Layout metrics: `current-layout-metrics.json` (2207px/2,5vp escritorio;
   2491px/3vp móvil; 19–25 botones; 10 acciones 1er viewport).
D. Interaction graph: `docs/g4/INTERACTION_GRAPH.md` + JSON.
E. Benchmark: `BENCHMARK-DEEP.md` (32 refs → 10 patrones + 10
   anti-patrones + 5 diferenciaciones).
F. Rubric audit: `RUBRIC-AUDIT.md` + matriz jurado.
G. First-10: `FIRST-10.md` (recompensa PASS, next-action FAIL parcial).
H. Controles: `CONTROL-AUDIT.md` (contrato de escena recomendado).
I. IA: `IA-ALTERNATIVES.md` (C híbrida recomendada, score 84/78/78).
J. `.sheet`: confirmado — reducir a respuesta; el resto respira fuera.
K. Copy: `COPY-AUDIT.md` (285 strings; caveat ×5 formas; 3 verbos de
   opt-in; «celda»→«zona»; «campaña» solo en proveniencia).
L. A11y: `HUMAN-A11Y-PLAN.md` (encabezados de módulo como `<p>`;
   aria-live en profundidad; guiones NVDA/VO listos).
M. Móvil: `MOBILE-AUDIT.md` (2 violaciones 1-acción/viewport).
N. Perf: `PERFORMANCE-ARCHITECTURE.md` (nodo página 120KB raw con los
   16 componentes eager; motor MapLibre 287KB gz ya lazy; fronteras
   lazy candidatas mapeadas — solo si PERF4 lo exige).
O. Estados no probados: `STATE-COVERAGE.md` (6 combos de riesgo, p.ej.
   histórico+ortofoto simultáneos, MULTIPLE identity nunca vista).
P. Bugs: `BUGS.md` — **1 MAJOR** (building= sin cámara falla en
   silencio), 2 MINOR (histórico no compartible, Escape no cierra,
   Enter no compromete), 1 POLISH (compare==year). 0 errores JS en toda
   la batería.
Q. Historias: `STORY-EVIDENCE-PACK.md` (5 casos × hook factual/visual/
   trampas/estado ideal/frase segura/frase prohibida).
R. UX historias: `PRODUCT-MODEL.md` §1 (cada capítulo con UNA mecánica
   protagonista).
S. Descúbreme: `PRODUCT-MODEL.md` §2 (rotación determinista + índice;
   `story=`; restaura estado personal).
T. Retorno: `PRODUCT-MODEL.md` §3.
U. Deep links: `PRODUCT-MODEL.md` §4 (añadir `hist=`, `ortho2=`,
   `story=`; `building=` acoplado a cámara — resolver).
V. Jurado: `JUDGE-JOURNEY.md` (30s/90s/3min + ceremonia 5min).
W. Entrega: `SUBMISSION-GAP-AUDIT.md` (gaps: URL hosting, memoria
   técnica, empaquetado Base 6).
X. Diseño: `DESIGN-SYSTEM-AUDIT.md` (54 colores → ~12 tokens; 3 CTAs
   → 2 estilos; escala tipográfica).
Y. Cut: `PRODUCT-CUT.md` — **CUT B recomendado**.
Z. Top-10 cambios G4: §10 + contrato de escena + URL `hist/ortho2/story`
   + fixes BUG-01/03/04 + encabezados de módulo reales.

## Estado final

Research completo. Producto intacto. PERF4 sigue BLOCKED — este pack no
lo adjudica ni lo contamina. Próximo paso: reboot → sesión calibrada →
adjudicar → G4 implementa CUT B sobre el SHA resultante.
