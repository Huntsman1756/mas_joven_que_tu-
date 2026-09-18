"""G3 spike — solapes espaciales reales sobre los 5 casos seleccionados.

1. Espacios de actividades económicas (WFS JardueraEkonomikoak) x celdas.
2. Planeamiento (WFS Plangintza): clasificación + calificación pormenorizada
   en los centroides/celdas de cada caso.

WFS 2.0 EPSG:4326 -> orden de ejes lat,lon en bbox.
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from net import http_get  # noqa: E402

from shapely.geometry import shape, box
from shapely.ops import transform
from pyproj import Transformer

ECON = "https://geo.bizkaia.eus/arcgisserverinspire/services/Ekonomia_Economia/JardueraEkonomikoak_ActividadesEconomicas/MapServer/WFSServer"
PLAN = "https://geo.bizkaia.eus/arcgisserverinspire/services/LurraldeAntolamendua_PlanificacionTerritorial/Plangintza_Planeamiento/MapServer/WFSServer"
ECON_FT = "JardueraEkonomikoak_ActividadesEconomicas:Jaurduera_Ekonomiko_Sektoreak___Espacios_Actividades_Económicas"
EMP_FT = "JardueraEkonomikoak_ActividadesEconomicas:Enpresak___Empresas"
PLAN_FT = "Plangintza_Planeamiento:_.1._Urbano|Plangintza_Planeamiento:_.2._Urbanizable|Plangintza_Planeamiento:_.3._No_urbanizable"
CAL_FT_PREFIX = "Plangintza_Planeamiento:_."

OUT = Path("evidence/g3/overlap")
OUT.mkdir(parents=True, exist_ok=True)
SELECTED = ["c2803", "f4036", "f4233", "f4738", "f149"]

to3857 = Transformer.from_crs(4326, 3857, always_xy=True).transform
to25830 = Transformer.from_crs(4326, 25830, always_xy=True).transform


def wfs_geojson(base, typename, bbox4326, count=500):
    minx, miny, maxx, maxy = bbox4326
    r = http_get(base, params={
        "service": "WFS", "version": "2.0.0", "request": "GetFeature",
        "typenames": typename, "outputFormat": "GEOJSON",
        "bbox": f"{miny},{minx},{maxy},{maxx},EPSG:4326",
        "count": count}, timeout=120)
    if r.status_code != 200:
        return None, r.status_code
    return r.json(), 200


def main():
    cells = json.load(open("data/processed/g1/geojson/cells.geojson", encoding="utf-8"))
    by_fid = {f["properties"]["fid"]: shape(f["geometry"]) for f in cells["features"]}
    cand = json.load(open("evidence/g2/editorial-desk/candidates.json", encoding="utf-8"))
    report = {"generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"), "cases": {}}

    for cid in SELECTED:
        c = [x for x in cand["candidates"] if x["id"] == cid][0]
        members = c["component_members"] or [c["representative_fid"]]
        geoms = [by_fid[f] for f in members if f in by_fid]
        case = {"members": len(geoms), "municipality": c["municipality"],
                "municipalities_spanned": c.get("municipalities_spanned")}
        u = geoms[0]
        for g in geoms[1:]:
            u = u.union(g)
        bb = u.bounds  # (minx,miny,maxx,maxy) 4326
        case["bbox"] = bb

        # --- espacios de actividad ---
        fc, st = wfs_geojson(ECON, ECON_FT, bb)
        if fc is not None:
            hits = []
            cell_area = sum(transform(to25830, g).area for g in geoms)
            for f in fc["features"]:
                g = shape(f["geometry"])
                inter = sum(transform(to25830, g.intersection(cg)).area
                            for cg in geoms if g.intersects(cg))
                if inter > 1:
                    hits.append({
                        "nombre": f["properties"].get("NombrePoligonoEmpresarial"),
                        "area_m2": f["properties"].get("Shape.STArea__"),
                        "overlap_m2": round(inter, 1)})
            case["econ_spaces"] = {"count": len(hits),
                                   "coverage_pct": round(100 * sum(h["overlap_m2"] for h in hits) / cell_area, 2),
                                   "hits": sorted(hits, key=lambda h: -h["overlap_m2"])[:10]}
        else:
            case["econ_spaces"] = {"error": st}

        # --- empresas (puntos) ---
        fc2, st2 = wfs_geojson(ECON, EMP_FT, bb, count=2000)
        if fc2 is not None:
            pts = [shape(f["geometry"]) for f in fc2["features"]]
            inside = sum(1 for p in pts if any(p.within(g) or g.contains(p) for g in geoms))
            case["econ_companies"] = {"count_in_bbox": len(pts), "count_in_cells": inside}
        else:
            case["econ_companies"] = {"error": st2}

        # --- planeamiento: clasificación (punto representativo + celdas) ---
        fc3, st3 = wfs_geojson(PLAN, PLAN_FT, bb, count=2000)
        if fc3 is not None:
            classes = {}
            for f in fc3["features"]:
                g = shape(f["geometry"])
                inter = sum(transform(to25830, g.intersection(cg)).area
                            for cg in geoms if g.intersects(cg))
                if inter > 1:
                    nm = f.get("fme_feature_type") or f["properties"].get(
                        "gml_id", "?").split(".")[0]
                    for k, v in f["properties"].items():
                        if "clas" in k.lower() or "name" in k.lower() or "code" in k.lower():
                            nm = str(v) if v else nm
                    classes[nm] = classes.get(nm, 0) + inter
            case["planning_class"] = {k: round(v) for k, v in
                                      sorted(classes.items(), key=lambda x: -x[1])[:8]}
        else:
            case["planning_class"] = {"error": st3}

        report["cases"][cid] = case
        print(cid, "| econ:", case["econ_spaces"].get("count"),
              "| empresas:", case["econ_companies"].get("count_in_cells"),
              "| plan:", case["planning_class"])

    (OUT / "overlap_results.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
