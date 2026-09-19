# G4-R · STATE-COVERAGE — matriz de estados (pairwise/risk-based)

No producto del producto cartesiano: selección por riesgo.
✅ = cubierto por gate anterior o sonda G4-R · 🔶 = parcial · ❌ = nunca
probado hoy.

## Variables (valores de riesgo)

year: 1900 | válido | snapshot | inválido
place: urbano-denso | medio | rural | low-coverage
building: none | EXACT | MULTIPLE | NORA_ONLY | BOTH_DIFFER | not-found
vista: map | time | photo
playYear: null | paused | playing | endpoint
ortho: off | on | not_covered | error | compare
histmap: off | on | unavailable
compare: none | <year | =year | >year
planning: match | multi | none | unavailable
contexto: mapped | not_mapped | no_cov | multi-monte
identidad NORA↔Catastro: equal | differ | nora_only | catastro_only

## Pares cubiertos hoy

- building×contexto (V1/V5/V8/V9 corpus G3-D) ✅
- vista×ortho (G2-B) ✅ · vista×play (G2) ✅
- building×planning (G3-B corpus) ✅
- year×compare (G3-A GA6) ✅ (pero compare==year solo por URL, BUG-05)
- place×low-coverage (G1 warn) ✅
- deep-link×(year,place,view,play,compare,ortho,building) individual ✅

## Pares nunca probados — los que importan

| Par | Estado | Riesgo | Veredicto G4-R |
|-----|--------|--------|----------------|
| building= × sin lat/lon/z | ❌→🔴 | BUG-01 confirmado | restauración silenciosa-falla |
| histmap × URL/reload | ❌→🟡 | BUG-02 confirmado | no compartible |
| ortho overlay × view=photo simultáneo | 🔶 | ambos activos? | B2: ortho inválido→ignorado; caso válido no probado |
| compare × selectPlace | ✅ | resetea | verificado B6 |
| MULTIPLE identity × planning/contexto | ❌ | corpus no tiene MULTIPLE | sin cobertura real del estrato |
| catastro_only (NORA sin año) | ❌ | identidad parcial | no probado en UI |
| play endpoint × campaign mark | ❌ | marca en fin de serie | menor |
| photo compare × share | 🔶 | orthoCompare no serializa | inconsistencia documentada |
| cellDetail × year switch | 🔶 | share recalcula (diseñado) | no probado end-to-end |
| address open × place switch | 🔶 | texto se pierde (diseñado?) | no probado |
| 3 overlays × exclusividad cruzada | ✅ parcial | ruido↔paradas no probado | gate probó exclusión planning↔contexto |
| mobile × photo compare | ❌ | dos campañas en 390px | no probado |
| Escape × disclosures | ❌→🟡 | BUG-03 | no cierra |
| Enter × combobox única candidata | ❌→🟡 | BUG-04 | no compromete |

## Combos de máximo riesgo para G4 (recomendados añadir a suites)

1. `building= + view=photo + ortho= + play=` — escena completa.
2. `place` switch con address abierto a mitad de flujo.
3. `compare` activo + `play` activo (dos anclas temporales en pantalla).
4. `MULTIPLE` identity (portal con dos polígonos) — el estrato nunca visto.
5. `hist` activo + `ortho` activo simultáneos (dos rasters a la vez —
   ¿permitido? hoy sí: son capas independientes, no exclusivas).
6. `not_covered` en FOTO → volver a MAPA → OrthoControls repite la
   misma campaña no cubierta (¿re-probe?).
