"""G3-D — resolución del corpus de validación V1-V11 (gate G3-D §11).

Criterios congelados en docs/gates/G3-D.md ANTES de implementar; este
script solo RESUELVE los slots a building_id concretos y registra el
resultado real de cada facet. Orden determinista: municipios por `cod`
ascendente, edificios por orden de fila del parquet (= fid Catastro).

Salida: evidence/g3/g3d/corpus.json
"""

import json
from pathlib import Path

import duckdb
import shapely.geometry
import shapely.ops
import shapely.wkb
from pyproj import Transformer

ROOT = Path(__file__).resolve().parent.parent
CTX = ROOT / "app/static/data/context"
PARQ = ROOT / "data/processed/g1/buildings"
GEO = ROOT / "data/processed/g1/geojson/municipalities.geojson"
BRIEFS = ROOT / "evidence/g2/story-briefs"
OUT = ROOT / "evidence/g3/g3d/corpus.json"

to25830 = Transformer.from_crs(4326, 25830, always_xy=True).transform
to4326 = Transformer.from_crs(25830, 4326, always_xy=True).transform
G2_CASES = ["c2803", "f4036", "f4233", "f4738", "f149"]


def ll(pt) -> list | None:
    """geom 25830 -> rep_point como [lon, lat] redondeado a 6 decimales."""
    if pt is None:
        return None
    p = pt.representative_point()
    x, y = to4326(p.x, p.y)
    return [round(x, 6), round(y, 6)]


def load_facets() -> dict[int, dict]:
    out = {}
    for f in sorted(CTX.glob("*.json")):
        out[int(f.stem)] = json.load(open(f, encoding="utf-8"))
    return out


def fid_order() -> dict[int, list]:
    """cod -> [(building_id, rep_point_25830)] en orden de fila."""
    con = duckdb.connect()
    con.execute("INSTALL spatial; LOAD spatial")
    out = {}
    for p in sorted(PARQ.glob("*.parquet")):
        cod = int(p.stem)
        rows = con.execute(
            f"SELECT building_id, geom_valid, ST_AsWKB(geom) FROM '{p.as_posix()}'"
        ).fetchall()
        out[cod] = [
            (
                bid,
                shapely.ops.transform(to25830, shapely.wkb.loads(wkb))
                if gvalid and wkb
                else None,
            )
            for bid, gvalid, wkb in rows
        ]
    return out


def facet_of(ctx: dict, cod: int, bid: str) -> dict:
    b = ctx.get(cod, {}).get("b", {}).get(bid)
    if not b:
        return {"d": [], "t": [], "n": [], "stops": [], "montes": []}
    return {"d": b[0], "t": b[1], "n": b[2], "stops": b[3], "montes": b[4]}


