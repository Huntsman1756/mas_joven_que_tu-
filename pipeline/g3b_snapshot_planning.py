"""G3-B — snapshot congelado de planeamiento + espacios AE.

Planeamiento: las capas WFS de clasificacion de Bizkaia son demasiado
grandes para descarga por servicio (No_urbanizable = 41 415 features,
207 s solo el resultType=hits). La fuente canonica estable es el GPKG
del servicio de descarga INSPIRE (opengis.bizkaia.eus, fichero unico,
Last-Modified auditable). Se extraen SOLO las capas que responden a
preguntas de producto (gate G3-B §1) a GeoJSON EPSG:25830.

Espacios AE: capa pequena, descarga WFS GeoJSON paginada.

Salida: data/snapshots/planning_YYYYMMDD/
"""

import csv
import hashlib
import io
import json
import sqlite3
import time
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import shapely.geometry
import shapely.wkb

ROOT = Path(__file__).resolve().parent.parent
SNAP = ROOT / "data" / "snapshots" / f"planning_{datetime.now():%Y%m%d}"
WFS_DIR = SNAP / "wfs"
GPKG_ZIP = (
    ROOT
    / "data/raw/planeamiento/"
    "HirigintzaPlangintza__PlaneamientoUrbanistico_GPKG.zip"
)

GPKG_URL = (
    "https://opengis.bizkaia.eus/Planificacion%20territorial%20y%20catastro/"
    "HirigintzaPlangintza__PlaneamientoUrbanistico/"
    "HirigintzaPlangintza__PlaneamientoUrbanistico_GPKG.zip"
)
ATTR_DOC_URL = (
    "https://opengis.bizkaia.eus/Planificacion%20territorial%20y%20catastro/"
    "HirigintzaPlangintza__PlaneamientoUrbanistico/"
    "CD_PlaneamientoUrbanistico_DescripcionAtributos_v1.5.pdf"
)
WFS_ECON = (
    "https://geo.bizkaia.eus/arcgisserverinspire/services/"
    "Ekonomia_Economia/JardueraEkonomikoak_ActividadesEconomicas/"
    "MapServer/WFSServer"
)
DATASET_PLAN = "https://www.opendatabizkaia.eus/es/catalogo/planeamiento-urbanistico"
DATASET_ECON = (
    "https://www.opendatabizkaia.eus/es/catalogo/"
    "inventario-de-espacios-de-actividades-economicas-de-bizkaia"
)

# Solo capas que responden a preguntas de producto (gate §1).
# tabla GPKG -> typename WFS equivalente (para trazabilidad).
PLAN_TABLES = {
    "clasif_urbano": ("Clasif_1_1_Urbano", "_.1._Urbano"),
    "clasif_urbanizable": ("Clasif_1_1_Urbanizable", "_.2._Urbanizable"),
    "clasif_no_urbanizable": ("Clasif_1_1_NoUrbanizable", "_.3._No_urbanizable"),
    "clasif_suspendidos": (
        "Clasif_1_4_SuelosSuspendidos",
        "_.4._Suelos_suspendidos__Clasificación_",
    ),
    "usos_residencial": ("UsosGlo_2_1_Residencial", "_.1._Residencial"),
    "usos_act_economicas": (
        "UsosGlo_2_2_ActEconomicas",
        "_.2._Actividades_económicas",
    ),
    "usos_sistemas_generales": (
        "UsosGlo_2_4_SistGenerales",
        "_.4._Sistemas_generales",
    ),
    "usos_no_urbanizable": (
        "UsosGlo_2_3_CatNoUrbanizable",
        "_.3._Categorias_no_urbanizable",
    ),
    "usos_suspendidos": (
        "UsosGlo_2_5_SuelosSuspendidos",
        "_.5._Suelos_suspendidos__Usos_globales_",
    ),
    "ambito_resid_urbano": (
        "AmbDesa_4_1_AmbResSueloUrbano",
        "_.1._Ámbitos_residenciales_en_suelo_urbano",
    ),
    "ambito_ae_urbano": (
        "AmbDesa_4_2_AmbActEcoSueloUrbano",
        "_.2._Ámbitos_de_act._econ._en_suelo_urbano",
    ),
    "ambito_pe_resid": (
        "AmbDesa_4_3_PlanEspResidenciales",
        "_.3._P._Especiales_residenciales",
    ),
    "ambito_pe_ae": (
        "AmbDesa_4_4_PlanEspActEconomicas",
        "_.4._P._Especiales_de_act._económicas",
    ),
    "ambito_resid_urbanizable": (
        "AmbDesa_4_5_AmbResSueloUrbanizable",
        "_.5._Ámbitos_resid._en_suelo_urbanizable",
    ),
    "ambito_ae_urbanizable": (
        "AmbDesa_4_6_AmbActEcoSueloUrbanizable",
        "_.6._Ámbitos_act._econ._en_suelo_urbanizable",
    ),
}
ECON_TYPENAME = (
    "JardueraEkonomikoak_ActividadesEconomicas:"
    "Jaurduera_Ekonomiko_Sektoreak___Espacios_Actividades_Económicas"
)

