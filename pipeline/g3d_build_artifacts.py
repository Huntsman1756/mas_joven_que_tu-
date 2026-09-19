"""G3-D — artefactos runtime de contexto condicional.

Mismo patron G3-B: join precalculado en pipeline (EPSG:25830), artefactos
pequenos por municipio consumidos a demanda.

  data/snapshots/context_YYYYMMDD/wfs/*.geojson   (fuentes congeladas)
  data/processed/g1/buildings/<cod>.parquet        (corpus edificios)

Salida:
  app/static/data/context/<cod>.json            facets por building_id
  app/static/data/context-geom/<cod>-<mod>.json geometria opt-in por modulo
                                                (ruido|paradas|montes)
  data/qa/g3d_context.json                      QA por municipio

Facet por edificio:
  [ruido_d, ruido_t, ruido_n, stops, montes]
    ruido_*: lista de bandas [LEVEL_1, LEVEL_2] que contienen el punto;
             [] = NOT_MAPPED; >1 = MULTIPLE (se conservan todas).
    stops:   [[idx_parada, dist_m]] ordenados por distancia, max N=5
             dentro de R=400 m (gate G3-D §4); [] = NO_NEARBY_STOP.
    montes:  [idx_monte] dentro de los que cae el punto; [] = OUTSIDE.
"""

import json
import re
import sys
from pathlib import Path

import duckdb
import shapely.geometry
import shapely.ops
import shapely.wkb
from pyproj import Transformer
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parent.parent
SNAP = sorted((ROOT / "data/snapshots").glob("context_*"))[-1]
WFS = SNAP / "wfs"
BUILDINGS = ROOT / "data/processed/g1/buildings"
OUT_STATIC = ROOT / "app/static/data"
OUT_CTX = OUT_STATIC / "context"
OUT_GEOM = OUT_STATIC / "context-geom"
QA = ROOT / "data/qa/g3d_context.json"
G1_GEO = ROOT / "data/processed/g1/geojson"

to25830 = Transformer.from_crs(4326, 25830, always_xy=True).transform
to4326 = Transformer.from_crs(25830, 4326, always_xy=True).transform

# gate G3-D §4 — congelado ANTES de inspeccionar ejemplos
RADIUS_M = 400
MAX_STOPS = 5


def load_fc(name: str) -> list[dict]:
    return json.load(open(WFS / f"{name}.geojson", encoding="utf-8"))["features"]


def band_key(props: dict) -> list[float]:
    return [props["LEVEL_1"], props["LEVEL_2"]]


def routes_of(codificacion: str) -> list[str]:
    """CodificacionRuta 'A3641_Destino,A3642_Destino2' -> codigos 'A3641'."""
    out = []
    for part in (codificacion or "").split(","):
        code = part.split("_", 1)[0].strip()
        if code and code not in out:
            out.append(code)
    return out


