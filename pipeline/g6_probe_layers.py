"""G6 — Sondas de contenido real (AGENTS §2: HTTP 200 no prueba contenido).

Verifica:
  a) Capas ORTO_* de geoEuskadi con cobertura real en Bizkaia
     (GetMap EPSG:3857 en el área de Leioa/Gran Bilbao → imagen con >1 color).
  b) CARTO_500 WMTS: capabilities + una tesela real.
  c) Una muestra de CSV de contratos (schema, campos de localización).
  d) Servicio 1923-25 toponímico (ya VERIFIED en P0 — se reusa).

Salida: evidence/g6/orthophotos/probe-geoeuskadi-epochs.json
        evidence/g6/cartography-500/probe.json (+capabilities.xml)
        evidence/g6/contracts/sample.csv + schema.json

Uso:  python pipeline/g6_probe_layers.py
"""

from __future__ import annotations

import io
import json
import math
import struct
import sys
import urllib.request
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
E1 = ROOT / "evidence" / "g6"
UA = {"User-Agent": "mas-joven-que-tu/g6-probe (concurso AppsTAC)"}

# Punto de prueba: centro urbano de Leioa (EPSG:3857)
LON, LAT = -2.9863, 43.3278


def merc_bbox(lon: float, lat: float, half_m: float = 1500.0):
    x = lon * 20037508.34 / 180
    y = math.log(math.tan(math.radians(90 + lat) / 2)) * 20037508.34 / math.pi
    return f"{x - half_m},{y - half_m},{x + half_m},{y + half_m}"


def get(url: str, timeout: int = 45) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def jpeg_unique_colors(raw: bytes, sample: int = 64) -> int | None:
    """Decodifica JPEG/PNG vía Pillow si está; si no, usa tamaño+magic como proxy."""
    try:
        from PIL import Image

        im = Image.open(io.BytesIO(raw)).convert("RGB").resize((sample, sample))
        return len(set(im.getdata()))
    except ImportError:
        # fallback honesto: solo firma + tamaño (no afirma contenido)
        if raw[:2] == b"\xff\xd8" or raw[:4] == b"\x89PNG":
            return -1  # imagen válida, contenido sin verificar
        return None


def probe_wms_layer(layer: str) -> dict:
    url = (
        "https://www.geo.euskadi.eus/WMS_ORTOARGAZKIAK?service=WMS&version=1.3.0"
        f"&request=GetMap&layers={layer}&styles=&crs=EPSG:3857"
        f"&bbox={merc_bbox(LON, LAT)}&width=256&height=256&format=image/jpeg"
    )
    try:
        raw = get(url)
    except Exception as e:
        return {"layer": layer, "error": repr(e)}
    colors = jpeg_unique_colors(raw)
    is_xml = raw.lstrip()[:5] == b"<?xml"
    return {
        "layer": layer,
        "bytes": len(raw),
        "is_xml_error": is_xml,
        "unique_colors_64px": colors,
        "has_content": bool(colors and colors > 1),
        "xml_head": raw[:200].decode("utf-8", "replace") if is_xml else None,
    }


def probe_carto500() -> dict:
    out = {"dir": "evidence/g6/cartography-500"}
    caps_url = (
        "https://geo.bizkaia.eus/arcgisserver/rest/services/ORTOARGAZKIAK/"
        "CARTO_500/MapServer/WMTS/1.0.0/WMTSCapabilities.xml"
    )
    try:
        caps = get(caps_url, 60)
        (E1 / "cartography-500").mkdir(parents=True, exist_ok=True)
        (E1 / "cartography-500" / "wmts-capabilities.xml").write_bytes(caps)
        out["caps_bytes"] = len(caps)
        import re

        txt = caps.decode("utf-8", "replace")
        out["layers"] = re.findall(r"<ows:Identifier>([^<]+)</ows:Identifier>", txt)[:10]
        out["tilematrixsets"] = sorted(set(re.findall(r"<ows:Identifier>([^<]*?)</ows:Identifier>", txt)))
        # una tesela real en GoogleMapsCompatible z16 sobre Leioa
        x = int((LON + 180) / 360 * 2**16)
        y = int(
            (1 - math.log(math.tan(math.radians(LAT)) + 1 / math.cos(math.radians(LAT))) / math.pi)
            / 2
            * 2**16
        )
        tile_url = (
            "https://geo.bizkaia.eus/arcgisserver/rest/services/ORTOARGAZKIAK/"
            f"CARTO_500/MapServer/tile/16/{y}/{x}"
        )
        t = get(tile_url, 45)
        out["tile"] = {
            "url": tile_url,
            "bytes": len(t),
            "unique_colors_64px": jpeg_unique_colors(t),
            "magic": t[:4].hex(),
        }
        (E1 / "cartography-500" / "tile-sample.png").write_bytes(t)
    except Exception as e:
        out["error"] = repr(e)
    return out


