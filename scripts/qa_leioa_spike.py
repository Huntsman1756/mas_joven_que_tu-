"""SPIKE P0 — QA baseline de la capa Edificio del Catastro de Bizkaia.

NO ES PRODUCCIÓN. Spike descartable que demuestra la viabilidad del núcleo:
que `Ano_Constr` es utilizable, que las geometrías sirven y que se puede medir
cobertura, distribución y huella en planta.

Documentado en: data/qa/leioa-baseline-qa.md
Se formalizará como pipeline/qa_buildings.py en G0.

Uso:
    python scripts/qa_leioa_spike.py [ruta/al/054_Edificio.gml]
"""

from __future__ import annotations

import collections
import re
import sys
from pathlib import Path

from shapely.geometry import Polygon

DEFAULT_GML = Path("data/raw/leioa/054_Edificio.gml")

MIN_VALID_YEAR = 1700
SNAPSHOT_YEAR = 2026


def field(block: str, name: str) -> str | None:
    m = re.search(rf"<fme:{name}>(.*?)</fme:{name}>", block, re.S)
    return m.group(1).strip() if m else None


def parse_year(raw: str | None) -> tuple[int | None, str]:
    """Devuelve (año | None, estado). UNKNOWN != 0."""
    if raw is None or raw.strip() == "":
        return None, "UNKNOWN"
    try:
        value = int(raw)
    except ValueError:
        return None, "UNKNOWN"
    if value == 0:
        return None, "UNKNOWN"
    if value < MIN_VALID_YEAR or value > SNAPSHOT_YEAR:
        return None, "OUT_OF_RANGE"
    return value, "KNOWN"


def main(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    features = re.findall(r"<fme:featureMember>(.*?)</fme:featureMember>", text, re.S)

    years: list[int] = []
    areas: list[float] = []
    ids: collections.Counter[str] = collections.Counter()
    heaping: collections.Counter[int] = collections.Counter()
    decades: collections.Counter[int] = collections.Counter()
    uso: collections.Counter[str] = collections.Counter()
    unknown = out_of_range = invalid_geom = zero_area = 0

    for block in features:
        keys = (
            field(block, "Codigo_Mun"),
            field(block, "Codigo_Pol"),
            field(block, "Codigo_Par"),
            field(block, "Codigo_Sub"),
            field(block, "Codigo_Edi"),
        )
        ids["-".join(k or "?" for k in keys)] += 1

        year, status = parse_year(field(block, "Ano_Constr"))
        if status == "UNKNOWN":
            unknown += 1
        elif status == "OUT_OF_RANGE":
            out_of_range += 1
        else:
            assert year is not None
            years.append(year)
            heaping[year % 10] += 1
            decades[year // 10 * 10] += 1

        u = field(block, "Codigo_Uso")
        if u:
            uso[u] += 1

        m = re.search(r"<gml:posList>(.*?)</gml:posList>", block, re.S)
        if not m:
            invalid_geom += 1
            continue
        coords = [float(x) for x in m.group(1).split()]
        pts = list(zip(coords[0::2], coords[1::2]))
        try:
            poly = Polygon(pts)
        except Exception:
            invalid_geom += 1
            continue
        if not poly.is_valid or poly.area == 0:
            zero_area += 1
            continue
        areas.append(poly.area)

    total = len(features)
    known = len(years)
    coverage = 100 * known / total if total else 0
    duplicates = sum(1 for v in ids.values() if v > 1)
    ending_05 = heaping[0] + heaping[5]

    print(f"total_buildings            {total}")
    print(f"unknown_construction_year  {unknown}")
    print(f"out_of_range_years         {out_of_range}")
    print(f"known_construction_year    {known}")
    print(f"coverage_pct               {coverage:.2f}")
    print(f"min_year / max_year        {min(years)} / {max(years)}")
    print(f"duplicated_building_ids    {duplicates} of {len(ids)}")
    print(f"invalid_geometries         {invalid_geom}")
    print(f"zero_area_geometries       {zero_area}")
    print(f"footprint_total_ha         {sum(areas) / 10000:.1f}")
    print(f"footprint_median_m2        {sorted(areas)[len(areas) // 2]:.1f}")
    print(f"heaping_ending_0_5_pct     {100 * ending_05 / known:.1f}")
    print(f"decade_histogram           {dict(sorted(decades.items()))}")
    print(f"codigo_uso_top             {uso.most_common(8)}")
    for ref in (1987,):
        after = sum(1 for y in years if y > ref)
        print(f"pct_built_after_{ref}       {100 * after / known:.2f}  ({after}/{known})")


if __name__ == "__main__":
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_GML
    if not src.exists():
        raise SystemExit(
            f"No existe {src}. Descarga el ZIP de Catastro (ver data/manifests/"
            "bizkaia.catastro.edificios.yaml) y extrae 054_Edificio.gml."
        )
    main(src)
