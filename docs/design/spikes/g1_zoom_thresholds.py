"""G1 design spike (NO productivo, read-only) — umbrales de zoom multiescala.

Mide, en los PMTiles de G0, cuántas features entrega cada nivel por tesela y
a qué zoom deja de ser legible el agregado frente al edificio individual.
"""
from __future__ import annotations

import gzip
import math
from pathlib import Path

import mapbox_vector_tile
from pmtiles.reader import MmapSource, Reader

DATA = Path("app/static/data")
PLACES = {"Bilbao": (-2.9370, 43.2670), "Leioa": (-2.9863, 43.3278), "Murueta": (-2.6872, 43.3560)}


def xy(lon: float, lat: float, z: int) -> tuple[int, int]:
    n = 2 ** z
    x = int((lon + 180) / 360 * n)
    y = int((1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n)
    return x, y


def decode(path: Path, z: int, x: int, y: int) -> dict[str, int]:
    with path.open("rb") as f:
        r = Reader(MmapSource(f))
        t = r.get(z, x, y)
        if not t:
            return {}
        try:
            t = gzip.decompress(t)
        except OSError:
            pass
        d = mapbox_vector_tile.decode(t)
        return {k: len(v["features"]) for k, v in d.items()}


def main() -> None:
    for layer, zs in (("buildings", range(10, 17)), ("cells", range(8, 14)), ("municipalities", range(0, 10))):
        p = DATA / f"{layer}.pmtiles"
        if not p.exists():
            print(f"{layer}: no existe"); continue
        print(f"\n### {layer}.pmtiles")
        for z in zs:
            counts = []
            for name, (lon, lat) in PLACES.items():
                x, y = xy(lon, lat, z)
                c = decode(p, z, x, y)
                counts.append(c.get(layer, 0))
            avg = sum(counts) / len(counts)
            print(f"  z{z:>2}: features por tesela (Bilbao/Leioa/Murueta) = {counts}  media={avg:.0f}")


if __name__ == "__main__":
    main()