def main() -> None:
    OUT_CTX.mkdir(parents=True, exist_ok=True)
    OUT_GEOM.mkdir(parents=True, exist_ok=True)
    QA.parent.mkdir(parents=True, exist_ok=True)

    # --- fuentes congeladas ---
    isofonas: dict[str, list] = {}  # periodo -> [(band, geom)]
    for per, slug in [("D", "ruido_dia"), ("T", "ruido_tarde"), ("N", "ruido_noche")]:
        isofonas[per] = [
            (band_key(f["properties"]), shapely.geometry.shape(f["geometry"]))
            for f in load_fc(slug)
        ]
    paradas = [
        {
            "id": f["properties"]["CodigoReducidoParada"],
            "n": f["properties"]["Denominacion"],
            "r": routes_of(f["properties"].get("CodificacionRuta", "")),
            "g": shapely.geometry.shape(f["geometry"]),
        }
        for f in load_fc("bizkaibus_paradas")
    ]
    montes = [
        {
            "n": f["properties"]["NombreMonte"],
            "p": f["properties"].get("Propietario"),
            "fd": f["properties"].get("FechaDeslinde"),
            "fc": f["properties"].get("FechaCatalogacion"),
            "fa": f["properties"].get("FechaAmojonamiento"),
            "g": shapely.geometry.shape(f["geometry"]),
        }
        for f in load_fc("montes_publicos")
    ]
    print(
        f"isofonas D/T/N: {[len(isofonas[p]) for p in 'DTN']} · "
        f"paradas: {len(paradas)} · montes: {len(montes)}"
    )

    iso_trees = {p: STRtree([g for _, g in isofonas[p]]) for p in "DTN"}
    par_tree = STRtree([p["g"] for p in paradas])
    mon_tree = STRtree([m["g"] for m in montes])

    # geometrias municipales 25830 (clip de geometria opt-in)
    mgeo = json.load(open(G1_GEO / "municipalities.geojson", encoding="utf-8"))
    mun_geom = {}
    for f in mgeo["features"]:
        cod = f["properties"].get("cod") or f["properties"].get("Codigo_Mun")
        mun_geom[int(cod)] = shapely.ops.transform(
            to25830, shapely.geometry.shape(f["geometry"])
        )

    con = duckdb.connect()
    con.execute("INSTALL spatial; LOAD spatial")

    only = {int(a) for a in sys.argv[1:]} if len(sys.argv) > 1 else None
    # QA acumulativo: runs parciales no borran municipios de runs anteriores
    qa: dict = {"snapshot": SNAP.name, "radius_m": RADIUS_M, "max_stops": MAX_STOPS, "per_mun": {}}
    if QA.exists():
        try:
            qa["per_mun"] = json.loads(QA.read_text(encoding="utf-8")).get("per_mun", {})
        except Exception:
            pass
    used: dict[int, dict] = {}  # geometria opt-in: solo lo referenciado por facets

    for parquet in sorted(BUILDINGS.glob("*.parquet")):
        cod = int(parquet.stem)
        if only is not None and cod not in only:
            continue
        rows = con.execute(
            f"SELECT building_id, geom_valid, ST_AsWKB(geom) FROM '{parquet.as_posix()}'"
        ).fetchall()

        facets: dict[str, list] = {}
        stop_idx_used: set[int] = set()
        mon_idx_used: set[int] = set()
        band_used: dict[str, set] = {p: set() for p in "DTN"}
        stats = {"mapped": 0, "stops": 0, "montes": 0}
        for bid, gvalid, wkb in rows:
            if not gvalid or wkb is None:
                continue
            fp = shapely.wkb.loads(wkb)
            fp = shapely.ops.transform(to25830, fp)
            rp = fp.representative_point()

            bands = {}
            for per in "DTN":
                hits = set()
                for i in iso_trees[per].query(rp):
                    band, g = isofonas[per][int(i)]
                    if g.contains(rp) or g.touches(rp):
                        hits.add(tuple(band))
                        band_used[per].add(tuple(band))
                bands[per] = sorted(hits)

            stops = []
            for i in par_tree.query(rp.buffer(RADIUS_M)):
                d = round(rp.distance(paradas[int(i)]["g"]))
                if d <= RADIUS_M:
                    stops.append([int(i), d])
            stops = sorted(stops, key=lambda s: s[1])[:MAX_STOPS]
            for i, _ in stops:
                stop_idx_used.add(i)

            inside = []
            for i in mon_tree.query(rp):
                g = montes[int(i)]["g"]
                if g.contains(rp) or g.touches(rp):
                    inside.append(int(i))
                    mon_idx_used.add(int(i))

            if bands["D"] or bands["T"] or bands["N"] or stops or inside:
                facets[bid] = [
                    [list(b) for b in bands["D"]],
                    [list(b) for b in bands["T"]],
                    [list(b) for b in bands["N"]],
                    stops,
                    inside,
                ]
            if bands["D"]:
                stats["mapped"] += 1
            if stops:
                stats["stops"] += 1
            if inside:
                stats["montes"] += 1

        stop_dict = {
            str(i): {"id": paradas[i]["id"], "n": paradas[i]["n"], "r": paradas[i]["r"]}
            for i in sorted(stop_idx_used)
        }
        mon_dict = {
            str(i): {
                "n": montes[i]["n"],
                "p": montes[i]["p"],
                "fd": montes[i]["fd"],
                "fc": montes[i]["fc"],
                "fa": montes[i]["fa"],
            }
            for i in sorted(mon_idx_used)
        }
        # cobertura municipal por modulo: decide si el modulo existe en UI
        # (sin cobertura en todo el municipio => modulo omitido, no negativo)
        cov = {
            "r": any(band_used[p] for p in "DTN"),
            "p": bool(stop_idx_used),
            "m": bool(mon_idx_used),
        }
        payload = json.dumps(
            {
                "cod": cod,
                "v": SNAP.name,
                "cov": cov,
                "stops": stop_dict,
                "montes": mon_dict,
                "b": facets,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
        (OUT_CTX / f"{cod:03d}.json").write_text(payload, encoding="utf-8")
        used[cod] = {
            "stops": stop_idx_used,
            "montes": mon_idx_used,
            "bands": band_used,
        }
        qa["per_mun"][str(cod)] = {
            "buildings": len(rows),
            "with_facets": len(facets),
            **stats,
            "bytes": len(payload.encode()),
        }
        print(f"{cod:03d}: {len(facets)}/{len(rows)} facets, {len(payload)//1024} KB", flush=True)

    # --- geometria opt-in por municipio Y por modulo (4326) ---
    # Tres ficheros por modulo ({cod}-ruido|paradas|montes.json) para que el
    # overlay activo descargue solo la evidencia de ese modulo (una sola
    # overlay a la vez, gate §15). Solo geometria referenciada por facets:
    # montes/paradas usados, isofonas de bandas usadas (clip al municipio,
    # simplificacion 50 m, coordenadas redondeadas a 5 decimales ~1 m).
    def rnd(geom):
        return shapely.geometry.mapping(
            shapely.ops.transform(to4326, geom),  # type: ignore[arg-type]
        )

    def write_mod(cod: int, mod: str, feats: list[dict]) -> None:
        if not feats:
            return
        fc = {"type": "FeatureCollection", "v": SNAP.name, "features": feats}
        # redondeo de coordenadas para acotar bytes (5 dec ~= 1 m)
        txt = json.dumps(fc, ensure_ascii=False, separators=(",", ":"))
        txt = re.sub(r"(-?\d+\.\d{5})\d+", r"\1", txt)
        (OUT_GEOM / f"{cod:03d}-{mod}.json").write_text(txt, encoding="utf-8")

    for cod, mg in mun_geom.items():
        if only is not None and cod not in only:
            continue
        u = used.get(cod)
        if not u:
            continue
        write_mod(
            cod,
            "montes",
            [
                {
                    "type": "Feature",
                    "properties": {"i": i, "n": montes[i]["n"]},
                    "geometry": rnd(montes[i]["g"].simplify(50, preserve_topology=True)),
                }
                for i in sorted(u["montes"])
            ],
        )
        write_mod(
            cod,
            "paradas",
            [
                {
                    "type": "Feature",
                    "properties": {
                        "i": i,
                        "id": paradas[i]["id"],
                        "n": paradas[i]["n"],
                        "r": paradas[i]["r"],
                    },
                    "geometry": rnd(paradas[i]["g"]),
                }
                for i in sorted(u["stops"])
            ],
        )
        write_mod(
            cod,
            "ruido",
            [
                {
                    "type": "Feature",
                    "properties": {"p": per, "b": list(band)},
                    "geometry": rnd(
                        g.intersection(mg).simplify(50, preserve_topology=True)
                    ),
                }
                for per in "DTN"
                for band, g in isofonas[per]
                if tuple(band) in u["bands"][per] and g.intersects(mg)
            ],
        )

    QA.write_text(json.dumps(qa, ensure_ascii=False, indent=1), encoding="utf-8")
    print("QA ->", QA)


if __name__ == "__main__":
    main()
