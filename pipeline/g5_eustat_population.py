"""
G5 — snapshot de población municipal (Eustat, API PXWeb).

Fuentes (auditoría: docs/g5/CONTEXT-SOURCES.md, evidence/g5/context-source-audit/):
  - PX_010152_cepv1_ep31.px  Población de hecho por censos, 1900–2001
  - PX_010154_cepv1_ep06b.px Población por ámbitos (padrón/estimación), 2001–2025
Licencia del dato: redifusión autorizada citando «Fuente: Sitio web de
Eustat: www.eustat.eus» (aviso legal verificado en la auditoría).

Semántica:
  - `census`: población DE HECHO por censo (1900–2001). Huecos = dato
    ausente en la fuente (p. ej. límites municipales anteriores a una
    segregación); nunca se interpolan ni se leen como 0.
  - `padron`: población a 1 de enero del último periodo publicado.
    NO se mezcla con la serie censal en una misma afirmación: son
    operaciones estadísticas distintas.

Salida:
  app/static/data/eustat-population.json  (lazy; se pide solo al entrar
  en la sección de contexto del lugar — nunca en el critical path)
  data/manifests/eustat.poblacion.yaml
  data/qa/g5_eustat_population.json

Uso:  python pipeline/g5_eustat_population.py
"""

from __future__ import annotations

import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "app/static/data/eustat-population.json"
MANIFEST = ROOT / "data/manifests/eustat.poblacion.yaml"
QA = ROOT / "data/qa/g5_eustat_population.json"
AUDIT = ROOT / "evidence/g5/context-source-audit"

API = "https://www.eustat.eus/bankupx/api/v1/es/DB"
T_CENSUS = "PX_010152_cepv1_ep31.px"
T_PADRON = "PX_010154_cepv1_ep06b.px"