def main() -> None:
    ctx = load_facets()
    order = fid_order()
    mgeo = json.load(open(GEO, encoding="utf-8"))
    mun = {f["properties"]["cod"]: f["properties"] for f in mgeo["features"]}
    mun_geom = {
        f["properties"]["cod"]: shapely.ops.transform(
            to25830, shapely.geometry.shape(f["geometry"])
        )
        for f in mgeo["features"]
    }

    def first_fid(cod: int, pred) -> tuple[str, dict, list] | None:
        for bid, pt in order[cod]:
            f = facet_of(ctx, cod, bid)
            if pred(f):
                return bid, f, ll(pt)
        return None

    corpus: dict = {"slots": {}, "g2_cases": {}}

    # V1 Bilbao denso: municipio mas poblado del catalogo = cod 020
    # (el gate dice "048" por INE 48020; nuestro cod de catalogo es 020)
    v1 = first_fid(20, lambda f: True)
    corpus["slots"]["V1"] = {"cod": 20, "mun": mun[20]["name"], "n": mun[20]["n"], "resolved": v1 and v1[0], "pt": v1 and v1[2], "facet": v1 and v1[1]}

    # V2 Gran Bilbao: 013 Barakaldo
    v2 = first_fid(13, lambda f: True)
    corpus["slots"]["V2"] = {"cod": 13, "mun": mun[13]["name"], "n": mun[13]["n"], "resolved": v2 and v2[0], "pt": v2 and v2[2], "facet": v2 and v2[1]}

    # V4 municipio con menor densidad n/area_km2
    dens = sorted(
        mun.items(),
        key=lambda kv: kv[1]["n"] / (mun_geom[kv[0]].area / 1e6),
    )
    cod4, p4 = dens[0]
    v4 = first_fid(cod4, lambda f: True)
    corpus["slots"]["V4"] = {
        "cod": cod4, "mun": p4["name"], "n": p4["n"],
        "density": round(p4["n"] / (mun_geom[cod4].area / 1e6), 2),
        "resolved": v4 and v4[0], "pt": v4 and v4[2], "facet": v4 and v4[1],
    }

    # V5-V10: barrido global por orden (cod, fila parquet)
    def scan(pred, only_cod=None):
        for cod in ([only_cod] if only_cod else sorted(order)):
            for bid, pt in order[cod]:
                f = facet_of(ctx, cod, bid)
                if pred(f):
                    return {"cod": cod, "mun": mun[cod]["name"], "resolved": bid, "pt": ll(pt), "facet": f}
        return None

    corpus["slots"]["V5"] = scan(lambda f: bool(f["d"]))
    corpus["slots"]["V6"] = scan(lambda f: not f["d"] and not f["t"] and not f["n"])
    corpus["slots"]["V7"] = scan(lambda f: len(f["stops"]) >= 3)
    corpus["slots"]["V8"] = scan(lambda f: len(f["stops"]) == 0, only_cod=cod4)
    corpus["slots"]["V9"] = scan(lambda f: bool(f["montes"]))
    corpus["slots"]["V10"] = scan(lambda f: not f["montes"])

    # V3 + V11: casos G2 -> primer fid dentro del bbox de la ficha
    for cid in G2_CASES:
        b = json.load(open(BRIEFS / f"{cid}.json", encoding="utf-8"))
        x0, y0, x1, y1 = b["identity"]["bbox"]
        box = shapely.geometry.box(
            *shapely.geometry.mapping(
                shapely.geometry.Point(to25830(x0, y0))
            )["coordinates"],
            *shapely.geometry.mapping(
                shapely.geometry.Point(to25830(x1, y1))
            )["coordinates"],
        )
        cod_m = None
        for c, g in mun_geom.items():
            if g.intersects(box):
                if mun[c]["name"].split("/")[0].strip().lower() in b["identity"]["municipality"].lower():
                    cod_m = c
                    break
        hits = [
            (bid, facet_of(ctx, cod_m, bid), ll(pt))
            for bid, pt in order.get(cod_m, [])
            if pt is not None and box.contains(pt)
        ]
        corpus["g2_cases"][cid] = {
            "municipality": b["identity"]["municipality"],
            "cod": cod_m,
            "buildings_in_bbox": len(hits),
            "resolved": hits[0][0] if hits else None,
            "pt": hits[0][2] if hits else None,
            "facet": hits[0][1] if hits else None,
        }
    corpus["slots"]["V3"] = corpus["g2_cases"]["f4233"]
    corpus["slots"]["V11"] = corpus["g2_cases"]

    OUT.write_text(json.dumps(corpus, ensure_ascii=False, indent=1), encoding="utf-8")
    print("->", OUT)
    for k in ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10"]:
        s = corpus["slots"][k]
        if s:
            f = s.get("facet") or {}
            print(
                f"{k}: cod={s.get('cod')} {s.get('mun')} bid={s.get('resolved')} "
                f"D={len(f.get('d',[]))} T={len(f.get('t',[]))} N={len(f.get('n',[]))} "
                f"stops={len(f.get('stops',[]))} montes={len(f.get('montes',[]))}"
            )
    for cid, c in corpus["g2_cases"].items():
        f = c["facet"] or {}
        print(
            f"G2 {cid}: cod={c['cod']} inbbox={c['buildings_in_bbox']} bid={c['resolved']} "
            f"D={len(f.get('d',[]))} stops={len(f.get('stops',[]))} montes={len(f.get('montes',[]))}"
        )


if __name__ == "__main__":
    main()
