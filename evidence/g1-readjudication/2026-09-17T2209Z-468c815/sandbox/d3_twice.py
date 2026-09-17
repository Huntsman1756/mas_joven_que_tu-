"""G1 READJUDICATION — D3: regenera agregados dos veces y compara sha256.
Corre `pipeline/g1_buildings.py` dos veces; compara outputs canonicos:
metrics/*.json (112), cells/*.json (112), catalog.json, geojson, parquet.
municipalities.json se compara sin `generated_at_utc` (timestamp de emision).
"""
import hashlib, json, subprocess, sys
from pathlib import Path

ROOT = Path(r"F:\_CONCURSOS\mas_joven_que_tu")
OUT = ROOT / "evidence/g1-readjudication/2026-09-17T2209Z-468c815/data"

def h(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()

def snapshot(tag: str) -> dict:
    s = {"tag": tag, "files": {}}
    for pat in [
        ("app/static/data/metrics", "*.json"),
        ("app/static/data/cells", "*.json"),
        ("data/processed/g1/geojson", "*.geojson"),
        ("data/processed/g1/geojson/buildings", "*.geojson"),
        ("data/processed/g1/buildings", "*.parquet"),
    ]:
        d = ROOT / pat[0]
        for p in sorted(d.glob(pat[1])):
            s["files"][str(p.relative_to(ROOT)).replace("\\", "/")] = h(p)
    for name in ["catalog.json", "municipalities.json", "municipalities-light.geojson", "cells.pmtiles", "municipalities.pmtiles"]:
        p = ROOT / "app/static/data" / name
        s["files"][f"app/static/data/{name}"] = h(p)
    # municipalities.json sin timestamp
    mj = json.loads((ROOT / "app/static/data/municipalities.json").read_text(encoding="utf-8"))
    mj.pop("generated_at_utc", None)
    s["files"]["app/static/data/municipalities.json#no-ts"] = hashlib.sha256(
        json.dumps(mj, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()
    return s

def run_pipeline(tag: str):
    print(f"== pipeline run {tag} ==", flush=True)
    r = subprocess.run(
        [sys.executable, str(ROOT / "pipeline/g1_buildings.py")],
        cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    (OUT / f"pipeline-{tag}.log").write_text((r.stdout or "") + "\n--- STDERR ---\n" + (r.stderr or ""), encoding="utf-8")
    print(f"  exit={r.returncode} tail={(r.stdout or '').splitlines()[-3:]}", flush=True)
    return r.returncode

OUT.mkdir(parents=True, exist_ok=True)
rc1 = run_pipeline("run1")
s1 = snapshot("run1")
rc2 = run_pipeline("run2")
s2 = snapshot("run2")

diff = {k: (s1["files"].get(k), s2["files"].get(k)) for k in set(s1["files"]) | set(s2["files"]) if s1["files"].get(k) != s2["files"].get(k)}
result = {
    "meta": {"candidate": "468c815", "method": "g1_buildings.py x2, sha256 compare; municipalities.json compared without generated_at_utc"},
    "run1_exit": rc1, "run2_exit": rc2,
    "n_files_compared": len(set(s1["files"]) | set(s2["files"])),
    "n_diff": len(diff),
    "diff": diff,
    "hashes_run1": s1["files"], "hashes_run2": s2["files"],
}
(OUT / "d3-determinism.json").write_text(json.dumps(result, indent=1), encoding="utf-8")
print(json.dumps({k: result[k] for k in ("run1_exit", "run2_exit", "n_files_compared", "n_diff")}, indent=1))
print("DIFF:", json.dumps(diff, indent=1)[:2000])
