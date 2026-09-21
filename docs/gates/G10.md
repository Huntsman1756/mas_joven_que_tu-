# G10 — FINAL HARDENING / cero defectos conocidos

> Input normativo: `evidence/ux-audit-20260920/OBSERVATIONS.md` (auditoría
> manual sobre `5df397d`). Candidato base: `5df397d` (G8+G9). Regla: cero
> defectos conocidos abiertos antes de NVDA real (`NV-18/19`) y móvil físico
> (`MOB-05b`). Sin features, sin fuentes, sin rediseño.

Estados: `OPEN | FIX | PASS | PASS_WITH_FINDINGS | INCONCLUSIVE | NOT_A_BUG`.

| ID     | Hallazgo                                                                   | Evidencia inicial         | Causa                                                                       | Fix                                                                                                                                                                     | Test                                                                                                      | Resultado          | Evidencia final                                           |
| ------ | -------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------- |
| G10-01 | Año inválido (1899) cierra el editor sin error                             | OBS §vivo 5               | `applyChange` ignoraba el valor fuera de dominio pero cerraba el formulario | `parseYearInput` (dígitos estrictos 1900..snapshot) compartido Hero/ResultView/URL; error visible + `aria-invalid`/`describedby` + foco al campo; estado y URL intactos | unit `g10.test.ts` (18 casos) + E2E `g10_01_*`                                                            | PASS               | `evidence/g10/checks.json`                                |
| G10-02 | Denominador implícito en titular                                           | OBS §vivo 2               | el % se leía sobre el total                                                 | línea `result.headline.scope` bajo el titular («Entre los edificios actuales con año de construcción conocido»)                                                         | E2E `g10_02_scope_line` + barrido de todos los fmtPct (calc, tooltips, partición ya declaran denominador) | PASS               | `evidence/g10/visual/bilbao-result-*.png`                 |
| G10-03 | Leyenda Evolución «menos/más posteriores» para cuota acumulada             | OBS §vivo 3               | rampa reutilizaba copy del modo Edificios                                   | en `playYear` + nivel CELDA los extremos pasan a `0 %`/`100 %`; el título nombra la variable                                                                            | E2E `g10_03_*`                                                                                            | PASS               | `evidence/g10/after/legend-play.png`                      |
| G10-04 | HeroVisual: `.now` sin recorte — la mitad «1956» mostraba la ortofoto 2025 | OBS §corroborado          | solo `.past` estaba recortada; `.now` cubría todo el marco por orden DOM    | `clip-path` explícito en ambas: `.past` izquierda, `.now` derecha                                                                                                       | E2E `g10_04_*` (computed style) + captura                                                                 | PASS               | `evidence/g10/after/hero-diptych.png`                     |
| G10-05 | Década 100 % posterior pintada como «anterior»                             | OBS §corroborado          | overlay solo si `0<nAfter<n`                                                | clasificador `bucketRenderState` (empty/all-before/split/all-after) en dominio                                                                                          | unit 4 estados + E2E `g10_05_*` (≥7 all-after en Bilbao 1952)                                             | PASS               | `evidence/g10/visual/bilbao-dist-*.png`                   |
| G10-06 | «sin año» solapa con tick 2020                                             | OBS §corroborado          | compartía el ancho del eje temporal                                         | zona propia de 66 px fuera del eje con separador; el eje temporal reserva ese ancho                                                                                     | E2E `g10_06_noyear_off_axis`                                                                              | PASS               | `evidence/g10/visual/*-dist-*.png`                        |
| G10-07 | Tooltip solo ratón                                                         | OBS §corroborado          | `mouseenter/leave` sin foco/tap                                             | roving tabindex (`role=button`, un stop Tab), flechas/Home/End, Enter/Space, Escape, tap; tabla sr-only conservada                                                      | E2E `g10_07_*`                                                                                            | PASS               | `evidence/g10/a11y/histogram-focus.png`                   |
| G10-08 | `restart()` arma timer sin reduced-motion                                  | OBS §corroborado          | solo los botones de paso respetaban la media query                          | `play()`/`restart()` degradan a paso/reset sin timer bajo `prefers-reduced-motion`                                                                                      | E2E `g10_08_*` (media emulada)                                                                            | PASS               | `checks.json`                                             |
| G10-09 | Locales retenidos hasta respuesta NORA (10 s)                              | OBS §vivo 1 + corroborado | `searchPlace` era bloqueante                                                | `fetchNora` separado: locales síncronos al instante + estado «Buscando más resultados…»; merge/dedupe al llegar; abort en choose                                        | unit `fetchNora` + E2E `g10_09_*` (NORA bloqueado por gate)                                               | PASS               | `evidence/g10/async/search-local-first.png`               |
| G10-10 | Hotspots stale: guard solo por municipio                                   | OBS §corroborado          | `reqCod` no incluía año; sin invalidación                                   | identidad `cod:year` (`reqKey`/`doneKey`), efecto invalida resultados y request en vuelo, guard descarta respuesta tardía                                               | E2E `g10_10_*` (request lenta + cambio de año)                                                            | PASS               | `checks.json`                                             |
| G10-11 | `area_m2 ?? 0` → ausencia como «0 m²»                                      | OBS §corroborado          | fallback numérico en presentación                                           | tipo `area_m2: number \| null`; los 3 puntos de presentación muestran «—»                                                                                               | E2E `g10_11_null_not_zero`                                                                                | PASS               | `checks.json`                                             |
| G10-12 | Rojo/marfil 4,35:1 < 4,5                                                   | OBS §calculado            | `--accent` como texto normal en hover                                       | hover de `.cta-era` a `--accent-deep` (7,18:1) + subrayado; `.bignum` conserva acento — texto grande ≥24 pt (AA Large ≥3:1)                                             | recomputo de pares + revisión de todos los `color: var(--accent)`                                         | PASS               | `checks.json` (contraste documentado)                     |
| G10-13 | Rojo/azul 1,10:1 — categorías solo por color                               | OBS §calculado            | sin canal redundante                                                        | luminancia: `fill-opacity` «antes» 0,45 / «después» 0,95 en mapa; trama diagonal en barras «después» + swatch hatch en leyenda                                          | E2E (capturas) + svelte-check                                                                             | PASS               | `evidence/g10/visual/bilbao-legend-*.png`, `*-dist-*.png` |
| G10-14 | Auditoría transversal                                                      | OBS completo              | —                                                                           | ver «Nuevos defectos» en FINDINGS.md                                                                                                                                    | `g10.test.ts`, url.test.ts                                                                                | PASS_WITH_FINDINGS | `evidence/g10/FINDINGS.md`                                |

