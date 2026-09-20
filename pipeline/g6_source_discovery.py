"""G6-A — Discovery reproducible de fuentes para «¿Cuánto ha cambiado tu Bizkaia?».

No hace scraping HTML: usa la API CKAN de Open Data Bizkaia
(`package_search`/`package_show`) y el GetCapabilities del WMS de geoEuskadi.

Salidas:
  evidence/g6/source-discovery/raw/ckan-package-<name>.json   (package_show crudo)
  evidence/g6/source-discovery/raw/geoeuskadi-wms-capabilities.xml
  evidence/g6/source-discovery/searches.json                  (todas las búsquedas)
  evidence/g6/source-discovery/source-matrix.json             (matriz consolidada)

Uso:  python pipeline/g6_source_discovery.py
"""

from __future__ import annotations

import hashlib
import json
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "evidence" / "g6" / "source-discovery"
RAW = OUT / "raw"

CKAN = "https://www.opendatabizkaia.eus/es/api/3/action"
GEOEUSKADI_WMS = "https://www.geo.euskadi.eus/WMS_ORTOARGAZKIAK"

UA = {"User-Agent": "mas-joven-que-tu/g6-discovery (concurso AppsTAC)"}

# Búsquedas declaradas de antemano (pre-registro): cada una persiste su
# respuesta cruda completa, acierte o no.
QUERIES = [
    "ortoimagenes",
    "ortofoto",
    "cartografia historica",
    "cartografia 1:500",
    "cartografia areas urbanas",
    "planeamiento urbanistico",
    "contratos",
    "contratacion",
    "presupuestos",
    "vivienda",
    "padron",
    "poblacion",
]


def get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def get_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()[:16]


def ckan(action: str, **params) -> dict:
    q = urllib.parse.urlencode(params)
    return get_json(f"{CKAN}/{action}?{q}")


def summarize_package(pkg: dict) -> dict:
    """Contrato de la matriz: solo campos relevantes para la decisión."""
    res = []
    for r in pkg.get("resources", []):
        res.append(
            {
                "id": r.get("id"),
                "name": r.get("name") or r.get("title"),
                "format": r.get("format"),
                # el esquema CKAN personalizado de ODB usa access_URL /
                # download_URL; `url` suele venir vacío
                "url": r.get("url") or r.get("access_URL") or r.get("download_URL"),
                "license": r.get("license_id") or r.get("licence") or r.get("license"),
                "last_modified": r.get("last_modified") or r.get("created"),
                "hash": r.get("hash") or r.get("checksum") or None,
                "size": r.get("size"),
                "description": (r.get("description") or "")[:300] or None,
            }
        )
    return {
        "id": pkg.get("id"),
        "name": pkg.get("name"),
        "title": pkg.get("title"),
        "publisher": (pkg.get("organization") or {}).get("title"),
        "license_id": pkg.get("license_id"),
        "metadata_modified": pkg.get("metadata_modified"),
        "frequency": pkg.get("frequency"),
        "temporal_coverage": [
            pkg.get("temporal_coverage_start"),
            pkg.get("temporal_coverage_end"),
        ],
        "spatial": pkg.get("spatial") or pkg.get("spatial_geographical_coverage"),
        "notes": (pkg.get("notes") or "")[:600] or None,
        "num_resources": len(res),
        "resources": res,
        "metadata_sha256_16": sha256(
            json.dumps(pkg, sort_keys=True, ensure_ascii=False).encode("utf-8")
        ),
    }


def geoeuskadi_ortho_layers() -> dict:
    """Capas ORTO_* del WMS de geoEuskadi, con título legible si existe."""
    url = f"{GEOEUSKADI_WMS}?service=WMS&request=GetCapabilities&version=1.3.0"
    raw = get_bytes(url)
    (RAW / "geoeuskadi-wms-capabilities.xml").write_bytes(raw)
    ns = {"w": "http://www.opengis.net/wms"}
    root = ET.fromstring(raw)
    layers = []
    for lay in root.iter("{http://www.opengis.net/wms}Layer"):
        name = lay.find("w:Name", ns)
        if name is None or not (name.text or "").startswith("ORTO"):
            continue
        title = lay.find("w:Title", ns)
        layers.append({"name": name.text, "title": title.text if title is not None else None})
    return {
        "endpoint": GEOEUSKADI_WMS,
        "capabilities_sha256_16": sha256(raw),
        "retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "orto_layers": sorted(layers, key=lambda l: l["name"]),
    }


def main() -> int:
    RAW.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")

    # 1) Búsquedas CKAN (todas se guardan crudas)
    searches = {}
    seen: set[str] = set()
    for q in QUERIES:
        try:
            res = ckan("package_search", q=q, rows=200)
            hits = [
                {"name": p["name"], "title": p.get("title"), "org": (p.get("organization") or {}).get("name")}
                for p in res["result"]["results"]
            ]
            searches[q] = {"count": res["result"]["count"], "hits": hits}
            for p in res["result"]["results"]:
                seen.add(p["name"])
        except Exception as e:  # red caída / 5xx: registrar, no inventar
            searches[q] = {"error": repr(e)}
    (OUT / "searches.json").write_text(
        json.dumps(searches, indent=1, ensure_ascii=False), encoding="utf-8"
    )
    print(f"searches: {len(searches)} consultas, {len(seen)} datasets únicos")

    # 2) package_show de cada dataset único que podría ser relevante
    packages = {}
    for name in sorted(seen):
        try:
            pkg = ckan("package_show", id=name)["result"]
            (RAW / f"ckan-package-{name}.json").write_text(
                json.dumps(pkg, indent=1, ensure_ascii=False), encoding="utf-8"
            )
            packages[name] = summarize_package(pkg)
        except Exception as e:
            packages[name] = {"error": repr(e)}
    print(f"package_show: {len(packages)} datasets guardados")

    # 3) Capas ORTO_* de geoEuskadi (serie completa publicada hoy)
    try:
        geo = geoeuskadi_ortho_layers()
    except Exception as e:
        geo = {"error": repr(e)}
    (OUT / "geoeuskadi-ortho-layers.json").write_text(
        json.dumps(geo, indent=1, ensure_ascii=False), encoding="utf-8"
    )
    print(f"geoEuskadi ORTO_*: {len(geo.get('orto_layers', []))} capas")

    matrix = {
        "generated_at": stamp,
        "generator": "pipeline/g6_source_discovery.py",
        "ckan_base": CKAN,
        "queries": {q: (v.get("count", v.get("error"))) for q, v in searches.items()},
        "datasets": packages,
        "geoeuskadi_wms": geo,
    }
    (OUT / "source-matrix.json").write_text(
        json.dumps(matrix, indent=1, ensure_ascii=False), encoding="utf-8"
    )
    print(f"matriz → {OUT / 'source-matrix.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
