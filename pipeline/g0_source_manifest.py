"""G0 — manifest de fuentes usadas en la ejecución (PROVENANCE).

Consolida: datasets CKAN, licencias, ZIP descargados (sha256), ortofotos y
versiones de toolchain. Salida: evidence/g0/00-manifest/source-manifest-g0.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECON = ROOT / "evidence/g0/02-recon/recon-bizkaia.json"
DATASETS = ROOT / "evidence/g0/02-recon/datasets.json"
RUN = ROOT / "evidence/g0/00-manifest/run-manifest.json"
OUT = ROOT / "evidence/g0/00-manifest/source-manifest-g0.json"


def main() -> int:
    recon = json.loads(RECON.read_text(encoding="utf-8"))
    datasets = json.loads(DATASETS.read_text(encoding="utf-8"))
    run = json.loads(RUN.read_text(encoding="utf-8"))

    downloads = recon["downloads"]
    n_ok = sum(1 for d in downloads.values() if d.get("ok"))
    total_bytes = sum(d.get("bytes", 0) for d in downloads.values())

    licences = sorted({d.get("licence") for d in datasets if d.get("licence")})

    manifest = {
        "run": "G0",
        "generated_from": str(RUN.relative_to(ROOT)).replace("\\", "/"),
        "retrieved_at_utc": run["started_utc"],
        "baseline_commit": run["baseline_commit"],
        "primary_source": {
            "name": "Open Data Bizkaia — Diputación Foral de Bizkaia",
            "role": "FUENTE PRINCIPAL (Base 1 del Decreto Foral 73/2026)",
            "portal": "https://www.opendatabizkaia.eus",
            "datasets": {
                "parcelario-catastral-<municipio>": {
                    "count": len(datasets),
                    "resource_used": "ZIP [SHP] (capa Edificio)",
                    "host": "https://opengis.bizkaia.eus",
                    "licences": licences,
                    "crs": "EPSG:25830",
                    "downloads_ok": n_ok,
                    "downloads_total": len(downloads),
                    "total_bytes": total_bytes,
                    "sha256_per_zip": {k: v.get("sha256_or_error") for k, v in sorted(downloads.items())},
                    "urls": {k: v.get("url") for k, v in sorted(downloads.items())},
                }
            },
        },
        "complementary_sources": [
            {
                "name": "geoEuskadi — Gobierno Vasco",
                "role": "COMPLEMENTARIA (ortofotos modernas 2004-2025, geocodificador NORA)",
                "endpoint": "https://www.geo.euskadi.eus/WMS_ORTOARGAZKIAK",
                "licence": "CC-BY-4.0",
                "licence_url": "https://creativecommons.org/licenses/by/4.0/deed.es",
                "crs": "EPSG:3857",
                "verified": "evidence/g0/05-orthos/orthos-live.json",
            }
        ],
        "not_available": [
            {
                "municipality": "Usansolo",
                "codigo_mun": 916,
                "reason": "El dataset `parcelario-catastral-usansolo` no publica recurso ZIP (ni GML ni SHP).",
            }
        ],
        "environment_limitation": (
            "El datastore y las rutas /download/ de www.opendatabizkaia.eus devuelven 'Request Rejected' (WAF) "
            "desde la red de esta ejecución. La ingesta se realizó por ZIP de opengis.bizkaia.eus."
        ),
        "toolchain": run["toolchain"],
        "frozen_sample": run["frozen_sample"],
        "integrity": run["integrity_rules"],
    }
    OUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"downloads_ok={n_ok}/{len(downloads)} bytes={total_bytes} licences={licences}")
    print("->", OUT.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
