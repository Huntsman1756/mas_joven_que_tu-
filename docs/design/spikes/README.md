# Spikes de diseño de G1 (no productivos)

Scripts **de solo lectura** usados para fundamentar decisiones de diseño con evidencia.
**No forman parte del pipeline de producto** ni de la aplicación. Se conservan para que las
decisiones de `G1-TU-BIZKAIA.md` y `G1-PERFORMANCE-BUDGETS.md` sean reproducibles.

Se ejecutan **desde la raíz del repositorio** y **no escriben** en `data/` ni en `app/`.

| Script | Pregunta que responde | Salida usada en |
|--------|----------------------|-----------------|
| `g1_cell_metric.py` | ¿cuánto divergen la cuota de **edificios** y la cuota de **huella** por celda? | `G1-TU-BIZKAIA.md` §7 |
| `g1_zoom_thresholds.py` | ¿a qué zoom el edificio individual deja de ser legible frente al agregado? | `G1-TU-BIZKAIA.md` §6 |
| `g1_budget_basis.py` | ¿cuánto pesa el build y cuánto transfiere un primer encuadre con HTTP Range? | `G1-PERFORMANCE-BUDGETS.md` §3 |

```powershell
python docs\design\spikes\g1_cell_metric.py
python docs\design\spikes\g1_zoom_thresholds.py
python docs\design\spikes\g1_budget_basis.py
```

Dependen de los artefactos de G0 (`data/processed/g0/`, `app/static/data/`) y de
`duckdb`, `pmtiles` y `mapbox-vector-tile`.

> Regla del encargo: cualquier artefacto de diseño ejecutable queda **aislado** y no puede
> convertirse en la aplicación real. Si una idea de estos spikes pasa a producto, se
> reimplementa en `pipeline/` con tests, no se promociona el spike.
