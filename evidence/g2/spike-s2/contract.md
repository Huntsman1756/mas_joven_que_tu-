# S2 — Contrato de proyección temporal `cumulative_current_buildings(P)`

Congelado antes de implementación (docs/gates/G2.md S2 / SEM1).

## Definición

Para un ámbito con serie canónica `ys` (año → nº de edificios **actuales** con
`year_state = VALID`):

- `K = Σ_y ys[y]` — denominador: **edificios existentes hoy con año registrado válido**.
- `cumulative(P) = Σ_{y ≤ P} ys[y]` — «de los edificios actuales con año conocido,
  cuántos constan como terminados hasta el año P».
- `share(P) = cumulative(P) / K`.

## Invariantes

1. `cumulative` es monótona no decreciente en P.
2. `share(P) ∈ [0,1]`; `share(+∞) = 1`.
3. `shareAfter(Y)` (C-05 existente) `= 1 − share(Y)`: la proyección G2 es la
   misma serie con la desigualdad invertida — **mismo denominador, misma fuente**.
4. `UNKNOWN` (sin año registrado) queda **fuera** de la serie y del denominador:
   nunca se le asigna año y permanece visible en mapa con su estilo atenuado.
5. La proyección describe **stock actual ordenado por año registrado** — nunca
   reconstrucción del stock histórico.

## Ámbitos y fuente de la serie

| Ámbito | Fuente | Resolución |
|---|---|---|
| Edificio | propiedad `year` en tesela `buildings` (`state` separa VALID del resto) | año |
| Celda 500 m | `app/static/data/cells/{mun:03d}.json` → `ys` por `fid` | año |
| Municipio | propiedad `ys` inline en tesela `municipalities` | año |

`ya` (huella por año) existe solo a nivel de celda y usa denominador propio
(VALID + `geom_valid`, universo C-06). La proyección de huella para G2
(`share_area(P)`) respeta ese denominador — no se mezcla con el de conteo.

## Copy permitido / prohibido (vinculante)

- Permitido: «Así se incorpora al mapa el parque que existe hoy según el año de
  construcción registrado en Catastro.»
- Prohibido: «Así era {lugar} en {año}.»