def probe_contracts() -> dict:
    """Muestra del último CSV de contratos no menores para auditar el schema."""
    outdir = E1 / "contracts"
    outdir.mkdir(parents=True, exist_ok=True)
    m = json.loads((E1 / "source-discovery" / "source-matrix.json").read_text(encoding="utf-8"))
    pkg = m["datasets"]["contratos-no-menores"]
    urls = [r["url"] for r in pkg["resources"] if r.get("url") and "2025" in (r.get("name") or "")]
    if not urls:
        urls = [r["url"] for r in pkg["resources"] if r.get("url")]
    if not urls:
        return {"error": "sin URLs"}
    url = urls[-1]
    try:
        raw = get(url, 60)
    except Exception as e:
        return {"error": repr(e), "url": url}
    (outdir / "sample-contratos-no-menores.csv").write_bytes(raw[:200_000])
    head = raw[:4000].decode("utf-8", "replace")
    lines = head.splitlines()
    return {
        "url": url,
        "bytes_downloaded": len(raw),
        "header": lines[0] if lines else None,
        "n_first_rows": [l[:300] for l in lines[1:4]],
        "full_bytes_saved": False,
    }


def main() -> int:
    epochs = [
        # candidatos geoEuskadi a huecos de la serie Bizkaia + moderna
        "ORTO_1945_46_AMERICANO",
        "ORTO_1956_57_AMERICANO",
        "ORTO_INTERMINISTERIAL_1977_78",
        "ORTO_1984_85",
        "ORTO_1989",
        "ORTO_1991",
        "ORTO_1995",
        "ORTO_2001",
        "ORTO_2002",
        "ORTO_2004",
        "ORTO_2006",
        "ORTO_2008",
        "ORTO_2010",
        "ORTO_2012",
        "ORTO_2014",
        "ORTO_2016",
        "ORTO_2018",
        "ORTO_2020",
        "ORTO_2022",
        "ORTO_2024",
        "ORTO_2025",
    ]
    results = [probe_wms_layer(l) for l in epochs]
    (E1 / "orthophotos").mkdir(parents=True, exist_ok=True)
    (E1 / "orthophotos" / "probe-geoeuskadi-epochs.json").write_text(
        json.dumps(
            {"probe_point": {"lon": LON, "lat": LAT}, "results": results},
            indent=1,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    for r in results:
        print(f"  {r['layer']:38s} bytes={r.get('bytes','-'):>7} colors={r.get('unique_colors_64px')} err={r.get('is_xml_error')}")

    c500 = probe_carto500()
    (E1 / "cartography-500").mkdir(parents=True, exist_ok=True)
    (E1 / "cartography-500" / "probe.json").write_text(
        json.dumps(c500, indent=1, ensure_ascii=False), encoding="utf-8"
    )
    print("CARTO_500:", json.dumps({k: v for k, v in c500.items() if k != "dir"}, ensure_ascii=False)[:400])

    contracts = probe_contracts()
    (E1 / "contracts" / "schema.json").write_text(
        json.dumps(contracts, indent=1, ensure_ascii=False), encoding="utf-8"
    )
    print("contratos:", json.dumps(contracts, ensure_ascii=False)[:400])
    return 0


if __name__ == "__main__":
    sys.exit(main())
