# ADR-012 — Cabezal temporal separado: `selected_year ≠ play_year`

- **Estado:** aceptado
- **Fecha:** 2026-09-18
- **Preregistrado en:** `docs/gates/G2.md` §SEM/§TIME · `docs/G2-DIRECTION.md` §4

## Contexto

G2-A introduce reproducción temporal del stock actual (`Play`/scrub). La opción
ingenua — animar mutando `app.year` — contaminaría el año personal del usuario:
titular, métricas C-05/C-08, denominadores y la URL compartible quedan anclados a
ese año. Además «estar cerca de una campaña» era una noción ambigua que el gate
sustituyó por marcadores exactos de campaña.

## Decisión

1. **Dos estados temporales explícitos** en `AppState`:
   - `year` (`selected_year`): solo muta por acción explícita del usuario
     (hero, «Cambiar año», deep link). Ancla titular, métricas, denominadores y
     el parámetro `year` de la URL.
   - `playYear`: cabezal transitorio; `null` = modo temporal inactivo. Un cambio
     de `year` o de `place` lo resetea a `null`.
   - `playing`/`playUrlSeq` separan el transporte de la sincronización de URL
     (la URL solo se reescribe en eventos discretos, nunca por frame).

2. **Proyección canónica** (`cumulative_current_buildings(P)`, contrato S2):
   `shareUntilParsed(ys, P) = Σ_{y≤P} ys[y] / K` — inversa exacta de C-05, mismo
   denominador (edificios actuales con año VALID). Implementada en
   `domain/cells.ts`; 0 recálculo desde datos crudos en frontend.

3. **Dominio de escala**:
   - Edificios (z ≥ 13,5): filtro MapLibre `year <= playYear` sobre la propiedad
     `year` ya presente en teselas; `state ≠ VALID` permanece visible con su
     trama, fuera de la ordenación temporal.
   - Celdas (9 ≤ z < 13,5): feature-state `share` = cuota constatada hasta
     `playYear`, solo sobre series `ys` ya publicadas de los municipios
     visibles (la precarga en `idle` existente; no se piden las 112 series).
   - Municipios (z < 9): sin animación — representación agregada anclada a
     `selected_year`.

4. **Marcadores de campaña exactos** en el eje: cada marca es un año nominal del
   catálogo; se activa cuando el cabezal (o el año seleccionado) la alcanza y su
   clic invoca el contrato `AVAILABLE / NOT_COVERED / SERVICE_ERROR` existente.
   Sin peticiones de ortofoto durante Play/scrub (F3, extensión de G1-P5).

5. **`prefers-reduced-motion`**: sin autoplay ni botón Play; paso ±1 año y scrub
   manual ofrecen la misma semántica (T6).

## Consecuencias

- `?play=YYYY` serializa el cabezal en pausa; un deep link reproduce
  `place + year + view + play` sin autoplay.
- El invariante T1 (`year` no muta) es verificable por instrumentación.
- Las series `ys/ya` existentes bastan: no se regenera el corpus (spike S1).
