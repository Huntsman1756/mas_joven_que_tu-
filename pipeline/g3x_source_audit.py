"""G3-X — auditoria de fuentes Open Data Bizkaia a nivel recurso/esquema.

package_show por dataset candidato -> formats, URLs, fields datastore,
update frequency, licencia, cobertura temporal declarada.
Salida: evidence/g3/g3x/odb_resources.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from net import http_get

API = "https://www.opendatabizkaia.eus/es/api/3/action"
UA = {"User-Agent": "Mozilla/5.0 (compatible; mas-joven-que-tu G3X)"}
OUT = Path("evidence/g3/g3x/odb_resources.json")

CANDIDATES = [
    "mapas-de-ruido-de-las-carreteras-forales-de-bizkaia",
    "trafico",
    "informacion-geografica-de-rutas-y-paradas-de-bizkaibus",
    "bizkaibus",
    "montes-publicos-de-bizkaia",
    "pistas-en-espacios-naturales-protegidos-de-bizkaia",
    "red-nap-de-bizkaia",
    "residuos-instalaciones",
    "contenedores",
    "residuos-urbanos",
    "registro-foral-de-servicios-sociales",
    "vias-ciclistas-bizkaia",
    "carreteras-forales-de-bizkaia",
    "oficinas-atencion-ciudadana",
    "informacion-geografica-de-playas",
    "senderos-pr",
    "senderos",
    "rutas-colesterol",
    "fauna-cinegetica-y-pesca-fluvial",
    "informacion-geografica-del-registro-de-explotaciones-ganaderas-de-bizkaia",
    "informacion-geografica-del-registro-viticola",
    "intervenciones-speis",
    "centro-recuperacion-fauna",
    "prueba-es1",
    "estructuras-locales-para-la-igualdad-de-mujeres-y-hombres-en-bizkaia",
    "hojas-de-la-cartografia-historica-1-25-000-1923-1925-toponimicas-y-topograficas",
    "indicadores-de-accion-social",
    "cartografia-1-500-de-areas-urbanas-de-bizkaia",
    "agenda-cultural-de-bizkaia",
    "avispa-asiatica",
]


def main() -> int:
    out = {}
    for name in CANDIDATES:
        try:
            r = http_get(f"{API}/package_show", params={"id": name}, headers=UA, timeout=60)
            r.raise_for_status()
            d = r.json()["result"]
        except Exception as e:  # noqa: BLE001 - auditoria: registrar y seguir
            out[name] = {"error": str(e)[:200]}
            print(name, "ERROR", str(e)[:80])
            continue
        rec = {
            "title": d.get("title"),
            "org": (d.get("organization") or {}).get("name"),
            "license_id": d.get("license_id"),
            "license_title": d.get("license_title"),
            "metadata_modified": d.get("metadata_modified"),
            "notes": (d.get("notes") or "")[:600],
            "update_frequency": d.get("frequency") or d.get("update_frequency"),
            "groups": [g.get("name") for g in d.get("groups", [])],
            "tags": [tg.get("name") for tg in d.get("tags", [])][:12],
            "resources": [],
        }
        for rsrc in d.get("resources", []):
            rec["resources"].append(
                {
                    "name": (rsrc.get("name") or "")[:90],
                    "format": rsrc.get("format"),
                    "url": (rsrc.get("url") or rsrc.get("access_URL") or "")[:300],
                    "size": rsrc.get("size"),
                    "last_modified": rsrc.get("last_modified") or rsrc.get("modified"),
                    "created": rsrc.get("created"),
                    "hash": (rsrc.get("hash") or "")[:16],
                    "datastore_active": rsrc.get("datastore_active"),
                    "licence": rsrc.get("licence"),
                }
            )
        out[name] = rec
        print(name, "->", len(rec["resources"]), "recursos |", rec["license_id"], "|", [r["format"] for r in rec["resources"]][:8])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("->", OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