## G10.1 — residuales adjudicados por el auditor (post-`1b48306`)

Tras el cierre de G10, la revisión del auditor (`1b48306`, local = remoto,
árbol limpio) dictaminó que dos recomendaciones seguían siendo reservas
dentro del propio criterio del gate, no decisiones editoriales. Se
corrigen en G10.1 sobre `1b48306` (que queda como candidato histórico
en la genealogía; el candidato de validación humana es el SHA G10.1).

| ID     | Reserva                                                                                                                              | Causa                                          | Fix                                                                                                                                  | Test                                                            | Resultado |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | --------- |
| G10-15 | Titular y aproximaciones no restringían el universo en la propia frase («de los edificios que hoy forman…», «casi todos», «ninguno») | la restricción vivía solo en la línea de scope | `headline.post` y las tres plantillas `plain.*` nombran «año conocido»; la línea de scope se conserva como refuerzo                  | E2E `g101_headline_names_universe`, `g101_plain_names_universe` | PASS      |
| G10-16 | Año vigente solo como placeholder al editar                                                                                          | `yearStr` nacía vacío                          | al abrir «Cambiar año o lugar» el input se precarga con `app.year`; equivalente en `CompareYear` (re-edición precarga `compareYear`) | E2E `g101_year_prefilled`, `g101_prefilled_editable`            | PASS      |
| G10-17 | Cortina solo manipulable arrastrando el handle (o por teclado)                                                                       | sin alternativa de puntero sin arrastre        | botones «Solo {año}» / «Solo actualidad» que fijan la cortina en cada extremo (`role="group"` con nombre)                            | E2E `g101_swipe_pointer_buttons` + `g5_swipe`                   | PASS      |

