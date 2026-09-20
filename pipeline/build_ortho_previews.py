"""Genera los previews raster de ortofoto (progressive enhancement, G1-R2).

Para cada campaña del catálogo descarga UNA imagen oficial de la MISMA campaña
a baja resolución cubriendo la extensión real de edificios, y la publica en
``app/static/data/ortho-previews/{year}.jpg`` junto a ``manifest.json``.

Semántica: el preview ES la ortofoto oficial de esa campaña a menor resolución
(no placeholder, no otra fecha). Atribución: misma fuente, CC BY 4.0.

Endpoints (verificados en docs/DATA_SOURCES.md §2):
  - Bizkaia:  ArcGIS MapServer /export (misma imagen que /tile, misma campaña)
  - geoEuskadi: WMS 1.3.0 GetMap EPSG:3857

Uso:
    python pipeline/build_ortho_previews.py            # todas las campañas
    python pipeline/build_ortho_previews.py 1990 1956  # subset
"""
from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app" / "static" / "data" / "ortho-previews"
BUILDINGS = ROOT / "data" / "processed" / "g1" / "buildings" / "*.parquet"

sys.path.insert(0, str(ROOT / "pipeline"))
from metrics import CAMPAIGNS  # noqa: E402

BIZKAIA_SVC = (
    "https://geo.bizkaia.eus/arcgisserverinspire/rest/services/"
    "Kartografia_Cartografia/ORTO_BFA_{year}/MapServer"
)
GEOEUSKADI_WMS = "https://www.geo.euskadi.eus/WMS_ORTOARGAZKIAK"

WIDTH = 1024          # px del lado largo (~112 m/px en Bizkaia)
MIN_UNIQUE_COLORS = 64  # una imagen en blanco/uniforme no es evidencia (spec §3)
TOOL = "pipeline/build_ortho_previews.py v2"
LICENSE = "CC BY 4.0"
ATTRIBUTION = {
    "bizkaia": "Open Data Bizkaia — Diputación Foral de Bizkaia",
    "geoeuskadi": "geoEuskadi — Gobierno Vasco",
}


def buildings_bbox_4326() -> tuple[float, float, float, float]:
    """Extent real del parque edificado (EPSG:4326) — fuente de verdad."""
    import duckdb

    con = duckdb.connect()
    con.execute("INSTALL spatial; LOAD spatial;")
    x0, y0, x1, y1 = con.execute(
        "SELECT min(st_xmin(geom)), min(st_ymin(geom)), "
        "max(st_xmax(geom)), max(st_ymax(geom)) "
        f"FROM '{BUILDINGS.as_posix()}'"
    ).fetchone()
    return x0, y0, x1, y1


def to_3857(lon: float, lat: float) -> tuple[float, float]:
    import math

    return (
        lon * 20037508.34 / 180,
        math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) * 6378137,
    )


def download(url: str) -> bytes:
    req = Request(url, headers={"User-Agent": "mas-joven-que-tu/g1-previews"})
    with urlopen(req, timeout=120) as r:
        if r.status != 200:
            raise RuntimeError(f"HTTP {r.status}: {url}")
        body = r.read()
    if not body[:2] == b"\xff\xd8":  # JPEG magic; un 200 XML no es imagen
        raise RuntimeError(f"respuesta no-JPEG: {url} -> {body[:80]!r}")
    return body


def unique_colors_sample(path: Path, sample: int = 4096) -> int:
    """Cuenta aproximada de colores únicos (PIL). Verifica contenido real."""
    from PIL import Image

    im = Image.open(path).convert("RGB").resize((64, 64))
    return len(set(im.getdata()))


# Tono neutro para no-data (== --noyear del frontend): fuera de cobertura no
# es imagen negra ni error de carga; se presenta como «sin cobertura».
NODATA_FILL = (226, 222, 212)
NODATA_LUMA_MAX = 24  # píxel casi negro puro (el negro 0,0,0 queda difuminado por JPEG)


