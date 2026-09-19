# G4-R · PRODUCT-CUT — disposición por feature + tres cortes finales

## Tabla REMOVE / DEMOTE / KEEP (cada feature, una disposición)

| Feature | Disposición | Razón |
|---------|-------------|-------|
| Hero año+lugar | KEEP_PROMINENT | es la puerta |
| Topbar cambiar/compartir | KEEP_PROMINENT | navegación + retorno |
| Headline + lead | KEEP_PROMINENT | la respuesta — L1 |
| Cobertura + «cómo se calcula» | KEEP_PROMINENT | rigor visible en L1 |
| Área (ha huella) | DEMOTE → dentro del cálculo o leyenda | dato secundario con línea propia |
| ViewSwitch | KEEP_PROMINENT | las tres miradas — pero re-nombrar FOTO (ver contrato escena) |
| Mapa + tooltips | KEEP_PROMINENT | la evidencia |
| Timeline/play/marcas | KEEP_PROMINENT | la mecánica estrella — marcas de campaña pasan a ser LA entrada a foto |
| «Ver datos de esta zona» | KEEP_DISCOVERABLE | equivalente teclado + exploración |
| DecadeDistribution | KEEP_DISCOVERABLE | contexto de la cifra; plegable móvil |
| PhotoPanel (modo FOTO) | KEEP_DISCOVERABLE → MERGE en contrato escena | FOTO como modo de la escena con campaña como eje |
| OrthoControls | MERGE → dentro del contrato escena | duplica marcas+FOTO |
| HistMapControls | KEEP_DISCOVERABLE → MERGE en escena | «1923-25» como modo/overlay de la misma escena, no sección |
| AddressSearch (MI EDIFICIO) | KEEP_DISCOVERABLE | la profundidad personal — un solo tramo |
| CompareYear (DOS AÑOS) | KEEP_DISCOVERABLE | segunda invitación del mismo tramo |
| Contrast | DEMOTE → tramo editorial/metodología | diagnóstico técnico; revive como herramienta en historias f4036/f4738 |
| CellDetail | KEEP_DISCOVERABLE | por selección, correcto ya |
| BuildingCard | KEEP_DISCOVERABLE | por selección/búsqueda |
| PlanningContext municipal | KEEP_DISCOVERABLE → tramo editorial | «¿qué está previsto?» — modelo editorial bueno ya |
| Planning local + AE | KEEP_DISCOVERABLE (CONTEXT_CONDITIONAL) | por edificio |
| ContextModules | KEEP_DISCOVERABLE (CONTEXT_CONDITIONAL) | por edificio, ya opt-in |
| Caveat | KEEP_PROMINENT | contrato permanente |
| Footer + metodología | KEEP_DISCOVERABLE | confianza |
| «5 lugares…» + Descúbreme | NUEVO (G4) — tramo editorial | retorno editorial |
| selectedCell serialización | INTERNAL_ONLY / evaluar `cell=` | solo si historia lo necesita |

**Nada se borra.** Lo que sale del flujo primario: OrthoControls (fundido
en escena), Contrast (a editorial), área (a cálculo), los tres CTAs de
opt-in (fundidos en el contrato de escena).

## Los tres cortes

### CUT A — conservador (mínimo viable G4)

- Mismo orden actual; `.sheet` se divide en dos tramos con aire:
  «la respuesta» (dist+caveat) y «tu lugar» (address+compare+profundidad).
- Unificar los 3 CTAs opt-in en un solo estilo de botón.
- Historias + Descúbreme al final.
- Móvil ~3,5 vp; controles visibles −4.
- Impacto: medio. Coste: bajo.

### CUT B — competición (recomendado — híbrido IA-C)

```
topbar
headline + cobertura                       (L1)
MAPA full-width + ViewSwitch + Timeline    (escena única: MAPA·TIEMPO·
   FOTO·1923-25 como modos; marcas de campaña = entrada a FOTO)
tramo lectura: «la forma del parque»       (dist + contraste como
   lectura continua, no dos módulos)
tramo acción: «tu lugar concreto»          (address + compare — dos
   invitaciones, un tramo; profundidad aparece aquí, no al final)
tramo editorial: «qué está previsto» +     (planning municipal +
«5 lugares…» + Descúbreme                    historias)
footer
```

- Primera recompensa: intacta (headline+mapa).
- Controles en primer viewport: de 10 a ~6.
- CTAs opt-in en la página: de 3 oscuros a 0 (son modos de escena).
- Móvil ~4 vp; una acción por viewport por construcción.
- Coste: medio — reordenar + unificar entradas; sin componentes nuevos
  salvo el bloque de historias.

### CUT C — editorial maximal

- Capítulos guiados (IA-B): cada tramo es una pregunta con la escena
  persistente; las 5 historias se convierten en «otros capítulos»
  seleccionables desde el inicio (índice arriba).
- Mapa sticky en desktop.
- Móvil ~6 vp; el más claro conceptualmente y el más caro.
- Riesgo: reinventa lo que ya funciona; el primer tramo se vuelve
  demasiado «producción».

## Recomendación: **CUT B**

Razón: ataca exactamente lo que el atlas mide (plano, CTAs duplicados,
FOTO como panel), conserva el mejor primer minuto del benchmark
(headline+mapa+play), y convierte los dos diagnósticos débiles
(Contrast, OrthoControls) en piezas con función (lectura y escena). C es
más premiable sobre el papel pero gasta el presupuesto en rehacer lo
que ya impresiona; A deja el problema a medias.

## Contrato de escena unificado (pieza clave del CUT B)

- La escena tiene modos: `MAPA · TIEMPO · FOTO · 1923-25`.
- FOTO muestra la ortofoto **en la escena** (o inmediatamente sobre/
  bajo ella como comparador), no una sección lejana.
- Las marcas de campaña del eje abren FOTO con esa campaña — un solo
  camino a «la foto».
- 1923-25 es un modo de la misma escena (capa histórica), no un control
  de sección: `view=hist` compartible (resuelve BUG-02).
- Comparador de campañas vive dentro de FOTO (`ortho2=` compartible —
  resuelve la inconsistencia).
- OrthoControls desaparece como sección propia.
