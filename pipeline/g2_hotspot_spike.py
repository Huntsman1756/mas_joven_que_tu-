"""G2 SPIKE S3 — descubrimiento determinista de hotspots (contrato prerregistrado).

Método CONGELADO antes de ejecutar (docs/gates/G2.md HOT1, docs/G2-DIRECTION.md §6).
No hay puntuación compuesta: cada señal produce su propio ranking y la unión de
candidatos se recorta por round-robin de rangos. Ningún municipio está preseleccionado.

BASE (aplica a las tres señales):
  known >= 15            (CELL_SMALL_DENOMINATOR canónico)
  cov   >= 70            (coverage_hide_stat, DATA_SEMANTICS §7)

SEÑAL A — concentración temporal:
  Para cada celda base, share_d = n(década d) / known, d = (year//10)*10 sobre `ys`.
  métrica = max_d share_d; década dominante con desempate canónico (n DESC, d ASC).
  Ranking: métrica DESC, known DESC, fid ASC. Top 10.

SEÑAL B — divergencia edificios/huella:
  Sobre `ys` (conteo) e `ya` (m²): D = max_P |CDF_n(P) - CDF_a(P)|
  donde CDF_x(P) = Σ_{y<=P} x[y] / Σ_y x[y]. Interpretable: años donde pocos
  edificios concentran mucha huella (o al revés). Celdas sin `ya` quedan fuera
  de esta señal (razón registrada). Top 10, mismo desempate.

SEÑAL C — coherencia espacial:
  Componentes conexas de celdas base con el mismo `decade`, adyacentes por ARISTA
  (intersección de fronteras con longitud > 1e-7 deg; esquina no cuenta).
  métrica = tamaño del componente. Desempate: known_total DESC, fid_min ASC.
  Top 10 componentes; representante = celda con mayor known (desempate fid ASC).

SELECCIÓN:
  Unión de candidatos (celdas A/B por fid; componente C por su representante).
  Si la unión supera 20, recorte determinista por round-robin de rangos
  A1,B1,C1,A2,B2,C2,...; el resto queda registrado como rechazado (rank_cutoff).

Salidas en evidence/g2/spike-s3/: method.json (parámetros + hash del script),
universe.json (todas las celdas con flags y métricas), candidates.json,
exclusions.json.
"""

from __future__ import annotations

import hashlib
import json
import sys
from collections import defaultdict
from pathlib import Path

from shapely.geometry import shape
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parent.parent
GJ = ROOT / "data" / "processed" / "g1" / "geojson"
SERIES = ROOT / "app" / "static" / "data" / "cells"
OUT = ROOT / "evidence" / "g2" / "spike-s3"

BASE_MIN_KNOWN = 15
BASE_MIN_COV = 70.0
EDGE_TOL = 1e-7  # longitud mínima de frontera compartida (deg) = arista real
TOP_PER_SIGNAL = 10
TARGET = 20


def parse_series(s: str | None) -> dict[int, float]:
    out: dict[int, float] = {}
    if not s:
        return out
    for part in s.split(","):
        y, _, n = part.partition(":")
        out[int(y)] = out.get(int(y), 0.0) + float(n)
    return out


