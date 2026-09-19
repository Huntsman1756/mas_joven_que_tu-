"""G3-D — snapshot congelado de ruido, bizkaibus y montes públicos.

Descarga WFS 2.0 (GeoJSON, EPSG:25830) con verificacion resultType=hits.
Mismo patron que g3b_snapshot_planning.py.

Capas (gate G3-D §1):
  N1 RuidoCarreteras:Ruido_{dia,tarde,noche}   isofonas LEVEL_1/LEVEL_2 dB, TIPO
  N2 RuidoCarreteras:Receptores              49 868 puntos Dia/Tarde/Noche
  M1 Bizkaibus:Geralekuak___Paradas          2 376 paradas
  B1 MendiPublikoak:Baso_Publikoak___Montes_Publicos  346 poligonos

Salida: data/snapshots/context_YYYYMMDD/ + manifest.json
"""

import hashlib
import json
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SNAP = ROOT / "data" / "snapshots" / f"context_{datetime.now():%Y%m%d}"
WFS_DIR = SNAP / "wfs"

WFS_RUIDO = (
    "https://geo.bizkaia.eus/arcgisserverinspire/services/"
    "Garraioa_Transporte/RuidoCarreteras/MapServer/WFSServer"
)
WFS_BUS = (
    "https://geo.bizkaia.eus/arcgisserverinspire/services/"
    "Garraioa_Transporte/Bizkaibus/MapServer/WFSServer"
)
WFS_MONTES = (
    "https://geo.bizkaia.eus/arcgisserverinspire/services/"
    "Nekazaritza_Agricultura/MendiPublikoak_MontesPublicos/MapServer/WFSServer"
)

DATASET_RUIDO = (
    "https://www.opendatabizkaia.eus/es/catalogo/"
    "mapas-de-ruido-de-las-carreteras-forales-de-bizkaia"
)
DATASET_BUS = (
    "https://www.opendatabizkaia.eus/es/catalogo/"
    "informacion-geografica-de-rutas-y-paradas-de-bizkaibus"
)
DATASET_MONTES = (
    "https://www.opendatabizkaia.eus/es/catalogo/montes-publicos-de-bizkaia"
)

LAYERS = [
    ("ruido_dia", WFS_RUIDO, "RuidoCarreteras:Ruido_dia", DATASET_RUIDO),
    ("ruido_tarde", WFS_RUIDO, "RuidoCarreteras:Ruido_tarde", DATASET_RUIDO),
    ("ruido_noche", WFS_RUIDO, "RuidoCarreteras:Ruido_noche", DATASET_RUIDO),
    ("ruido_receptores", WFS_RUIDO, "RuidoCarreteras:Receptores", DATASET_RUIDO),
    ("bizkaibus_paradas", WFS_BUS, "Bizkaibus:Geralekuak___Paradas", DATASET_BUS),
    (
        "montes_publicos",
        WFS_MONTES,
        "MendiPublikoak_MontesPublicos:Baso_Publikoak___Montes_Públicos",
        DATASET_MONTES,
    ),
]

UA = {"User-Agent": "mas-joven-que-tu/1.0 g3d-snapshot (proyecto concurso ODB)"}
PAGE = 1000
TIMEOUT = 240
RETRIES = 4


def fetch(url: str, retries: int = RETRIES) -> bytes:
    last = None
    for i in range(retries):
        try:
            with urllib.request.urlopen(
                urllib.request.Request(url, headers=UA), timeout=TIMEOUT
            ) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            wait = 5 * (i + 1)
            print(f"    retry {i + 1}/{retries} tras {e} (espera {wait}s)")
            time.sleep(wait)
            last = e
    raise RuntimeError(f"descarga fallida: {url}: {last}")


def wfs_hits(base: str, typename: str) -> int:
    raw = fetch(
        base
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
    m = re.search(rb'numberMatched="(\d+)"', raw)
    return int(m.group(1)) if m else -1


def download_layer(base: str, typename: str, out: Path) -> dict:
    expected = wfs_hits(base, typename)
    feats: list[dict] = []
    start = 0
    while True:
        raw = fetch(
            base
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
        got = json.loads(raw).get("features", [])
        feats.extend(got)
        print(f"    {typename[:46]:48s} {start}+{len(got)}")
        if len(got) < PAGE:
            break
        start += PAGE
    if expected >= 0 and len(feats) != expected:
        raise RuntimeError(f"{typename}: {len(feats)} != {expected} (hits)")
    fc = {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "EPSG:25830"}},
        "features": feats,
    }
    payload = json.dumps(fc, ensure_ascii=False, separators=(",", ":")).encode()
    out.write_bytes(payload)
    schema = (
        {k: type(v).__name__ for k, v in feats[0]["properties"].items()}
        if feats
        else {}
    )
    return {
        "feature_count": len(feats),
        "sha256": hashlib.sha256(payload).hexdigest(),
        "bytes": len(payload),
        "schema": schema,
        "number_matched": expected,
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
            "Descarga WFS 2.0 con srsName=EPSG:25830 y verificacion "
            "resultType=hits antes de paginar.",
            "Ruido: LEVEL_1/LEVEL_2 son los extremos de la banda en dB "
            "(verificado sobre GetFeature real: 55-60, 60-65, 65-70...); "
            "TIPO = periodo oficial D/T/N.",
            "Receptores: 49 868 puntos con Dia/Tarde/Noche; se congela "
            "como evidencia completa — el uso en producto lo decide el "
            "pipeline derivado (N2 del gate).",
            "Montes: fechas ausentes llegan como cadena 'null' (semantica "
            "de ausente congelada en DATA_SEMANTICS §18).",
            "Bizkaibus incluye paradas fuera de Bizkaia (Araba, Cantabria, "
            "Burgos): se conservan — la regla de distancia es la que gobierna.",
            "Trazados Bizkaibus (M2): solo capabilities auditados; no se "
            "congelan geometrias de ruta (no hay mapa de rutas en el gate).",
        ],
        "resources": {},
    }
    for name, base, typename, dataset in LAYERS:
        meta = download_layer(base, typename, WFS_DIR / f"{name}.geojson")
        manifest["resources"][name] = {
            "kind": "wfs_layer",
            "dataset_url": dataset,
            "wfs_url": base,
            "typename": typename,
            "retrieved_at": retrieved,
            **meta,
        }
        print(f"  -> {name}: {meta['feature_count']} feats, {meta['bytes']} B")
    (SNAP / "manifest.json").write_text(
        json.dumps(manifest, indent=1, ensure_ascii=False), encoding="utf-8"
    )
    print(f"manifest -> {SNAP / 'manifest.json'}")


if __name__ == "__main__":
    main()