def post(url: str, body: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def get(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.loads(r.read())


def stat2_dims(ds: dict):
    """JSON-stat 2.x: devuelve (ids, sizes, category indexes por dim)."""
    ids = ds["id"]
    sizes = ds["size"]
    cats = [ds["dimension"][d]["category"]["index"] for d in ids]
    labs = [ds["dimension"][d]["category"].get("label", {}) for d in ids]
    return ids, sizes, cats, labs


def flat_of(coord: list[int], sizes: list[int]) -> int:
    flat, stride = 0, 1
    for i in range(len(sizes) - 1, -1, -1):
        flat += coord[i] * stride
        stride *= sizes[i]
    return flat


def main() -> int:
    # ── 1. censo 1900–2001 (tabla completa; es pequeña) ──────────────────
    census_raw = post(f"{API}/{T_CENSUS}", {"query": [], "response": {"format": "json-stat2"}})
    (AUDIT / "eustat-ep31-full.json").write_bytes(
        json.dumps(census_raw, ensure_ascii=False).encode("utf-8")
    )
    ds = census_raw["dataset"] if "dataset" in census_raw else census_raw
    ids, sizes, cats, labs = stat2_dims(ds)
    muni_i = next(i for i, d in enumerate(ids) if "mbitos" in d)
    per_i = ids.index("periodo")
    muni_ix, muni_lab = cats[muni_i], labs[muni_i]
    per_ix = cats[per_i]
    periods = sorted(per_ix.keys(), key=lambda p: per_ix[p])
    status = ds.get("status", {})

    census: dict[str, dict] = {}
    for code, pos in muni_ix.items():
        if not (len(code) == 5 and code.startswith("48")) and code != "48":
            continue
        series = {}
        for per in periods:
            coord = [0] * len(sizes)
            coord[muni_i] = pos
            coord[per_i] = per_ix[per]
            flat = flat_of(coord, sizes)
            v = ds["value"][flat]
            # ':' = dato ausente en la fuente (UNKNOWN, nunca 0)
            series[per] = None if status.get(str(flat)) == ":" else v
        census[code] = {"name": muni_lab.get(code, code), "series": series}

    # ── 2. padrón/estimación 2001–2025 (solo totales: edad+sexo) ─────────
    padron_raw = post(
        f"{API}/{T_PADRON}",
        {
            "query": [
                {
                    "code": "grandes grupos de edad cumplida",
                    "selection": {"filter": "item", "values": ["10"]},
                },
                {"code": "sexo", "selection": {"filter": "item", "values": ["10"]}},
            ],
            "response": {"format": "json-stat2"},
        },
    )
    (AUDIT / "eustat-ep06b-total.json").write_bytes(
        json.dumps(padron_raw, ensure_ascii=False).encode("utf-8")
    )
    ds2 = padron_raw["dataset"] if "dataset" in padron_raw else padron_raw
    ids2, sizes2, cats2, labs2 = stat2_dims(ds2)
    m2 = next(i for i, d in enumerate(ids2) if "mbitos" in d)
    p2 = ids2.index("periodo")
    muni2_ix, muni2_lab = cats2[m2], labs2[m2]
    per2_ix = cats2[p2]
    periods2 = sorted(per2_ix.keys(), key=lambda p: per2_ix[p])
    latest2 = periods2[-1]
    status2 = ds2.get("status", {})

    padron: dict[str, int | None] = {}
    for code, pos in muni2_ix.items():
        if not (len(code) == 5 and code.startswith("48")) and code != "48":
            continue
        coord = [0] * len(sizes2)
        coord[m2] = pos
        coord[p2] = per2_ix[latest2]
        flat = flat_of(coord, sizes2)
        v = ds2["value"][flat]
        padron[code] = None if status2.get(str(flat)) == ":" else v

    # ── 3. unir: solo municipios presentes en el catálogo de la app ──────
    cat = json.loads((ROOT / "app/static/data/municipalities.json").read_text("utf-8"))
    # el catálogo de la app usa el cod municipal corto (1..98, 901..915);
    # Eustat indexa por código INE completo (48xxx)
    app_codes = {f"48{int(m['cod']):03d}" for m in cat["municipalities"]}
    missing = sorted(c for c in app_codes if c not in padron)

    munis = {}
    for code in sorted(app_codes):
        entry = {
            "name": muni2_lab.get(code) or muni_lab.get(code) or code,
            "padron": padron.get(code),
            "census": census.get(code, {}).get("series", {}),
        }
        munis[code] = entry

    period_label = f"{latest2[:4]}-{latest2[4:6]}-{latest2[6:8]}"
    out = {
        "source": "Eustat — Instituto Vasco de Estadística",
        "attribution": "Fuente: Sitio web de Eustat: www.eustat.eus",
        "tables": {"census": T_CENSUS, "padron": T_PADRON},
        "units": {
            "census": "población de hecho por censo (1900–2001)",
            "padron": f"población a 1 de enero ({period_label})",
        },
        "census_periods": periods,
        "padron_period": period_label,
        "munis": munis,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), "utf-8")

    # ── 4. QA ────────────────────────────────────────────────────────────
    qa = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "municipalities_in_app": len(app_codes),
        "municipalities_with_padron": sum(1 for m in munis.values() if m["padron"] is not None),
        "municipalities_missing_in_eustat": missing,
        "census_periods": periods,
        "padron_period": period_label,
        "spot_checks": {
            "48071_muskiz": {
                "padron": munis.get("48071", {}).get("padron"),
                "census_1970": munis.get("48071", {}).get("census", {}).get("1970"),
            },
            "48913_zierbena": {
                "padron": munis.get("48913", {}).get("padron"),
                "census_1970": munis.get("48913", {}).get("census", {}).get("1970"),
                "note": "sin dato antes de 1986 (segregación); hueco preservado, no 0",
            },
            "48020_bilbao": {"padron": munis.get("48020", {}).get("padron")},
        },
        "checks": {
            "all_app_munis_present": not missing,
            "no_zero_for_missing": all(
                v is None or v > 0
                for m in munis.values()
                for v in [m["padron"], *m["census"].values()]
            ),
        },
    }
    QA.write_text(json.dumps(qa, ensure_ascii=False, indent=2), "utf-8")

    MANIFEST.write_text(
        f"""# Snapshot Eustat — población municipal de Bizkaia
# Generado: {datetime.now(timezone.utc).isoformat()}
# Pipeline: pipeline/g5_eustat_population.py
source: Eustat — Instituto Vasco de Estadística (www.eustat.eus)
api: {API}
tables:
  census: {T_CENSUS}   # población de hecho, censos 1900-2001
  padron: {T_PADRON}   # población a 1 de enero, {period_label} (último publicado)
license: >
  Eustat autoriza la redifusión citando la fuente:
  «Fuente: Sitio web de Eustat: www.eustat.eus»
  (aviso legal verificado en evidence/g5/context-source-audit/eustat-aviso-legal.html;
   conjunto de alto valor bajo Directiva (UE) 2019/1024).
semantics:
  census: población de hecho por censo; huecos = dato ausente en fuente
          (límites municipales históricos); nunca 0 ni interpolado.
  padron: población a 1 de enero del último periodo; operación distinta
          del censo — no se mezclan en una misma afirmación.
output: app/static/data/eustat-population.json  (lazy, fuera del critical path)
qa: data/qa/g5_eustat_population.json
""",
        "utf-8",
    )

    print(f"municipios app: {len(app_codes)} - con padron: {qa['municipalities_with_padron']}")
    print(f"faltan en Eustat: {missing}")
    print(OUT)
    print(MANIFEST)
    print(QA)
    return 0 if qa["checks"]["all_app_munis_present"] else 1


if __name__ == "__main__":
    sys.exit(main())
