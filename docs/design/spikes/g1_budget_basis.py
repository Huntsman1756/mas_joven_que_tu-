"""G1 design spike (NO productivo, read-only) — base empírica de los budgets.

Mide:
  1. tamaño (raw/gzip) de los assets de build del slice G0;
  2. coste real de un primer encuadre sobre PMTiles con HTTP Range:
     cabecera + directorio + las teselas visibles de un viewport típico.
"""
from __future__ import annotations

import gzip
import json
import math
from pathlib import Path

from pmtiles.reader import MmapSource, Reader

BUILD = Path("app/build")
DATA = Path("app/static/data")


def walk(p: Path):
    for e in sorted(p.iterdir()):
        if e.is_dir():
            yield from walk(e)
        else:
            yield e


def bytes_all(p: Path) -> tuple[int, int]:
    raw = gz = 0
    for f in walk(p):
        if f.suffix in (".js", ".css", ".html", ".json", ".svg"):
            b = f.read_bytes()
            raw += len(b)
            gz += len(gzip.compress(b, 9))
    return raw, gz


def main() -> None:
    print("### assets de build (raw / gzip)")
    total_raw = total_gz = 0
    for sub in ["_app/immutable", "data"]:
        p = BUILD / sub
        if not p.exists():
            continue
        raw, gz = bytes_all(p)
        total_raw += raw
        total_gz += gz
        print(f"  {sub:22} raw={raw:>9,} B  gzip={gz:>9,} B")
    js_html = BUILD / "index.html"
    if js_html.exists():
        b = js_html.read_bytes()
        print(f"  index.html             raw={len(b):>9,} B  gzip={len(gzip.compress(b,9)):>9,} B")
    print(f"  TOTAL                  raw={total_raw:>9,} B  gzip={total_gz:>9,} B")

    print("\n### PMTiles: coste de un primer encuadre (HTTP Range)")
    for name, z, tiles_w, tiles_h in (("cells", 12, 6, 4), ("buildings", 14, 6, 4)):
        p = DATA / f"{name}.pmtiles"
        if not p.exists():
            print(f"  {name}: no existe")
            continue
        size = p.stat().st_size
        with p.open("rb") as f:
            r = Reader(MmapSource(f))
            r.header()
            # directorio: se obtiene implícitamente al pedir la primera tesela
            lon, lat = -2.9370, 43.2670
            zz = z
            n = 2 ** zz
            x0 = int((lon + 180) / 360 * n) - tiles_w // 2
            y0 = int((1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n) - tiles_h // 2
            got = 0
            nbytes = 0
            for dx in range(tiles_w):
                for dy in range(tiles_h):
                    t = r.get(zz, x0 + dx, y0 + dy)
                    if t:
                        got += 1
                        nbytes += len(t)
            print(f"  {name}: fichero={size:,} B · teselas z{z} visibles {got}/{tiles_w*tiles_h} "
                  f"· bytes de teselas={nbytes:,} B ({100*nbytes/size:.1f} % del fichero)")

    print("\n### campañas disponibles en el catálogo")
    m = json.loads((DATA / "metrics_054.json").read_text(encoding="utf-8"))
    for c in m["campaigns"]:
        print(f"  {c['year']} · {c['source']} · vuelo={c['flight_range']}")


if __name__ == "__main__":
    main()
