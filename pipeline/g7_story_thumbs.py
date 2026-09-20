"""G7 — miniaturas editoriales reales para «Cinco lugares de Bizkaia».

Para cada historia congelada (``app/src/lib/domain/stories.ts``, fuente de
verdad de cámara y campaña) descarga UNA imagen oficial de su campaña
``air.c1`` centrada en la cámara del capítulo y la publica en
``app/static/data/story-thumbs/{id}.jpg`` junto a ``manifest.json``.

Semántica: la miniatura ES la ortofoto oficial de esa campaña en ese lugar.
Atribución: misma fuente, CC BY 4.0.

Endpoints (mismos que build_ortho_previews.py, verificados en
docs/DATA_SOURCES.md §2):
  - Bizkaia:  ArcGIS MapServer /export
  - geoEuskadi: WMS 1.3.0 GetMap EPSG:3857

Uso:
    python pipeline/g7_story_thumbs.py
"""
from __future__ import annotations

import hashlib
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app" / "static" / "data" / "story-thumbs"

sys.path.insert(0, str(ROOT / "pipeline"))
from metrics import CAMPAIGNS  # noqa: E402

# Espejo de STORIES (stories.ts): id → (lon, lat, campaña air.c1).
# Si stories.ts cambia, esta tabla debe actualizarse a la vez.
STORIES = {
    "c2803": (-3.0154, 43.3146, 1956),
    "f4036": (-2.8427, 43.3280, 1970),
    "f4233": (-3.1141, 43.3280, 1970),
    "f4738": (-3.0586, 43.3416, 1990),
    "f149": (-3.0648, 43.3281, 2002),
}

BIZKAIA_SVC = (
    "https://geo.bizkaia.eus/arcgisserverinspire/rest/services/"
    "Kartografia_Cartografia/ORTO_BFA_{year}/MapServer"
)
GEOEUSKADI_WMS = "https://www.geo.euskadi.eus/WMS_ORTOARGAZKIAK"

WIDTH, HEIGHT = 640, 400      # px — miniatura 3:2
HALF_SPAN_M = 900             # media anchura del encuadre (~1,8 km de vista)
MIN_UNIQUE_COLORS = 64        # una imagen uniforme no es evidencia
LICENSE = "CC BY 4.0"
ATTRIBUTION = {
    "bizkaia": "Open Data Bizkaia — Diputación Foral de Bizkaia",
    "geoeuskadi": "geoEuskadi — Gobierno Vasco",
}
TOOL = "pipeline/g7_story_thumbs.py v1"


def to_3857(lon: float, lat: float) -> tuple[float, float]:
    return (
        lon * 20037508.34 / 180,
        math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) * 6378137,
    )


def download(url: str) -> bytes:
    req = Request(url, headers={"User-Agent": "mas-joven-que-tu/g7-thumbs"})
    with urlopen(req, timeout=120) as r:
        if r.status != 200:
            raise RuntimeError(f"HTTP {r.status}: {url}")
        body = r.read()
    if not body[:2] == b"\xff\xd8":
        raise RuntimeError(f"respuesta no-JPEG: {url} -> {body[:80]!r}")
    return body


def unique_colors_sample(path: Path) -> int:
    from PIL import Image

    im = Image.open(path).convert("RGB").resize((64, 64))
    return len(set(im.getdata()))


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    by_year = {c.year: c for c in CAMPAIGNS}
    manifest = {
        "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "tool": TOOL,
        "license": LICENSE,
        "semantics": "Recorte de la ortofoto oficial de la campana air.c1 de "
                     "cada historia, centrado en su camara congelada. No es "
                     "placeholder ni otra fecha.",
        "size_px": [WIDTH, HEIGHT],
        "thumbs": [],
    }

    for sid, (lon, lat, year) in STORIES.items():
        c = by_year.get(year)
        if c is None:
            raise RuntimeError(f"{sid}: campaña {year} no está en CAMPAIGNS")
        cx, cy = to_3857(lon, lat)
        span_y = HALF_SPAN_M * (HEIGHT / WIDTH)
        bbox = (cx - HALF_SPAN_M, cy - span_y, cx + HALF_SPAN_M, cy + span_y)
        x0, y0, x1, y1 = (f"{v:.2f}" for v in bbox)

        if c.source == "bizkaia":
            svc = BIZKAIA_SVC.format(year=c.year)
            url = (f"{svc}/export?bbox={x0},{y0},{x1},{y1}&bboxSR=3857&imageSR=3857"
                   f"&size={WIDTH},{HEIGHT}&format=jpg&transparent=false&f=image")
            resource = f"{svc}/export bbox={x0},{y0},{x1},{y1}"
        else:
            layer = c.layer or f"ORTO_{c.year}"
            url = (f"{GEOEUSKADI_WMS}?service=WMS&version=1.3.0&request=GetMap"
                   f"&layers={layer}&styles=&crs=EPSG:3857"
                   f"&bbox={x0},{y0},{x1},{y1}&width={WIDTH}&height={HEIGHT}"
                   "&format=image/jpeg")
            resource = f"{GEOEUSKADI_WMS} layer={layer} bbox={x0},{y0},{x1},{y1}"

        body = download(url)
        fn = OUT / f"{sid}.jpg"
        fn.write_bytes(body)
        colors = unique_colors_sample(fn)
        if colors < MIN_UNIQUE_COLORS:
            raise RuntimeError(f"{sid}: miniatura casi uniforme ({colors} colores)")
        manifest["thumbs"].append({
            "story": sid,
            "campaign_year": year,
            "source": c.source,
            "center_epsg4326": [lon, lat],
            "file": f"{sid}.jpg",
            "url": f"data/story-thumbs/{sid}.jpg",
            "resource": resource,
            "width": WIDTH,
            "height": HEIGHT,
            "bytes": len(body),
            "sha256": hashlib.sha256(body).hexdigest(),
            "retrieved_at_utc": manifest["generated_at_utc"],
            "license": LICENSE,
            "attribution": f"{ATTRIBUTION[c.source]} · Campaña {year} · CC BY 4.0",
            "unique_colors_sample": colors,
        })
        print(f"OK {sid} campania {year} ({c.source}) {len(body)} B, {colors} colores")

    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(f"manifest -> {OUT / 'manifest.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
