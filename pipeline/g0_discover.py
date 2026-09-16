"""G0 — descubrimiento de datasets catastrales por municipio.

Lee el catálogo CKAN de Open Data Bizkaia y produce el mapeo
municipio -> recurso ZIP [SHP] (y [GML]) + licencia + fecha.

Salida: evidence/g0/02-recon/datasets.json   (inventario de recursos)
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import requests

API = "https://www.opendatabizkaia.eus/es/api/3/action"
OUT = Path("evidence/g0/02-recon/datasets.json")
UA = {"User-Agent": "Mozilla/5.0 (compatible; mas-joven-que-tu G0)"}


def main() -> int:
    rows = []
    seen: set[str] = set()
    # Single request with a large page to avoid pagination overlaps/duplicates.
    r = requests.get(
        f"{API}/package_search",
        params={"q": "parcelario-catastral", "rows": 1000},
        headers=UA, timeout=180, verify=False,
    )
    r.raise_for_status()
    res = r.json()["result"]
    print("CKAN count:", res["count"], "| returned:", len(res["results"]))
    for d in res["results"]:
        if not d["name"].startswith("parcelario-catastral"):
            continue
        if d["name"] == "parcelario-catastral-de-bizkaia":
            continue
        if d["name"] in seen:
            print("  ! duplicado ignorado:", d["name"])
            continue
        seen.add(d["name"])
        rec = {
            "dataset": d["name"],
            "org": (d.get("organization") or {}).get("name"),
            "modified": d.get("metadata_modified"),
            "title": d.get("title"),
            "gml": None,
            "shp": None,
            "csv": None,
            "licence": None,
            "csv_hash": None,
            "csv_size": None,
        }
        for rsrc in d.get("resources", []):
            au = (rsrc.get("access_URL") or "").strip()
            fmt = (rsrc.get("format") or "").lower()
            if rec["licence"] is None and rsrc.get("licence"):
                rec["licence"] = rsrc["licence"]
            if "zip" in fmt or au.endswith(".zip"):
                if "_GML.zip" in au:
                    rec["gml"] = au
                elif "_SHP.zip" in au:
                    rec["shp"] = au
            elif fmt == "text/csv" and rsrc.get("url"):
                rec["csv"] = rsrc["url"]
                rec["csv_hash"] = rsrc.get("hash")
                rec["csv_size"] = rsrc.get("size")
        rows.append(rec)

    rows.sort(key=lambda x: x["dataset"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")

    with_shp = [x for x in rows if x["shp"]]
    with_gml = [x for x in rows if x["gml"]]
    print(f"datasets: {len(rows)}  | con SHP: {len(with_shp)} | con GML: {len(with_gml)}")
    missing = [x["dataset"] for x in rows if not x["shp"] and not x["gml"]]
    if missing:
        print("SIN ZIP:", missing)
    lic = {x["licence"] for x in rows}
    print("licencias:", lic)
    return 0


if __name__ == "__main__":
    sys.exit(main())