## Adjudicación del auditor — fuera del alcance de G10 (backlog)

Recomendaciones de la auditoría que NO son defectos del candidato técnico.
Quedan clasificadas y no bloquean las pruebas humanas; tampoco deben
presentarse como resueltas.

| Recomendación                                                             | Clase             | Disposición                                                  |
| ------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------ |
| Recorrido resultado → concentración → fotos → edificio → historias        | PRODUCT           | backlog                                                      |
| Retirar KPI repetidos de la cabecera                                      | PRODUCT/EDITORIAL | backlog                                                      |
| Comparación principal cercana al nacimiento (no 1956↔última)              | PRODUCT           | backlog — requiere decisión de datos (campaña por municipio) |
| Formulario antes de imagen en móvil/tablet                                | PRODUCT/UX        | backlog                                                      |
| Ficha del edificio con diferencia respecto al nacimiento                  | PRODUCT           | backlog                                                      |
| Tabla del histograma visible bajo demanda                                 | UX/A11Y           | backlog (la tabla sr-only ya existe)                         |
| Simplificar lenguaje de entrada («Lugar», mensajes NORA, «70 años…»)      | EDITORIAL         | backlog                                                      |
| Relegar contexto ajeno al cambio temporal; hitos de edad; cierre personal | EDITORIAL/PRODUCT | backlog                                                      |

Regla: ninguna de estas entradas se marcará como hecha sin trabajo
explícito; el candidato G10.1 no implementa «toda la auditoría».

## Nuevos defectos encontrados durante G10 (todos corregidos)

1. **`Number()` acepta notación no decimal** — `'0x7c0'` → 1984 pasaba como
   año válido en inputs _y_ en `parseUrl` (`?year=0x7c0`). Cerrado con
   regex de dígitos estrictos en `parseYearInput`/`yr()`.
2. **Truncado silencioso de decimales en URL/CompareYear** — `1960.7` se
   «reparaba» a 1960. Ahora es fuera de dominio (`url.test.ts` actualizado).
3. **Hotspots: livelock en `loading`** — si el año cambiaba durante la
   request, el efecto solo invalidaba `doneKey` y el estado quedaba
   `loading` eterno. Encontrado por el E2E; corregido invalidando la
   clave activa (`doneKey ?? reqKey`).
4. **`hero.visual.now: 'hoy'`** — violaba el contrato G9 (la imagen es la
   campaña 2025). Chip → `2025`; caption cita ambas campañas.
5. **AddressSearch: `{b.area_m2} m²` crudo** — null renderizaba «null m²»
   en candidatos Catastro múltiples. Ahora `—`/fmt.

## Clasificación del barrido `?? 0` / `|| 0`

| Uso                                           | Veredicto                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `BuildingCard`/`AddressSearch` `area_m2 ?? 0` | **bug** → corregido (G10-11)                                                                      |
| `MapView` `app.year ?? 0` en share de celda   | inalcanzable (MapView solo monta con resultado activo); `shareAfter` ya devuelve `null` sin serie |
| `ortho-probe` `app.year ?? 0`                 | ordenación cosmética de alternativas, no presentación de dato                                     |
| `cells.ts` `(out.get(yi) ?? 0) + ni`          | inicialización de acumulador, correcto                                                            |
| `sincebirth` `Number(a) \|\| 0`               | acumulador de huella; NaN aporta 0 — aceptable, documentado                                       |
| `DecadeDistribution` `heaping ?? 0`           | `constants` siempre presente cuando `app.metrics` existe; defensivo                               |
| `MapView` `p.known ?? 0`                      | `known` del tile; CellData ya trata `known===0` como «sin año conocido»                           |

## Cláusulas

- Ningún PASS por inspección superficial: cada ID tiene comportamiento
  verificado (unit + E2E + captura) o refutación demostrada.
- Datos/dominio congelados: `metrics.frozen.test.ts` verde; `git diff
5df397d -- app/static data pipeline` vacío.
- Gates humanos NO cerrados: `NV-18/19` y `MOB-05b` quedan
  `PENDING_HUMAN` hasta prueba real sobre el SHA G10.
