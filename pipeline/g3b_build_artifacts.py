"""G3-B — artefactos runtime de planeamiento + espacios AE.

PIP precalculado en pipeline (precision completa, geometria oficial
EPSG:25830) en lugar de geometria en runtime: las capas completas
pesan ~800 MB; el resultado por edificio son unos pocos bytes.
Decisión registrada en gate G3-B §9 / ADR si procede.

Entradas (snapshot planning_20260918 + corpus G1):
  data/snapshots/planning_20260918/...
  data/processed/g1/buildings/<cod>.parquet  (geom OGC:CRS84)
  data/processed/g1/geojson/cells.geojson    (fid, 4326)
  data/processed/g1/geojson/municipalities.geojson
  app/build/data/municipalities.json         (catalogo cod/nombre)
  evidence/g2/editorial-desk/candidates.json (5 casos)

Salidas:
  app/static/data/planning-muni.json         tabla municipal (113)
  app/static/data/planning/<cod>.json        facets por building_id
  app/static/data/planning-geom/<cod>.json   ambitos+AE 4326 (visual opt-in)
  evidence/g3/g3b/overlap_cases.json         solape AE x 5 casos
  data/qa/g3b_planning.json                  QA

Contratos: DATA_SEMANTICS.md §17 (P-01..P-09).
Shares: round(100 * area(fp ∩ capa) / area(fp)); se guardan >= 1%.
"""

import csv
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

import duckdb
import shapely.geometry
import shapely.ops
import shapely.wkb
from pyproj import Transformer
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parent.parent
SNAP = ROOT / "data/snapshots/planning_20260918"
WFS = SNAP / "wfs"
BUILDINGS = ROOT / "data/processed/g1/buildings"
G1_GEO = ROOT / "data/processed/g1/geojson"
OUT_STATIC = ROOT / "app/static/data"
OUT_PLAN = OUT_STATIC / "planning"
OUT_GEOM = OUT_STATIC / "planning-geom"
EVID = ROOT / "evidence/g3/g3b"
QA = ROOT / "data/qa/g3b_planning.json"

MIN_SHARE = 1.0  # % de huella minimo para registrar un solape

CLASIF_CODE = {"urbano": 1, "urbanizable": 2, "no_urbanizable": 3, "suspendidos": 4}
USO_CODE = {
    "usos_residencial": 1,
    "usos_act_economicas": 2,
    "usos_sistemas_generales": 3,
    "usos_no_urbanizable": 4,
    "usos_suspendidos": 5,
}
USO_LABEL = {v: k for k, v in USO_CODE.items()}
AMBITO_LAYERS = {
    "ambito_resid_urbano": "ru",
    "ambito_ae_urbano": "au",
    "ambito_pe_resid": "pr",
    "ambito_pe_ae": "pa",
    "ambito_resid_urbanizable": "rz",
    "ambito_ae_urbanizable": "az",
}

to25830 = Transformer.from_crs(4326, 25830, always_xy=True).transform
to4326 = Transformer.from_crs(25830, 4326, always_xy=True).transform


