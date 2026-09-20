"""G6 — amplía el snapshot Eustat con la serie anual de padrón y vivienda.

Sobre la base de g5_eustat_population.py (que conserva su contrato):
  - `padron_series`: ep06b completo 2001–2025 (fecha de referencia literal
    `YYYYMMDD` — la EMH mezcla refs 0101/0701; se conserva la fecha, no el año).
  - `housing`: v02a viviendas familiares por censo (1991–2021), tipos
    Total / principal / desocupada — solo comparable dentro de la familia censal.

Salida (mismo fichero, campos aditivos):
  app/static/data/eustat-population.json
  data/qa/g6_eustat_series.json
  evidence/g6/eustat/ (respuestas crudas)

Uso:  python pipeline/g6_eustat_series.py   (tras g5_eustat_population.py)
"""

from __future__ import annotations

import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "app/static/data/eustat-population.json"
QA = ROOT / "data/qa/g6_eustat_series.json"
EV = ROOT / "evidence/g6/eustat"

API = "https://www.eustat.eus/bankupx/api/v1/es/DB"
T_PADRON = "PX_010154_cepv1_ep06b.px"
T_HOUSING = "PX_010152_cepv1_v02a.px"

# v02a «tipo de vivienda»: 10 Total · 30 --Vivienda principal · 50 --desocupada
HOUSING_TYPES = {"10": "total", "30": "principal", "50": "desocupada"}


def post(url: str, body: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read())


def stat2_dims(ds: dict):
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


def series_by_muni(ds: dict, muni_dim: str, per_dim: str, extra: dict | None = None):
    """Devuelve {muni_code: {period: value}} respetando ':' = ausente."""
    ids, sizes, cats, _ = stat2_dims(ds)
    mi = next(i for i, d in enumerate(ids) if muni_dim in d)
    pi = ids.index(per_dim)
    status = ds.get("status", {})
    muni_ix, per_ix = cats[mi], cats[pi]
    extra = extra or {}
    extra_i = {
        d: i
        for i, d in enumerate(ids)
        if d not in (ids[mi], per_dim) and d in extra
    }
    out: dict[str, dict] = {}
    for code, pos in muni_ix.items():
        if not (len(code) == 5 and code.startswith("48")):
            continue
        ser = {}
        for per, ppos in per_ix.items():
            coord = [0] * len(sizes)
            coord[mi] = pos
            coord[pi] = ppos
            for d, i in extra_i.items():
                coord[i] = cats[i][extra[d]]
            flat = flat_of(coord, sizes)
            v = ds["value"][flat]
            ser[per] = None if status.get(str(flat)) == ":" else v
        out[code] = ser
    return out


def main() -> int:
    EV.mkdir(parents=True, exist_ok=True)
    snap = json.loads(OUT.read_text("utf-8"))
    munis = snap["munis"]

    # ── 1. padrón anual 2001–2025 (misma query que G5, todos los periodos) ──
    padron_raw = post(
        f"{API}/{T_PADRON}",
        {
            "query": [
                {"code": "grandes grupos de edad cumplida", "selection": {"filter": "item", "values": ["10"]}},
                {"code": "sexo", "selection": {"filter": "item", "values": ["10"]}},
            ],
            "response": {"format": "json-stat2"},
        },
    )
    (EV / "ep06b-full.json").write_bytes(json.dumps(padron_raw, ensure_ascii=False).encode())
    ds = padron_raw.get("dataset", padron_raw)
    pad_series = series_by_muni(ds, "mbitos", "periodo")

    # ── 2. viviendas por censo 1991–2021 (tipos Total/principal/desocupada) ──
    housing_raw = post(
        f"{API}/{T_HOUSING}",
        {
            "query": [
                {"code": "tipo de vivienda", "selection": {"filter": "item", "values": list(HOUSING_TYPES)}},
            ],
            "response": {"format": "json-stat2"},
        },
    )
    (EV / "v02a-housing.json").write_bytes(json.dumps(housing_raw, ensure_ascii=False).encode())
    ds2 = housing_raw.get("dataset", housing_raw)
    housing: dict[str, dict] = {}
    for tcode, tname in HOUSING_TYPES.items():
        for code, ser in series_by_muni(ds2, "mbitos", "periodo", {"tipo de vivienda": tcode}).items():
            housing.setdefault(code, {})[tname] = ser

    # ── 3. merge aditivo ───────────────────────────────────────────────────
    periods_p = sorted(next(iter(pad_series.values())).keys()) if pad_series else []
    periods_h = sorted(next(iter(housing.values()))["total"].keys()) if housing else []
    n_pad = n_hou = 0
    for code, entry in munis.items():
        if code in pad_series:
            entry["padron_series"] = pad_series[code]
            n_pad += 1
        if code in housing:
            entry["housing"] = housing[code]
            n_hou += 1

    snap["tables"]["housing"] = T_HOUSING
    snap["units"]["padron_series"] = "población por periodo de referencia literal YYYYMMDD (padrón/EMH)"
    snap["units"]["housing"] = "viviendas por censo: total / principal / desocupada (1991–2021)"
    snap["padron_periods"] = periods_p
    snap["housing_periods"] = periods_h
    OUT.write_text(json.dumps(snap, ensure_ascii=False, indent=1), "utf-8")

    qa = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "padron_periods": periods_p,
        "housing_periods": periods_h,
        "munis_with_padron_series": n_pad,
        "munis_with_housing": n_hou,
        "spot_checks": {
            "48054_leioa_padron_2001_vs_2025": [
                pad_series.get("48054", {}).get(periods_p[0]),
                pad_series.get("48054", {}).get(periods_p[-1]),
            ],
            "48020_bilbao_housing": housing.get("48020"),
        },
    }
    QA.write_text(json.dumps(qa, ensure_ascii=False, indent=2), "utf-8")
    print(f"padron_series: {n_pad} munis × {len(periods_p)} periodos")
    print(f"housing: {n_hou} munis × {len(periods_h)} censos")
    print(OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
