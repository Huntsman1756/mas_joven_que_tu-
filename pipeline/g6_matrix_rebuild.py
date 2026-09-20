"""Regenera source-matrix.json desde evidence/g6/source-discovery/raw/*.json
sin re-descargar (los package_show crudos ya están en disco)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from g6_source_discovery import OUT, RAW, summarize_package  # noqa: E402


def main() -> int:
    packages = {}
    for f in sorted(RAW.glob("ckan-package-*.json")):
        pkg = json.loads(f.read_text(encoding="utf-8"))
        packages[pkg["name"]] = summarize_package(pkg)
    m = json.loads((OUT / "source-matrix.json").read_text(encoding="utf-8"))
    m["datasets"] = packages
    (OUT / "source-matrix.json").write_text(
        json.dumps(m, indent=1, ensure_ascii=False), encoding="utf-8"
    )
    print(f"matriz regenerada: {len(packages)} datasets")
    return 0


if __name__ == "__main__":
    sys.exit(main())
