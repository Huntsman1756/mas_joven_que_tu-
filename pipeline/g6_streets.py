"""
G13 — callejero municipal para sugerencias de dirección.

Fuente: Callejero de la Comunidad Autónoma del País Vasco — capa de
portales oficiales, descarga EUSTAT «48_Atariak_Portales.csv»
(publicado por Open Data Euskadi, actualización 2025-04-02).
Licencia: CC BY 4.0 — «Eusko Jaurlaritza / Gobierno Vasco»
(ficha: euskadi.eus/callejero-comunidad-autonoma-del-pais-vasco).

Evidencia (evidence/callejero/):
  - El REST de NORA no puede devolver el callejero de un municipio:
    `descCalle` es obligatorio (sin él → 204) y `descMunicipio` NO
    filtra (contrato R1 ya documentado en domain/address.ts).
    `descCalle=%` devuelve 16 316 calles de TODA la CAV (~31 MB).
  - `Kalea-gakoa/Clave_Calle` == `calle.id` del REST de NORA y
    `Atari-gakoa/Clave_Portal` == `portal.id` (verificado con Calle
    Mayor de Getxo: 134804400000870 / 84804400015688). El id va en el
    artefacto para encadenar con `listPortals` sin otra búsqueda.

Salida por municipio (solo los 112 del catálogo):
  app/static/data/streets/<slug>.json
    {"v":1,"mun":"Getxo","streets":[{"i":id,"e":es,"u":eu,"bis":bool,"n":int}]}

QA y manifiesto:
  data/qa/g6_streets.json
  data/manifests/eustat.callejero.nora.yaml

Uso:  python pipeline/g6_streets.py [ruta_csv]
"""

from __future__ import annotations

import csv
import io
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "data/raw/callejero/48_Atariak_Portales.csv"
MUNIS = ROOT / "app/static/data/municipalities.json"
OUT = ROOT / "app/static/data/streets"
QA = ROOT / "data/qa/g6_streets.json"

COL_MUN = "Udalerri-kodea/Código Municipio"
COL_KEY = "Kalea-gakoa/Clave_Calle"
COL_ES = "Izen hedatua_es/Nombre extendido_es"
COL_EU = "Izen hedatua_eu/Nombre extendido_eu"
COL_NUC = "Biztanlegunea/Núcleo"
COL_BIS = "Bis/Bis"
COL_NUM = "Zenbakia/Número"


def main() -> int:
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else CSV
    munis = json.loads(MUNIS.read_text(encoding="utf-8"))["municipalities"]
    slug_by_cod = {f"{m['cod']:03d}": m for m in munis}

    # streets[cod][calle_id] = {e,u,bis,n,nucleos}
    streets: dict[str, dict[str, dict]] = defaultdict(dict)
    rows = 0
    with io.open(csv_path, encoding="utf-8-sig", newline="") as f:
        for x in csv.DictReader(f, delimiter=";"):
            cod = x[COL_MUN].strip()
            if cod not in slug_by_cod:
                continue  # municipio fuera del universo (p. ej. 9xx especiales)
            rows += 1
            sid = x[COL_KEY].strip()
            s = streets[cod].get(sid)
            if s is None:
                s = {
                    "i": sid,
                    "e": x[COL_ES].strip(),
                    "u": x[COL_EU].strip(),
                    "bis": False,
                    "n": 0,
                    "_nuc": set(),
                }
                streets[cod][sid] = s
            s["n"] += 1
            nuc = x[COL_NUC].strip()
            if nuc:
                s["_nuc"].add(nuc)
            if x[COL_BIS].strip():
                s["bis"] = True

    OUT.mkdir(parents=True, exist_ok=True)
    qa: dict = {"municipalities": {}, "rows_used": rows}
    empty = []
    for cod, m in slug_by_cod.items():
        table = streets.get(cod, {})
        # Núcleo solo cuando desambigua: el mismo nombre de calle existe
        # en más de un núcleo de población del municipio.
        names_nucs: dict[str, set] = defaultdict(set)
        for s in table.values():
            names_nucs[s["e"].lower()].update(s["_nuc"])
        ambiguous = {n for n, nucs in names_nucs.items() if len(nucs) > 1}
        out = []
        for s in table.values():
            nucs = sorted(s.pop("_nuc"))
            entry = {"i": s["i"], "e": s["e"], "u": s["u"], "bis": s["bis"], "n": s["n"]}
            if s["e"].lower() in ambiguous and nucs:
                entry["nuc"] = nucs[0] if len(nucs) == 1 else nucs
            out.append(entry)
        out.sort(key=lambda s: s["e"].lower())
        if not out:
            empty.append(m["slug"])
        payload = {
            "v": 1,
            "mun": m["name"],
            "source": "Callejero NORA — EUSTAT, capa de portales oficiales",
            "license": "CC BY 4.0 — Eusko Jaurlaritza / Gobierno Vasco",
            "streets": out,
        }
        (OUT / f"{m['slug']}.json").write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
        qa["municipalities"][m["slug"]] = {"streets": len(out)}

    qa["empty_municipalities"] = empty
    qa["total_streets"] = sum(v["streets"] for v in qa["municipalities"].values())
    QA.parent.mkdir(parents=True, exist_ok=True)
    QA.write_text(json.dumps(qa, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"streets/: {len(slug_by_cod) - len(empty)} municipios, {qa['total_streets']} calles")
    if empty:
        print(f"  sin callejero: {', '.join(empty)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