def decade_of(y: int) -> int:
    return (y // 10) * 10


def main() -> int:
    cells_gj = json.loads((GJ / "cells.geojson").read_text(encoding="utf-8"))
    munis_gj = json.loads((GJ / "municipalities.geojson").read_text(encoding="utf-8"))
    mun_name = {f["properties"]["cod"]: f["properties"]["name"] for f in munis_gj["features"]}

    series_cache: dict[int, dict] = {}

    def series_for(mun: int) -> dict:
        if mun not in series_cache:
            series_cache[mun] = json.loads(
                (SERIES / f"{mun:03d}.json").read_text(encoding="utf-8")
            )
        return series_cache[mun]

    universe = []
    for f in cells_gj["features"]:
        p = f["properties"]
        e = {
            "fid": p["fid"],
            "mun": p["mun"],
            "mun_name": mun_name.get(p["mun"]),
            "n": p["n"],
            "known": p["known"],
            "cov": p["cov"],
            "decade": p["decade"],
            "base": p["known"] >= BASE_MIN_KNOWN and (p["cov"] or 0) >= BASE_MIN_COV,
            "exclusion": None,
            "geom": shape(f["geometry"]),
        }
        if p["known"] < BASE_MIN_KNOWN:
            e["exclusion"] = "known<15"
        elif (p["cov"] or 0) < BASE_MIN_COV:
            e["exclusion"] = "cov<70"
        universe.append(e)

    base = [e for e in universe if e["base"]]

    # --- Señal A: concentración temporal -------------------------------------
    for e in base:
        ent = series_for(e["mun"]).get(str(e["fid"]))
        ys = parse_series(ent[0] if ent else None)
        if not ys:
            e["a"] = None
            continue
        by_dec: dict[int, float] = defaultdict(float)
        for y, n in ys.items():
            by_dec[decade_of(y)] += n
        top_dec = min(by_dec, key=lambda d: (-by_dec[d], d))
        e["a"] = {"share": by_dec[top_dec] / e["known"], "decade": top_dec}
    rank_a = sorted(
        (e for e in base if e.get("a")),
        key=lambda e: (-e["a"]["share"], -e["known"], e["fid"]),
    )
    for i, e in enumerate(rank_a):
        e["a"]["rank"] = i + 1

    # --- Señal B: divergencia conteo/huella ----------------------------------
    for e in base:
        ent = series_for(e["mun"]).get(str(e["fid"]))
        if not ent or not ent[1]:
            e["b"] = None
            e.setdefault("exclusion_b", "no_ya")
            continue
        ys, ya = parse_series(ent[0]), parse_series(ent[1])
        tn, ta = sum(ys.values()), sum(ya.values())
        if tn == 0 or ta == 0:
            e["b"] = None
            continue
        cn = ca = d_max = 0.0
        peak = None
        for y in sorted(set(ys) | set(ya)):
            cn += ys.get(y, 0.0)
            ca += ya.get(y, 0.0)
            d = abs(cn / tn - ca / ta)
            if d > d_max:
                d_max, peak = d, y
        e["b"] = {"d": d_max, "at_year": peak}
    rank_b = sorted(
        (e for e in base if e.get("b")),
        key=lambda e: (-e["b"]["d"], -e["known"], e["fid"]),
    )
    for i, e in enumerate(rank_b):
        e["b"]["rank"] = i + 1

    # --- Señal C: coherencia espacial ----------------------------------------
    geoms = [e["geom"] for e in base]
    tree = STRtree(geoms)
    adj: dict[int, set[int]] = defaultdict(set)
    for i, g in enumerate(geoms):
        for j in tree.query(g):
            if j <= i:
                continue
            if g.boundary.intersection(geoms[j].boundary).length > EDGE_TOL:
                adj[i].add(j)
                adj[j].add(i)
    seen: set[int] = set()
    components = []
    for i in range(len(base)):
        if i in seen:
            continue
        stack, comp = [i], []
        seen.add(i)
        while stack:
            k = stack.pop()
            comp.append(k)
            for j in adj[k]:
                if j not in seen and base[j]["decade"] == base[i]["decade"]:
                    seen.add(j)
                    stack.append(j)
        if len(comp) > 1 and all(base[k]["decade"] == base[i]["decade"] for k in comp):
            rep = min(comp, key=lambda k: (-base[k]["known"], base[k]["fid"]))
            components.append(
                {
                    "decade": base[i]["decade"],
                    "size": len(comp),
                    "known_total": sum(base[k]["known"] for k in comp),
                    "fid_min": min(base[k]["fid"] for k in comp),
                    "rep_fid": base[rep]["fid"],
                    "members": sorted(base[k]["fid"] for k in comp),
                    "mun_name": base[rep]["mun_name"],
                }
            )
    components.sort(key=lambda c: (-c["size"], -c["known_total"], c["fid_min"]))
    for i, c in enumerate(components):
        c["rank"] = i + 1

    # --- Selección: unión + round-robin --------------------------------------
    cand: dict[str, dict] = {}

    def add(key: str, src: str, fid: int | None, comp: dict | None = None):
        c = cand.setdefault(
            key, {"key": key, "fid": fid, "signals": {}, "component": comp}
        )
        c["signals"][src] = True

    for e in rank_a[:TOP_PER_SIGNAL]:
        add(f"f{e['fid']}", "A", e["fid"])
    for e in rank_b[:TOP_PER_SIGNAL]:
        add(f"f{e['fid']}", "B", e["fid"])
    for c in components[:TOP_PER_SIGNAL]:
        add(f"c{c['fid_min']}", "C", c["rep_fid"], c)

    lists = {
        "A": [f"f{e['fid']}" for e in rank_a[:TOP_PER_SIGNAL]],
        "B": [f"f{e['fid']}" for e in rank_b[:TOP_PER_SIGNAL]],
        "C": [f"c{c['fid_min']}" for c in components[:TOP_PER_SIGNAL]],
    }
    selected, rejected = [], []
    idx, picks = 0, set()
    while len(selected) < min(TARGET, len(cand)):
        moved = False
        for sig in "ABC":
            if idx < len(lists[sig]) and lists[sig][idx] not in picks:
                picks.add(lists[sig][idx])
                selected.append(lists[sig][idx])
                moved = True
        if not moved:
            idx += 1
            if all(idx >= len(v) for v in lists.values()):
                break
    rejected = [k for k in cand if k not in picks]

    OUT.mkdir(parents=True, exist_ok=True)
    script_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    (OUT / "method.json").write_text(
        json.dumps(
            {
                "script": "pipeline/g2_hotspot_spike.py",
                "script_sha256": script_hash,
                "base": {"known_min": BASE_MIN_KNOWN, "cov_min": BASE_MIN_COV},
                "edge_tol_deg": EDGE_TOL,
                "top_per_signal": TOP_PER_SIGNAL,
                "target": TARGET,
                "tiebreak": {
                    "A_B": ["metric DESC", "known DESC", "fid ASC"],
                    "C": ["size DESC", "known_total DESC", "fid_min ASC"],
                    "decade": ["n DESC", "decade ASC"],
                },
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    (OUT / "universe.json").write_text(
        json.dumps(
            [
                {
                    k: e[k]
                    for k in ("fid", "mun", "mun_name", "n", "known", "cov", "decade", "base", "exclusion")
                }
                | {"a": e.get("a"), "b": e.get("b")}
                for e in universe
            ],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    (OUT / "candidates.json").write_text(
        json.dumps(
            {"selected": selected, "rejected": rejected, "candidates": cand},
            ensure_ascii=False,
            indent=1,
        ),
        encoding="utf-8",
    )
    (OUT / "exclusions.json").write_text(
        json.dumps(
            {
                "total_cells": len(universe),
                "base": len(base),
                "excluded_known_lt_15": sum(1 for e in universe if e["exclusion"] == "known<15"),
                "excluded_cov_lt_70": sum(1 for e in universe if e["exclusion"] == "cov<70"),
                "signal_b_no_ya": sum(1 for e in base if e.get("exclusion_b")),
                "components": len(components),
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"universe={len(universe)} base={len(base)} components={len(components)}")
    print(f"candidates={len(cand)} selected={len(selected)} rejected={len(rejected)}")
    print("top A:", [(e["fid"], round(e["a"]["share"], 3), e["a"]["decade"]) for e in rank_a[:5]])
    print("top B:", [(e["fid"], round(e["b"]["d"], 3), e["b"]["at_year"]) for e in rank_b[:5]])
    print("top C:", [(c["fid_min"], c["size"], c["decade"]) for c in components[:5]])
    return 0


if __name__ == "__main__":
    sys.exit(main())