def neutralize_nodata(body: bytes, out: Path) -> int:
    """Sustituye el negro de no-data pegado al borde por un tono neutro.

    Los export de ArcGIS/WMS con ``transparent=false`` hornean las zonas sin
    cobertura como negro puro; en pantalla parecen un tile fallido. Solo se
    retoca el negro conectado con el borde de la imagen (flood fill): rasgos
    oscuros reales del interior (bosques, sombras, mar dentro de cobertura)
    no se tocan. Es una decisión de presentación del preview, no del dato.
    """
    import io
    from collections import deque
    from PIL import Image

    im = Image.open(io.BytesIO(body)).convert("RGB")
    w, h = im.size
    g = im.convert("L")
    try:
        gray = list(g.get_flattened_data())
    except AttributeError:
        gray = list(g.getdata())
    seen = bytearray(w * h)
    q: deque[int] = deque()
    for x in range(w):
        for y in (0, h - 1):
            i = y * w + x
            if gray[i] < NODATA_LUMA_MAX:
                seen[i] = 1
                q.append(i)
    for y in range(h):
        for x in (0, w - 1):
            i = y * w + x
            if gray[i] < NODATA_LUMA_MAX and not seen[i]:
                seen[i] = 1
                q.append(i)
    while q:
        i = q.popleft()
        x, y = i % w, i // w
        for ni in (i - 1, i + 1, i - w, i + w):
            if ni < 0 or ni >= w * h or seen[ni] or gray[ni] >= NODATA_LUMA_MAX:
                continue
            nx, ny = ni % w, ni // w
            if abs(nx - x) + abs(ny - y) != 1:
                continue  # wrap-around de fila
            seen[ni] = 1
            q.append(ni)
    px = im.load()
    changed = 0
    for i in range(w * h):
        if seen[i]:
            px[i % w, i // w] = NODATA_FILL
            changed += 1
    if changed:
        im.save(out, "JPEG", quality=85)
    return changed


def main() -> int:
    only = {int(a) for a in sys.argv[1:]} or None
    OUT.mkdir(parents=True, exist_ok=True)

    lon0, lat0, lon1, lat1 = buildings_bbox_4326()
    x0, y0 = to_3857(lon0, lat0)
    x1, y1 = to_3857(lon1, lat1)
    aspect = (y1 - y0) / (x1 - x0)
    height = round(WIDTH * aspect)
    print(f"bbox4326=({lon0:.6f},{lat0:.6f},{lon1:.6f},{lat1:.6f}) "
          f"bbox3857=({x0:.1f},{y0:.1f},{x1:.1f},{y1:.1f}) size={WIDTH}x{height}")

    manifest = {
        "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "tool": TOOL,
        "license": LICENSE,
        "semantics": "Preview raster derivado de la MISMA ortofoto oficial "
                     "a menor resolucion. No es placeholder ni otra campana. "
                     "El negro de no-data pegado al borde se presenta en tono "
                     "neutro (#e2ded4): fuera de cobertura no es imagen "
                     "(decision de presentacion, no altera el dato).",
        "bbox_epsg4326": [lon0, lat0, lon1, lat1],
        "bbox_epsg3857": [x0, y0, x1, y1],
        "previews": [],
    }

    for c in CAMPAIGNS:
        if only and c.year not in only:
            continue
        if c.source == "bizkaia":
            svc = BIZKAIA_SVC.format(year=c.year)
            url = (f"{svc}/export?bbox={x0},{y0},{x1},{y1}&bboxSR=3857&imageSR=3857"
                   f"&size={WIDTH},{height}&format=jpg&transparent=false&f=image")
            resource = f"{svc}/export"
        else:
            layer = c.layer or f"ORTO_{c.year}"
            url = (f"{GEOEUSKADI_WMS}?service=WMS&version=1.3.0&request=GetMap"
                   f"&layers={layer}&styles=&crs=EPSG:3857"
                   f"&bbox={x0},{y0},{x1},{y1}&width={WIDTH}&height={height}"
                   "&format=image/jpeg")
            resource = f"{GEOEUSKADI_WMS} layer={layer}"

        body = download(url)
        fn = OUT / f"{c.year}.jpg"
        if not neutralize_nodata(body, fn):
            fn.write_bytes(body)
        body = fn.read_bytes()  # el sha/bytes del manifiesto son del fichero servido
        colors = unique_colors_sample(fn)
        if colors < MIN_UNIQUE_COLORS:
            raise RuntimeError(f"{c.year}: preview casi uniforme ({colors} colores)")
        entry = {
            "campaign_year": c.year,
            "source": c.source,
            "file": f"{c.year}.jpg",
            "url": f"data/ortho-previews/{c.year}.jpg",
            "resource": resource,
            "width": WIDTH, "height": height,
            "format": "jpeg",
            "bytes": len(body),
            "sha256": sha,
            "retrieved_at_utc": manifest["generated_at_utc"],
            "license": LICENSE,
            "attribution": f"{ATTRIBUTION[c.source]} · Campaña {c.year} · {LICENSE}",
            "unique_colors_sample": colors,
        }
        manifest["previews"].append(entry)
        print(f"  {c.year}: {len(body)} B sha256={sha[:12]}… colors={colors}")

    # En ejecuciones subset, conserva las entradas previas de otras campañas
    # (el manifest debe cubrir SIEMPRE todo el catálogo — test G1-R2).
    man_path = OUT / "manifest.json"
    if only and man_path.exists():
        prev = json.loads(man_path.read_text(encoding="utf-8")).get("previews", [])
        done = {p["campaign_year"] for p in manifest["previews"]}
        manifest["previews"] += [p for p in prev if p["campaign_year"] not in done]
        manifest["previews"].sort(key=lambda p: p["campaign_year"])
    man_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"manifest -> {OUT / 'manifest.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
