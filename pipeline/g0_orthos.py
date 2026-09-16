"""G0 — verificación en vivo de ortofotos (Bizkaia histórica + geoEuskadi moderna).

Clasifica cada respuesta con detectores explícitos:
    IMAGE_OK | SERVICE_EXCEPTION | BLANK_IMAGE | HTTP_ERROR

No basta HTTP 200: un WMS puede devolver 200 + XML de error, o una imagen blanca.

Salida: evidence/g0/05-orthos/orthos-live.json
Uso: python pipeline/g0_orthos.py
"""
from __future__ import annotations

import io
import json
import math
import statistics
import sys
import time
from pathlib import Path

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "evidence/g0/05-orthos/orthos-live.json"
UA = {"User-Agent": "Mozilla/5.0 (compatible; mas-joven-que-tu G0)", "Origin": "https://example.invalid"}
HW = 20037508.34

PLACES = {
    "Bilbao": (-2.9370, 43.2670),
    "Leioa": (-2.9863, 43.3278),
    "Murueta": (-2.6872, 43.3560),
}

BIZKAIA_YEARS = [1956, 1965, 1970, 1975, 1983, 1990, 1995, 1999, 2002]
GEOEUSKADI_LAYERS = ["ORTO_2025", "ORTO_2020", "ORTO_2015", "ORTO_2010", "ORTO_2005"]


def merc(lon: float, lat: float) -> tuple[float, float]:
    x = (lon + 180) / 360 * (2 * HW) - HW
    y = HW * math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi
    return x, y


def classify(content: bytes, content_type: str, status: int) -> dict:
    if status != 200:
        return {"result": "HTTP_ERROR", "detail": f"status={status}"}
    ct = (content_type or "").lower()
    head = content[:200].lstrip()
    if "xml" in ct or head.startswith(b"<?xml") or b"ServiceException" in content[:2000]:
        return {"result": "SERVICE_EXCEPTION", "detail": "WMS returned an XML error body with HTTP 200"}
    if "image" not in ct:
        return {"result": "HTTP_ERROR", "detail": f"unexpected content-type {ct}"}
    try:
        im = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception as exc:  # noqa: BLE001
        return {"result": "HTTP_ERROR", "detail": f"undecodable image: {exc}"}
    colors = len(set(im.getdata()))
    if colors <= 2:
        return {"result": "BLANK_IMAGE", "detail": f"size={im.size} unique_colors={colors}"}
    return {"result": "IMAGE_OK", "detail": f"size={im.size} unique_colors={colors}"}


def fetch(url: str, timeout: int = 120) -> tuple[bytes, str, int, float]:
    t0 = time.perf_counter()
    r = requests.get(url, headers=UA, timeout=timeout, verify=False)
    dt = time.perf_counter() - t0
    return r.content, r.headers.get("content-type", ""), r.status_code, dt


