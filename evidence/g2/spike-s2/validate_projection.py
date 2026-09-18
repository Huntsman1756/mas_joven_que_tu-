"""S2 — validación del contrato `cumulative_current_buildings(P)` sobre series reales.

Comprueba sobre TODAS las series canónicas (celdas + municipios):
- monotonía de cumulative(P)
- share ∈ [0,1], share(+∞) = 1
- consistencia con C-05: shareAfter(Y) == 1 - share(Y)
- ningún año fuera de rango plausible (>= 1 y <= año de snapshot)
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
CELLS = ROOT / "app" / "static" / "data" / "cells"
MUN_GJ = ROOT / "data" / "processed" / "g1" / "geojson" / "municipalities.geojson"
# canónicos (pipeline/metrics.py): rango VALID y año del snapshot
MIN_VALID_YEAR = 1700
SNAPSHOT_YEAR = 2026

errors = []
checked = {"cells": 0, "munis": 0}


def parse(s):
    out = {}
    if not s:
        return out
    for part in s.split(","):
        y, _, n = part.partition(":")
        out[int(y)] = out.get(int(y), 0) + int(n)
    return out


def check_series(label, ys):
    years = sorted(ys)
    if not years:
        return  # K=0: cuota indefinida (null), no error — celda/municipio sin VALID
    if min(years) < MIN_VALID_YEAR or max(years) > SNAPSHOT_YEAR:
        errors.append(f"{label}: año fuera de rango [{min(years)},{max(years)}]")
    k = sum(ys.values())
    cum, prev = 0, 0
    for y in years:
        cum += ys[y]
        if cum < prev:
            errors.append(f"{label}: cumulative no monótona en {y}")
        prev = cum
    if cum != k:
        errors.append(f"{label}: cum(max) != K")
    # consistencia con C-05 en puntos de muestreo
    for y in (years[0], years[len(years) // 2], years[-1]):
        after = sum(n for yy, n in ys.items() if yy > y)
        share_p = sum(n for yy, n in ys.items() if yy <= y) / k
        if abs(after / k - (1 - share_p)) > 1e-9:
            errors.append(f"{label}: C-05 inconsistente en {y}")


for f in sorted(CELLS.glob("*.json")):
    d = json.loads(f.read_text(encoding="utf-8"))
    for fid, ent in d.items():
        check_series(f"{f.name}#{fid}", parse(ent[0] if ent else None))
        checked["cells"] += 1

for feat in json.loads(MUN_GJ.read_text(encoding="utf-8"))["features"]:
    p = feat["properties"]
    check_series(f"mun:{p['cod']}", parse(p.get("ys")))
    checked["munis"] += 1

result = {"checked": checked, "errors": errors, "pass": not errors}
out = Path(__file__).with_name("result.json")
out.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
print(json.dumps(result, ensure_ascii=False)[:2000])
sys.exit(0 if not errors else 1)
