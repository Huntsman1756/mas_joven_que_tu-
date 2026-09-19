"""G4 — índice id catastral → centroide para el deep link `building=`.

BUG-01: una URL `?building=<id>` sin cámara no puede localizar el edificio
escaneando teselas (solo contienen lo visible). Este artefacto resuelve la
localización de forma determinística: `data/buildings-index/<cod>.json`
mapea cada `building_id` a su centroide [lon, lat] (EPSG:4326), derivado de
los mismos geojson que alimentan los pmtiles — la misma fuente auditada,
sin datos nuevos.

Solo se pide en el cliente cuando hay un `building=` pendiente (demanda
explícita, fuera del critical path del resultado).

Uso: python pipeline/g4_building_index.py [cod1 cod2 ...]
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "processed" / "g1" / "geojson" / "buildings"
OUT = ROOT / "app" / "static" / "data" / "buildings-index"
QA = ROOT / "data" / "qa" / "g4_building_index.json"


def _ring_centroid(ring):
    """Centroide de polígono (shoelace) sobre un anillo exterior."""
    a = cx = cy = 0.0
    n = len(ring)
    for i in range(n):
        x0, y0 = ring[i][0], ring[i][1]
        x1, y1 = ring[(i + 1) % n][0], ring[(i + 1) % n][1]
        cross = x0 * y1 - x1 * y0
        a += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    if abs(a) < 1e-12:  # degenerado: media de vértices
        xs = [p[0] for p in ring]
        ys = [p[1] for p in ring]
        return sum(xs) / len(xs), sum(ys) / len(ys)
    a *= 0.5
    return cx / (6 * a), cy / (6 * a)


def centroid(geom):
    """Centroide del anillo exterior (o del mayor polígono si MultiPolygon)."""
    t = geom.get("type")
    coords = geom.get("coordinates") or []
    if t == "Polygon":
        polys = [coords]
    elif t == "MultiPolygon":
        polys = coords
    else:
        return None
    best, best_area = None, -1.0
    for poly in polys:
        if not poly or not poly[0]:
            continue
        ring = poly[0]
        area = abs(
            sum(
                ring[i][0] * ring[(i + 1) % len(ring)][1]
                - ring[(i + 1) % len(ring)][0] * ring[i][1]
                for i in range(len(ring))
            )
        )
        if area > best_area:
            best_area = area
            best = ring
    if not best:
        return None
    return _ring_centroid(best)


def build(cod: str) -> dict:
    gj = json.loads((SRC / f"{cod}.geojson").read_text(encoding="utf-8"))
    idx, missing, dupes = {}, 0, 0
    for f in gj.get("features", []):
        bid = (f.get("properties") or {}).get("id")
        geom = f.get("geometry")
        if not bid or not geom:
            missing += 1
            continue
        if bid in idx:
            dupes += 1
            continue
        c = centroid(geom)
        if c is None:
            missing += 1
            continue
        idx[bid] = [round(c[0], 6), round(c[1], 6)]
    return {"cod": cod, "features": len(gj.get("features", [])),
            "indexed": len(idx), "missing": missing, "dupes": dupes, "idx": idx}


def main() -> None:
    cods = sys.argv[1:] or sorted(p.stem for p in SRC.glob("*.geojson"))
    OUT.mkdir(parents=True, exist_ok=True)
    qa = {}
    for cod in cods:
        r = build(cod)
        (OUT / f"{cod}.json").write_text(
            json.dumps(r["idx"], separators=(",", ":")), encoding="utf-8"
        )
        qa[cod] = {k: r[k] for k in ("features", "indexed", "missing", "dupes")}
        print(f"{cod}: {r['indexed']}/{r['features']} "
              f"(missing {r['missing']}, dupes {r['dupes']})")
    QA.write_text(
        json.dumps(
            {"artifact": "data/buildings-index/<cod>.json",
             "source": "data/processed/g1/geojson/buildings/<cod>.geojson",
             "derived": "centroide shoelace EPSG:4326, anillo exterior",
             "municipalities": qa,
             "total_indexed": sum(v["indexed"] for v in qa.values()),
             "total_missing": sum(v["missing"] for v in qa.values()),
             "total_dupes": sum(v["dupes"] for v in qa.values())},
            indent=2),
        encoding="utf-8")
    print(f"QA -> {QA}")


if __name__ == "__main__":
    main()