def bizkaia_tile_url(year: int, lon: float, lat: float, z: int = 15) -> str:
    n = 2 ** z
    x = int((lon + 180) / 360 * n)
    y = int((1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n)
    return (f"https://geo.bizkaia.eus/arcgisserverinspire/rest/services/Kartografia_Cartografia/"
            f"ORTO_BFA_{year}/MapServer/tile/{z}/{y}/{x}")


def geo_wms_url(layer: str, lon: float, lat: float, half: int = 500, size: int = 256) -> str:
    x, y = merc(lon, lat)
    return (f"https://www.geo.euskadi.eus/WMS_ORTOARGAZKIAK?service=WMS&version=1.3.0&request=GetMap"
            f"&layers={layer}&styles=&crs=EPSG:3857"
            f"&bbox={x-half:.2f},{y-half:.2f},{x+half:.2f},{y+half:.2f}"
            f"&width={size}&height={size}&format=image/jpeg")


def main() -> int:
    results = {"bizkaia_tiles": [], "geoeuskadi_wms": [], "failure_modes": [], "latency": {}}

    print("### Bizkaia cached tiles (1956..2002)")
    for year in BIZKAIA_YEARS:
        for place, (lon, lat) in PLACES.items():
            url = bizkaia_tile_url(year, lon, lat)
            try:
                content, ct, status, dt = fetch(url)
                c = classify(content, ct, status)
            except Exception as exc:  # noqa: BLE001
                content, ct, status, dt = b"", "", -1, 0.0
                c = {"result": "HTTP_ERROR", "detail": f"{type(exc).__name__}: {exc}"[:150]}
            results["bizkaia_tiles"].append({
                "year": year, "place": place, "url": url, "bytes": len(content),
                "content_type": ct, "seconds": round(dt, 3), **c,
            })
        ok = [r for r in results["bizkaia_tiles"] if r["year"] == year]
        print(f"  {year}: " + ", ".join(f"{r['place']}={r['result']}({r['bytes']}B)" for r in ok))

    print("### geoEuskadi WMS (modern)")
    for layer in GEOEUSKADI_LAYERS:
        for place, (lon, lat) in PLACES.items():
            url = geo_wms_url(layer, lon, lat)
            try:
                content, ct, status, dt = fetch(url)
                c = classify(content, ct, status)
            except Exception as exc:  # noqa: BLE001
                content, ct, status, dt = b"", "", -1, 0.0
                c = {"result": "HTTP_ERROR", "detail": f"{type(exc).__name__}: {exc}"[:150]}
            results["geoeuskadi_wms"].append({
                "layer": layer, "place": place, "url": url[:200], "bytes": len(content),
                "content_type": ct, "seconds": round(dt, 3), **c,
            })
        rows = [r for r in results["geoeuskadi_wms"] if r["layer"] == layer]
        print(f"  {layer}: " + ", ".join(f"{r['place']}={r['result']}" for r in rows))

    print("### failure modes")
    lon, lat = PLACES["Bilbao"]
    for label, url in [
        ("bogus_layer", geo_wms_url("ORTO_NOEXISTE", lon, lat)),
        ("bad_bbox_crs", (f"https://www.geo.euskadi.eus/WMS_ORTOARGAZKIAK?service=WMS&version=1.3.0"
                          f"&request=GetMap&layers=ORTO_2025&styles=&crs=EPSG:3857"
                          f"&bbox=0,0,1000,1000&width=256&height=256&format=image/jpeg")),
    ]:
        try:
            content, ct, status, dt = fetch(url)
            c = classify(content, ct, status)
        except Exception as exc:  # noqa: BLE001
            content, ct, status, dt = b"", "", -1, 0.0
            c = {"result": "HTTP_ERROR", "detail": f"{type(exc).__name__}: {exc}"[:150]}
        results["failure_modes"].append({"case": label, "url": url[:200], "bytes": len(content),
                                         "content_type": ct, **c})
        print(f"  {label}: {c['result']} ({c['detail']})")

    print("### latency (warm, ORTO_2025, 256px x6)")
    url = geo_wms_url("ORTO_2025", lon, lat)
    ts = []
    for _ in range(6):
        _, _, _, dt = fetch(url)
        ts.append(dt)
    results["latency"]["geoeuskadi_wms_256_seconds"] = [round(t, 3) for t in ts]
    results["latency"]["geoeuskadi_wms_256_median"] = round(statistics.median(ts), 3)
    print(f"  {results['latency']['geoeuskadi_wms_256_seconds']} median={results['latency']['geoeuskadi_wms_256_median']}")

    url = bizkaia_tile_url(1983, lon, lat)
    ts = []
    for _ in range(6):
        _, _, _, dt = fetch(url)
        ts.append(dt)
    results["latency"]["bizkaia_tile_256_seconds"] = [round(t, 3) for t in ts]
    results["latency"]["bizkaia_tile_256_median"] = round(statistics.median(ts), 3)
    print(f"  bizkaia 1983: {results['latency']['bizkaia_tile_256_seconds']} "
          f"median={results['latency']['bizkaia_tile_256_median']}")

    ok = sum(1 for r in results["bizkaia_tiles"] + results["geoeuskadi_wms"] if r["result"] == "IMAGE_OK")
    tot = len(results["bizkaia_tiles"]) + len(results["geoeuskadi_wms"])
    results["summary"] = {"image_ok": ok, "total": tot,
                          "not_ok": [r for r in results["bizkaia_tiles"] + results["geoeuskadi_wms"]
                                     if r["result"] != "IMAGE_OK"]}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nIMAGE_OK {ok}/{tot}  -> {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