CSV_RESOURCES = [
    (
        "datos-globales-planeamiento-2023-2026.csv",
        "https://www.opendatabizkaia.eus/es/dump/"
        "2bfdb9f2-59cb-40d2-9883-ea76e381eda0/"
        "datos-globales-planeamiento-2023-2026?format=csv",
    ),
    (
        "datos-globales-planeamiento-2019-2022.csv",
        "https://www.opendatabizkaia.eus/es/dump/"
        "e7e82482-d25d-40c3-8280-6bc186811794/"
        "datos-globales-planeamiento-2019-2022?format=csv",
    ),
]

BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
PAGE = 1000
TIMEOUT = 300
RETRIES = 4

_ENV_BYTES = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}


def gpkg_wkb(blob: bytes):
    """Decodifica geometria GPKG (cabecera GP + envelope + WKB)."""
    if blob[:2] != b"GP":
        raise ValueError("no es geometria GPKG")
    flags = blob[3]
    env_code = (flags >> 1) & 0x07
    off = 8 + _ENV_BYTES[env_code]
    return shapely.wkb.loads(blob[off:])


def fetch(url: str, retries: int = RETRIES) -> bytes:
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": BROWSER_UA})
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            wait = 5 * (i + 1)
            print(f"    retry {i + 1}/{retries} tras {e} (espera {wait}s)")
            time.sleep(wait)
            last = e
    raise RuntimeError(f"descarga fallida: {url}: {last}")


def download_layer_wfs(typename: str, out: Path) -> dict:
    expected = None
    raw = fetch(
        WFS_ECON
        + "?"
        + urllib.parse.urlencode(
            {
                "service": "WFS",
                "version": "2.0.0",
                "request": "GetFeature",
                "typenames": typename,
                "resultType": "hits",
            }
        )
    )
    import re

    m = re.search(rb'numberMatched="(\d+)"', raw)
    expected = int(m.group(1)) if m else None
    feats: list[dict] = []
    start = 0
    while True:
        raw = fetch(
            WFS_ECON
            + "?"
            + urllib.parse.urlencode(
                {
                    "service": "WFS",
                    "version": "2.0.0",
                    "request": "GetFeature",
                    "typenames": typename,
                    "srsName": "EPSG:25830",
                    "outputFormat": "GEOJSON",
                    "count": PAGE,
                    "startIndex": start,
                }
            )
        )
        d = json.loads(raw)
        got = d.get("features", [])
        feats.extend(got)
        print(f"    {typename[:44]:46s} {start}+{len(got)}")
        if len(got) < PAGE:
            break
        start += PAGE
    if expected is not None and len(feats) != expected:
        raise RuntimeError(f"{typename}: {len(feats)} != {expected}")
    fc = {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "EPSG:25830"}},
        "features": feats,
    }
    payload = json.dumps(fc, ensure_ascii=False, separators=(",", ":")).encode()
    out.write_bytes(payload)
    schema = {
        k: type(v).__name__ for k, v in feats[0]["properties"].items()
    } if feats else {}
    return {
        "feature_count": len(feats),
        "sha256": hashlib.sha256(payload).hexdigest(),
        "bytes": len(payload),
        "schema": schema,
        "number_matched": expected,
    }


def export_table(con: sqlite3.Connection, table: str, out: Path) -> dict:
    cols = [r[1] for r in con.execute(f'pragma table_info("{table}")')]
    geom_idx = cols.index("Shape")
    feats = []
    for row in con.execute(f'select * from "{table}"'):
        geom = gpkg_wkb(row[geom_idx])
        props = {
            c: row[i]
            for i, c in enumerate(cols)
            if c != "Shape" and row[i] is not None
        }
        feats.append(
            {
                "type": "Feature",
                "properties": props,
                "geometry": shapely.geometry.mapping(geom),
            }
        )
    fc = {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "EPSG:25830"}},
        "features": feats,
    }
    payload = json.dumps(fc, ensure_ascii=False, separators=(",", ":")).encode()
    out.write_bytes(payload)
    schema = {}
    for i, c in enumerate(cols):
        if c == "Shape":
            continue
        schema[c] = "number" if isinstance(row[i], (int, float)) else "string"
    return {
        "feature_count": len(feats),
        "sha256": hashlib.sha256(payload).hexdigest(),
        "bytes": len(payload),
        "schema": schema,
    }


