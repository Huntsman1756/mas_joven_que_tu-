"""Renderiza los wireframes SVG a PNG para revisión visual.

NO modifica los SVG originales. Usa el Chrome instalado en modo headless.
Se ejecuta desde la raíz del repositorio:

    python docs/design/review-render/render-svg.py

Salida: docs/design/review-render/<nombre>.png (mismo tamaño que el SVG)
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SVG_DIR = ROOT / "docs/design/wireframes"
OUT_DIR = ROOT / "docs/design/review-render"

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]


def find_browser() -> str:
    for c in CHROME_CANDIDATES:
        if Path(c).exists():
            return c
    raise SystemExit("No se encontró Chrome ni Edge en las rutas habituales.")


def svg_size(svg: Path) -> tuple[int, int]:
    head = svg.read_text(encoding="utf-8")[:600]
    w = re.search(r'width="(\d+)"', head)
    h = re.search(r'height="(\d+)"', head)
    if not w or not h:
        raise SystemExit(f"Sin width/height en {svg.name}")
    return int(w.group(1)), int(h.group(1))


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main() -> int:
    browser = find_browser()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    for svg in sorted(SVG_DIR.glob("*.svg")):
        w, h = svg_size(svg)
        png = OUT_DIR / f"{svg.stem}.png"
        if png.exists():
            png.unlink()
        url = svg.resolve().as_uri()
        cmd = [
            browser, "--headless=new", "--disable-gpu", "--hide-scrollbars",
            "--force-device-scale-factor=1", "--default-background-color=00000000",
            f"--window-size={w},{h}", f"--screenshot={png}", url,
        ]
        subprocess.run(cmd, capture_output=True, timeout=180)
        if not png.exists():
            print(f"FAIL {svg.name}")
            return 1
        rows.append({
            "svg": svg.name, "png": png.name,
            "size": f"{w}x{h}",
            "svg_bytes": svg.stat().st_size, "svg_sha256": sha256(svg),
            "png_bytes": png.stat().st_size, "png_sha256": sha256(png),
        })
        print(f"OK {svg.name} -> {png.name}  ({png.stat().st_size:,} B)")
    (OUT_DIR / "render-manifest.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
