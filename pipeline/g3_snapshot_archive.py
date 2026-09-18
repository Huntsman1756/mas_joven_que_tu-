"""G3 — archivo reproducible de snapshots Catastro ODB.

Los recursos ODB se sobrescriben en cada actualización: NO hay histórico
público. Este script captura un manifest por fecha (URL + Last-Modified +
Content-Length + ETag por municipio) para detectar la próxima publicación
y construir diffs APPEARED/DISAPPEARED/ATTRIBUTE_CHANGED/GEOMETRY_CHANGED.

Uso: python pipeline/g3_snapshot_archive.py          # manifest ligero
     python pipeline/g3_snapshot_archive.py --fetch  # descarga zips
"""
import argparse
import hashlib
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from net import http_get  # noqa: E402

IDX = "https://opengis.bizkaia.eus/Planificacion%20territorial%20y%20catastro/Catastro/Open%20Data/"
OUT = Path("data/snapshots")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    r = http_get(IDX, timeout=60)
    rows = re.findall(r'href="(\d+_[A-Z\u00d1_]+_(?:GML|SHP)\.zip)"[^<]*</a>\s*([\d\-: ]+)', r.text)
    files = []
    for fn, mdate in rows:
        u = IDX + fn
        h = http_get(u, method="HEAD", timeout=30) if args.fetch else None
        files.append({"file": fn, "listing_date": mdate.strip(),
                      "url": u,
                      "etag": h.headers.get("ETag") if h is not None else None,
                      "length": h.headers.get("Content-Length") if h is not None else None})
    snap = {"captured_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "source_index": IDX, "n_files": len(files),
            "digest": hashlib.sha256(
                json.dumps([(f["file"], f["listing_date"]) for f in files]).encode()
            ).hexdigest(),
            "files": files}
    day = time.strftime("%Y%m%d")
    p = OUT / f"catastro_manifest_{day}.json"
    p.write_text(json.dumps(snap, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{p} — {len(files)} files, digest {snap['digest'][:12]}")
    if args.fetch:
        for f in files:
            tgt = OUT / day / f["file"]
            tgt.parent.mkdir(parents=True, exist_ok=True)
            if not tgt.exists():
                tgt.write_bytes(http_get(f["url"], timeout=300).content)


if __name__ == "__main__":
    main()