def csv_meta(path: Path) -> dict:
    raw = path.read_bytes()
    rows = list(csv.DictReader(raw.decode("utf-8-sig").splitlines()))
    years = sorted({r["EKITALDIA /EJERCICIO"] for r in rows})
    muns = {r["UDALERRIA/MUNICIPIO"] for r in rows}
    extr = sorted({r["DATUAK ERAUZI EGUNA/FECHA EXTRACCION"] for r in rows})
    return {
        "rows": len(rows),
        "municipalities": len(muns),
        "exercises": years,
        "extraction_dates_range": [extr[0], extr[-1]] if extr else None,
        "sha256": hashlib.sha256(raw).hexdigest(),
        "bytes": len(raw),
        "columns": list(rows[0].keys()) if rows else [],
    }


def main() -> None:
    WFS_DIR.mkdir(parents=True, exist_ok=True)
    retrieved = datetime.now(timezone.utc).isoformat(timespec="seconds")
    manifest = {
        "snapshot_id": SNAP.name,
        "captured_at": retrieved,
        "license": "CC-BY-4.0",
        "license_url": "http://creativecommons.org/licenses/by/4.0/",
        "attribution": "Open Data Bizkaia — Diputación Foral de Bizkaia",
        "crs": "EPSG:25830",
        "notes": [
            "Planeamiento extraido del GPKG del servicio de descarga "
            "INSPIRE (fichero estatico); el WFS no es viable para las "
            "capas grandes (No_urbanizable: 41 415 feats, >200 s solo "
            "el resultType=hits).",
            "Solo capas necesarias para preguntas de producto; "
            "calificacion pormenorizada (26 tipos) excluida por gate.",
            "Espacios AE descargados por WFS 2.0 con srsName=EPSG:25830 "
            "(en EPSG:4326 el bbox iria en orden lat,lon).",
        ],
        "resources": {},
    }

    zip_raw = GPKG_ZIP.read_bytes()
    zf = zipfile.ZipFile(io.BytesIO(zip_raw))
    gpkg_name = next(n for n in zf.namelist() if n.endswith(".gpkg"))
    gpkg_bytes = zf.read(gpkg_name)
    gpkg_tmp = SNAP / "_src.gpkg"
    gpkg_tmp.write_bytes(gpkg_bytes)
    manifest["resources"]["_gpkg_source"] = {
        "kind": "gpkg_zip",
        "dataset_url": DATASET_PLAN,
        "resource_url": GPKG_URL,
        "attr_doc_url": ATTR_DOC_URL,
        "retrieved_at": retrieved,
        "zip_sha256": hashlib.sha256(zip_raw).hexdigest(),
        "zip_bytes": len(zip_raw),
        "gpkg_sha256": hashlib.sha256(gpkg_bytes).hexdigest(),
        "last_modified_http": "2026-07-02",
    }
    con = sqlite3.connect(str(gpkg_tmp))

    for fname, url in CSV_RESOURCES:
        dest = SNAP / fname
        if not dest.exists():
            dest.write_bytes(fetch(url))
        meta = csv_meta(dest)
        manifest["resources"][fname] = {
            "kind": "csv",
            "dataset_url": DATASET_PLAN,
            "resource_url": url,
            "retrieved_at": retrieved,
            **meta,
        }
        print(f"CSV {fname}: {meta['rows']} filas {meta['exercises']}")

    for name, (table, typename) in PLAN_TABLES.items():
        meta = export_table(con, table, WFS_DIR / f"{name}.geojson")
        manifest["resources"][name] = {
            "kind": "gpkg_layer",
            "dataset_url": DATASET_PLAN,
            "gpkg_table": table,
            "wfs_typename_equiv": f"Plangintza_Planeamiento:{typename}",
            "retrieved_at": retrieved,
            **meta,
        }
        print(f"GPKG {name}: {meta['feature_count']} feats {meta['bytes']} B")

    print("WFS econ espacios_ae")
    meta = download_layer_wfs(ECON_TYPENAME, WFS_DIR / "espacios_ae.geojson")
    manifest["resources"]["espacios_ae"] = {
        "kind": "wfs_layer",
        "dataset_url": DATASET_ECON,
        "wfs_url": WFS_ECON,
        "typename": ECON_TYPENAME,
        "retrieved_at": retrieved,
        **meta,
    }
    print(f"  -> {meta['feature_count']} feats, {meta['bytes']} B")

    con.close()
    gpkg_tmp.unlink()
    (SNAP / "manifest.json").write_text(
        json.dumps(manifest, indent=1, ensure_ascii=False), encoding="utf-8"
    )
    print(f"manifest -> {SNAP / 'manifest.json'}")


if __name__ == "__main__":
    main()