def norm(name: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("-", " ")
    return re.sub(r"\s+", " ", s).strip()


def load_catalog() -> dict[str, dict]:
    d = json.load(open(ROOT / "app/build/data/municipalities.json", encoding="utf-8"))
    return {norm(m["name"]): m for m in d["municipalities"]}


def latest_rows() -> dict[int, dict]:
    """CSV 2023-2026: corte mas reciente por municipio (P-01..P-06)."""
    rows = csv.DictReader(
        open(SNAP / "datos-globales-planeamiento-2023-2026.csv", encoding="utf-8-sig")
    )
    latest = {}
    for r in rows:
        cod = int(r["KODEA/CODIGO"].strip('="'))
        key = (int(r["EKITALDIA /EJERCICIO"]), int(r["HILABETE/MES"]))
        if cod not in latest or key > latest[cod][0]:
            latest[cod] = (key, r)
    out = {}
    for cod, (_, r) in latest.items():
        def num(col):
            v = r[col].strip()
            if v == "":
                return None
            return float(v.replace(",", ".")) if "," in v else float(v)

        def integer(col):
            v = num(col)
            return None if v is None else int(round(v))

        out[cod] = {
            "ej": int(r["EKITALDIA /EJERCICIO"]),
            "mes": int(r["HILABETE/MES"]),
            "ext": r["DATUAK ERAUZI EGUNA/FECHA EXTRACCION"],
            "censo": integer("BIZTANLE ERROLDA/HABITANTES CENSO"),
            "res_t": num("BIZIT LORZORUA HL GUZTIRA (M2)/SUELO RES  TOTAL SUB(M2)")
            + num("BIZIT LORZORUA  LU GUZTIRA (M2)/SUELO RES  TOTAL SUZ(M2)"),
            "res_v": num("BIZIT LORZORUA HL HUTSIK (M2)/SUELO RES  VACANTE SUB(M2)")
            + num("BIZIT LORZORUA  LU HUTSIK (M2)/SUELO RES  VACANTE SUZ(M2)"),
            "ae_t": num("JARD EKON  LURZORUA HL GUZTIRA (M2)/SUELO AE  TOTAL SUB(M2)")
            + num("JARD EKON  LURZORUA  LU GUZTIRA (M2)/SUELO AE  TOTAL SUZ(M2)"),
            "ae_v": num("JARD EKON  LURZORUA HL HUTSIK (M2)/SUELO AE  VACANTE SUB(M2)")
            + num("JARD EKON  LURZORUA LU HUTSIK (M2)/SUELO AE  VACANTE SUZ(M2)"),
            "viv_ej": integer("BURUTZEKO ETXE  HL/VIVIENDAS POR EJECUTAR SUB")
            + integer("BURUTZEKO ETXE LU/VIVIENDAS POR EJECUTAR SUZ")
            + integer("BURUTZEKO ETXE  LN/VIVIENDAS POR EJECUTAR NR"),
        }
    return out


def load_fc(path: Path) -> list[dict]:
    return json.load(open(path, encoding="utf-8"))["features"]


def shares(fp, geoms_idx):
    """[(idx, share%)] de fp ∩ cada geometria candidata >= MIN_SHARE.

    geoms_idx: pares (idx, geom) donde idx es la posicion en la lista fuente
    — los facet referencian `ambitos`/`ae` por ese idx, nunca por la
    posicion dentro del subconjunto candidato.
    """
    if fp is None or fp.is_empty:
        return []
    a = fp.area
    if a <= 0:
        return []
    out = []
    for i, g in geoms_idx:
        if not fp.intersects(g):
            continue
        inter = fp.intersection(g).area
        sh = 100.0 * inter / a
        if sh >= MIN_SHARE:
            out.append((i, round(sh)))
    return out


def tree_query(tree: STRtree, geoms: list, fp) -> list:
    """Pares (idx_en_geoms, geom) de los candidatos del STRtree."""
    idxs = tree.query(fp)
    return [(int(i), geoms[int(i)]) for i in idxs]


def main() -> None:
    OUT_PLAN.mkdir(parents=True, exist_ok=True)
    OUT_GEOM.mkdir(parents=True, exist_ok=True)
    EVID.mkdir(parents=True, exist_ok=True)
    QA.parent.mkdir(parents=True, exist_ok=True)

    catalog = load_catalog()
    name2cod = {k: v["cod"] for k, v in catalog.items()}
    munis = latest_rows()
    print(f"municipios CSV: {len(munis)}")

    # --- capas agrupadas por municipio (campo Municipio oficial) ---
    unmapped = set()
    clasif = {c: defaultdict(list) for c in CLASIF_CODE}  # code_name -> mun -> [geom]
    for lname, code in [
        ("clasif_urbano", "urbano"),
        ("clasif_urbanizable", "urbanizable"),
        ("clasif_no_urbanizable", "no_urbanizable"),
        ("clasif_suspendidos", "suspendidos"),
    ]:
        for f in load_fc(WFS / f"{lname}.geojson"):
            mun = norm(f["properties"].get("Municipio", ""))
            if mun not in name2cod:
                unmapped.add(mun)
            clasif[code][mun].append(shapely.geometry.shape(f["geometry"]))

    usos = {u: defaultdict(list) for u in USO_CODE}
    for lname in USO_CODE:
        for f in load_fc(WFS / f"{lname}.geojson"):
            mun = norm(f["properties"].get("Municipio", ""))
            if mun not in name2cod:
                unmapped.add(mun)
            usos[lname][mun].append(shapely.geometry.shape(f["geometry"]))

    ambitos = defaultdict(list)  # mun -> [(props, geom)]
    for lname, t in AMBITO_LAYERS.items():
        for f in load_fc(WFS / f"{lname}.geojson"):
            mun = norm(f["properties"].get("Municipio", ""))
            if mun not in name2cod:
                unmapped.add(mun)
            p = f["properties"]
            ambitos[mun].append(
                {
                    "n": p.get("NombreAmbito"),
                    "t": t,
                    "c": p.get("CalificacionPormenorizadaCA"),
                    "g": shapely.geometry.shape(f["geometry"]),
                }
            )

    ae_feats = load_fc(WFS / "espacios_ae.geojson")
    ae = [
        {
            "id": f["properties"].get("IdPoligonoEmpresarial"),
            "n": f["properties"].get("NombrePoligonoEmpresarial"),
            "a": f["properties"].get("Shape.STArea__"),
            "g": shapely.geometry.shape(f["geometry"]),
        }
        for f in ae_feats
    ]
    print(f"AE poligonos: {len(ae)}")
    if unmapped:
        print("Municipio sin cod:", sorted(unmapped))

    # --- municipalidad -> geometria 25830 (para asignar AE y planning-geom) ---
    mgeo = json.load(open(G1_GEO / "municipalities.geojson", encoding="utf-8"))
    mun_geom = {}
    for f in mgeo["features"]:
        cod = f["properties"].get("cod") or f["properties"].get("Codigo_Mun")
        mun_geom[int(cod)] = shapely.ops.transform(
            to25830, shapely.geometry.shape(f["geometry"])
        )

    # Entidades de planeamiento sin codigo catastral propio (p.ej. Usansolo,
    # segregada de Galdakao tras la foto del parque): se adscriben al
    # municipio catastral que las contiene para que sus edificios no caigan
    # en OUTSIDE_KNOWN_AREA falso. La etiqueta oficial se conserva intacta.
    cod2name = {v["cod"]: k for k, v in catalog.items()}
    remap: dict[str, str] = {}
    for un in unmapped:
        feats_probe = []
        for c in clasif:
            feats_probe.extend(clasif[c].get(un, []))
        if not feats_probe:
            continue
        rp = feats_probe[0].representative_point()
        for c, g in mun_geom.items():
            if g.contains(rp):
                remap[un] = cod2name.get(c)
                print(f"planning '{un}' adscrito a cod {c} ({cod2name.get(c)})")
                break
    for un, target in remap.items():
        for c in clasif:
            clasif[c][target].extend(clasif[c].pop(un, []))
        for u in USO_CODE:
            usos[u][target].extend(usos[u].pop(un, []))
        ambitos[target].extend(ambitos.pop(un, []))

    con = duckdb.connect()
    con.execute("INSTALL spatial; LOAD spatial")

    qa = {"per_mun": {}, "cases": {}, "unmapped_names": sorted(unmapped)}
    planning_muni = {}
    selected = ["c2803", "f4036", "f4233", "f4738", "f149"]

    only = {int(a) for a in sys.argv[1:]} if len(sys.argv) > 1 else None
    for parquet in sorted(BUILDINGS.glob("*.parquet")):
        cod = int(parquet.stem)
        if only is not None and cod not in only:
            continue
        mname = next((k for k, v in name2cod.items() if v == cod), None)
        rows = con.execute(
            f"SELECT building_id, geom_valid, ST_AsWKB(geom) FROM '{parquet.as_posix()}'"
        ).fetchall()
        facets = {}
        local_amb = ambitos.get(mname, [])
        amb_geoms = [a["g"] for a in local_amb]
        amb_tree = STRtree(amb_geoms) if amb_geoms else None
        ae_geoms = [a["g"] for a in ae]
        ae_tree = STRtree(ae_geoms) if ae_geoms else None

        clasif_geoms = {
            c: clasif[c].get(mname, []) for c in CLASIF_CODE
        }
        clasif_trees = {
            c: STRtree(g) for c, g in clasif_geoms.items() if g
        }
        uso_geoms = {u: usos[u].get(mname, []) for u in USO_CODE}
        uso_trees = {u: STRtree(g) for u, g in uso_geoms.items() if g}

        for bid, gvalid, wkb in rows:
            if not gvalid or wkb is None:
                continue
            fp = shapely.wkb.loads(wkb)
            fp = shapely.ops.transform(to25830, fp)
            # clasificacion: clase dominante + share (huella a caballo => cs<100)
            best = (0, 0)
            for cname, code in CLASIF_CODE.items():
                tree = clasif_trees.get(cname)
                if tree is None:
                    continue
                cands = tree_query(tree, clasif_geoms[cname], fp)
                sh = shares(fp, cands)
                tot = sum(s for _, s in sh)
                if tot > best[1]:
                    best = (code, min(tot, 100))
            uso_hits = []
            for uname, ucode in USO_CODE.items():
                tree = uso_trees.get(uname)
                if tree is None:
                    continue
                for i, s in shares(fp, tree_query(tree, uso_geoms[uname], fp)):
                    uso_hits.append([ucode, s])
            amb_hits = []
            if amb_tree is not None:
                for i, s in shares(fp, tree_query(amb_tree, amb_geoms, fp)):
                    amb_hits.append([i, s])
            ae_hits = []
            if ae_tree is not None:
                for i, s in shares(fp, tree_query(ae_tree, ae_geoms, fp)):
                    ae_hits.append([i, s])
            if best[0] or uso_hits or amb_hits or ae_hits:
                facets[bid] = [best[0], best[1], uso_hits, amb_hits, ae_hits]

        amb_dict = {
            str(i): {"n": a["n"], "t": a["t"], "c": a["c"]}
            for i, a in enumerate(local_amb)
        }
        ae_dict = {
            str(i): {"id": a["id"], "n": a["n"]}
            for i, a in enumerate(ae)
            if mun_geom.get(cod) is not None and a["g"].intersects(mun_geom[cod])
        }
        out = {
            "cod": cod,
            "v": SNAP.name,
            "muni": munis.get(cod),
            "ambitos": amb_dict,
            "ae": ae_dict,
            "b": facets,
        }
        payload = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
        (OUT_PLAN / f"{cod:03d}.json").write_text(payload, encoding="utf-8")
        planning_muni[str(cod)] = munis.get(cod)
        qa["per_mun"][str(cod)] = {
            "buildings": len(rows),
            "with_facets": len(facets),
            "bytes": len(payload.encode()),
            "clasif_dist": {},
        }

    # --- tabla municipal global ---
    (OUT_STATIC / "planning-muni.json").write_text(
        json.dumps(
            {"v": SNAP.name, "muni": planning_muni},
            ensure_ascii=False, separators=(",", ":"),
        ),
        encoding="utf-8",
    )

    # --- planning-geom: ambitos + AE por municipio en 4326 ---
    for cod, mg in mun_geom.items():
        mname = cod2name.get(cod)
        feats = []
        for a in ambitos.get(mname, []):
            feats.append(
                {
                    "type": "Feature",
                    "properties": {"k": "amb", "n": a["n"], "t": a["t"], "c": a["c"]},
                    "geometry": shapely.geometry.mapping(
                        shapely.ops.transform(to4326, a["g"])
                    ),
                }
            )
        for a in ae:
            if a["g"].intersects(mg):
                feats.append(
                    {
                        "type": "Feature",
                        "properties": {"k": "ae", "id": a["id"], "n": a["n"], "a": a["a"]},
                        "geometry": shapely.geometry.mapping(
                            shapely.ops.transform(to4326, a["g"])
                        ),
                    }
                )
        if feats:
            (OUT_GEOM / f"{cod:03d}.json").write_text(
                json.dumps(
                    {"type": "FeatureCollection", "v": SNAP.name, "features": feats},
                    ensure_ascii=False, separators=(",", ":"),
                ),
                encoding="utf-8",
            )

    # --- 5 casos: solape AE reproducido sobre snapshot (P-09) ---
    cells = json.load(open(G1_GEO / "cells.geojson", encoding="utf-8"))
    by_fid = {f["properties"]["fid"]: shapely.geometry.shape(f["geometry"]) for f in cells["features"]}
    cand = json.load(open(ROOT / "evidence/g2/editorial-desk/candidates.json", encoding="utf-8"))
    ae_tree = STRtree([a["g"] for a in ae])
    for cid in selected:
        c = [x for x in cand["candidates"] if x["id"] == cid][0]
        members = c["component_members"] or [c["representative_fid"]]
        geoms = [shapely.ops.transform(to25830, by_fid[f]) for f in members if f in by_fid]
        u = geoms[0]
        for g in geoms[1:]:
            u = u.union(g)
        total = u.area
        hits = []
        for i in ae_tree.query(u):
            a = ae[int(i)]
            if not u.intersects(a["g"]):
                continue
            inter = u.intersection(a["g"]).area
            if inter > 1:
                hits.append(
                    {
                        "id": a["id"],
                        "nombre": a["n"],
                        "area_m2": round(a["a"] or 0, 1),
                        "overlap_m2": round(inter, 1),
                        "overlap_pct": round(100 * inter / total, 2),
                    }
                )
        cov = round(100 * sum(h["overlap_m2"] for h in hits) / total, 2)
        qa["cases"][cid] = {
            "municipality": c["municipality"],
            "members": len(geoms),
            "area_m2": round(total, 1),
            "coverage_pct": cov,
            "hits": sorted(hits, key=lambda h: -h["overlap_m2"]),
        }
        print(cid, cov, "%", [h["nombre"] for h in hits[:3]])

    (EVID / "overlap_cases.json").write_text(
        json.dumps(qa["cases"], ensure_ascii=False, indent=1), encoding="utf-8"
    )
    QA.write_text(json.dumps(qa, ensure_ascii=False, indent=1), encoding="utf-8")
    print("QA ->", QA)


if __name__ == "__main__":
    main()
