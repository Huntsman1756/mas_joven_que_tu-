# G2 — Resumen de spikes prerregistrados (S1–S3)

Ejecutados sobre `g2-competition-cut` antes de cualquier implementación de
producto, según `docs/gates/G2.md` §Spikes.

| Spike | Pregunta | Resultado | Evidencia |
|---|---|---|---|
| S1 | ¿`year` disponible en teselas/series para Play sin regenerar corpus? | **PASS** | `spike-s1/inventory.json` |
| S2 | ¿Contrato `cumulative_current_buildings(P)` consistente con C-05 en series reales? | **PASS** — 6139 series (6027 celdas + 112 municipios), 0 errores | `spike-s2/contract.md`, `spike-s2/validate_projection.py`, `spike-s2/result.json` |
| S3 | ¿Descubrimiento de hotspots por 3 señales independientes produce universo auditable y ~20 candidatos? | **PASS** — 2004 celdas base, 316 componentes, 30 candidatos → 21 seleccionados | `spike-s3/` (method/universe/candidates/exclusions), `pipeline/g2_hotspot_spike.py` |

## S1 — hallazgos clave

- Teselas `buildings`: propiedades `year` (int) + `state` (VALID/SUSPICIOUS/INVALID/UNKNOWN) + `area_m2` + `alturas` + `uso` + `viv`. El filtro Play `year <= play_year` es una re-evaluación MapLibre — **sin regeneración**.
- Teselas `cells`: sin `year` por edificio (son agregados); la resolución anual vive en `cells/{mun:03d}.json` (`ys`/`ya` por `fid`, solo VALID). Proyección `cumulative(P)` = inversa de C-05 — **sin regeneración**.
- Teselas `municipalities`: `ys` inline — **sin regeneración**.
- Salvedad: Play de celdas simultáneo a escala provincial requeriría las 112 series; el dominio de zoom de celda opera por municipio (serie ya precargada). A zoom municipal la serie va inline.

## S2 — contrato

`cumulative(P) = Σ_{y≤P} ys[y]`, `share(P) = cumulative(P)/K` con
`K = edificios actuales con año VALID`. Invariantes verificados sobre el 100%
de las series publicadas: monotonía, `share ∈ [0,1]`, `share(∞)=1`,
`shareAfter(Y) = 1 − share(Y)` (idéntico denominador que C-05). Series vacías
(K=0) → cuota indefinida (`null`), no error. Rango VALID `[1700, 2026]`.

## S3 — descubrimiento (método congelado antes de ejecutar)

Base: `known ≥ 15` y `cov ≥ 70` (umbrales canónicos existentes) → **2004/6027 celdas**.

- **A** concentración temporal: década con mayor cuota del stock conocido → top 10.
- **B** divergencia conteo/huella: `max_P |CDF_n − CDF_a|` (KS-like) → top 10.
- **C** coherencia espacial: componentes conexas por arista con mismo `decade` → 316 componentes, top 10.
- Unión → 30 candidatos → recorte round-robin A1,B1,C1,… → **21 seleccionados**, 9 rechazados (`rank_cutoff`). Persistidos con métricas, rangos y razones en `spike-s3/`.

Sin score compuesto, sin preselección de municipios, sin ajuste posterior.

## Consecuencia

S1–S3 PASS → desbloquea G2-A (implementación de producto) según el gate.
Pendiente de la aprobación humana y del detalle final de PHASE 4 (truncado en
el brief) antes de escribir código de producto.
