# G4 · GATE DRAFT — **NO CONGELADO**

Estado: DRAFT. El baseline SHA se fija tras la adjudicación calibrada de
PERF4 (`evidence/g3/g3d/PERF4-CALIBRATION.md`). Ningún umbral aquí está
congelado — es la propuesta a discutir antes de implementar G4.

## Contexto de adjudicación

- Producto candidato base: `f869de0` (o SHA remediado si PERF4 lo exige).
- Documento de dirección: `G4-DIRECTION.md` (`b907a8a`) + dossier
  `docs/g4/*` + `evidence/g4/research/*`.
- G4 = reorganización editorial + historias + Descúbreme. Sin nuevas
  fuentes de datos.

## Criterios candidatos (binarios)

### Comprensión
- GC1: una persona sin contexto entiende en el primer viewport qué es el
  producto y qué responde (test con sonda: headline+cifra+mapa visibles
  sin scroll en 390×844 y 1440×900).
- GC2: cada tramo de la página contiene ≤1 acción primaria visible.

### Jerarquía / progressive disclosure
- GD1: ningún elemento L3/L4 (address abierto, ficha, contexto,
  historias, planning local) es visible sin acción o selección previa.
- GD2: los opt-ins de evidencia (foto, 1923-25) son modos de la escena —
  cero secciones-CTA duplicadas en el flujo.
- GD3: la matriz DEFAULT_VISIBLE/DISCOVERABLE/USER_REQUESTED/
  CONTEXT_CONDITIONAL de G4-DIRECTION se verifica por inspección DOM.

### Reducción de controles
- GR1: acciones visibles en primer viewport ≤6 (medido: 10 hoy).
- GR2: un solo estilo de CTA para opt-ins (medido: 3 hoy).
- GR3: un solo camino a la ortofoto (medido: 3 hoy).

### Historias + Descúbreme
- GH1: `?story=<id>` abre capítulo + escena configurada para los 5 ids.
- GH2: rotación determinista; compartible; back/forward correcto.
- GH3: «volver a mi Bizkaia» restaura el estado personal.
- GH4: capítulos ≤1,5 viewports en 390px.

### URL/estado
- GU1: `hist=` y `ortho2=` serializados (o decisión documentada de no
  hacerlo).
- GU2: `building=` sin cámara: restaura o avisa (BUG-01 resuelto).
- GU3: cero estado transitorio en URL (hover, scroll, forms).

### Móvil
- GM1: máx. una acción primaria por viewport en 320–430px.
- GM2: sin wall-of-controls; targets 44px (ya gateado, se re-verifica).

### Accesibilidad
- GA1: encabezados reales para cada tramo/módulo (hoy `<p class="q">`).
- GA2: la profundidad que aparece bajo selección se anuncia (aria-live
  o foco movido).
- GA3: Escape cierra disclosures (BUG-03); Enter compromete única
  candidata (BUG-04).
- GA4: axe 0, teclado completo, reduced-motion, 400%, 320px — como
  gates previos.

### No regresión
- GN1: G1/G2/G3 gates pasan sin modificación (incl. copy-lint, a11y,
  corpus G3-A/B/C/D).
- GN2: contratos semánticos intactos (parque actual, denominadores,
  UNKNOWN≠0, proveniencia por módulo).
- GN3: PERF4 resuelto por protocolo calibrado antes de abrir G4.

### Revisión humana
- GH5: revisión visual humana del resultado (el gate exige ojo — atlas
  de estados actualizado tras implementación).

## Lo que queda FUERA del gate

- Nuevas fuentes (geoEuskadi protegidos, Eustat, garbigunes) — reserva.
- Prosa final de las 5 historias — se congela en implementación con
  el pack de evidencia.
- Re-diseño visual completo — G4 reordena y unifica, no repinta todo.
- Lazy loading — solo si PERF4 calibrado lo exige (independiente de G4).
