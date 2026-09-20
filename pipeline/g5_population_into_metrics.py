"""G5 — inyecta población municipal (Eustat) dentro de metrics/<slug>.json.

Motivo: un único dato humano junto al resultado principal sin romper el
contrato de critical path (GP1/GP4): la población viaja dentro del JSON
de métricas que el resultado ya descarga — cero peticiones nuevas.

Entrada:
  app/static/data/eustat-population.json   (snapshot g5_eustat_population.py)
  app/static/data/metrics/<slug>.json      (municipality.codigo_mun corto)

Salida: cada metrics/<slug>.json gana
  constants.population = {"padron": N|null, "period": "2025-01-01",
                          "source": "Eustat — padrón municipal"}

Mapeo: codigo_mun corto (1..98, 901..915) -> clave Eustat 48000+cod.
QA: data/qa/g5_metrics_population.json
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POP = ROOT / "app/static/data/eustat-population.json"
METRICS = ROOT / "app/static/data/metrics"
QA = ROOT / "data/qa/g5_metrics_population.json"


def main() -> int:
    pop = json.loads(POP.read_text(encoding="utf-8"))
    munis = pop["munis"]
    period = pop["padron_period"]
    source = "Eustat — padrón municipal"

    files = sorted(METRICS.glob("*.json"))
    missing, updated = [], 0
    for f in files:
        m = json.loads(f.read_text(encoding="utf-8"))
        cod = int(m["municipality"]["codigo_mun"])
        key = f"{48000 + cod}"
        entry = munis.get(key)
        padron = entry["padron"] if entry else None
        if padron is None:
            missing.append(m["municipality"]["slug"])
        m["constants"]["population"] = {
            "padron": padron,
            "period": period,
            "source": source,
        }
        f.write_text(
            json.dumps(m, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
        updated += 1

    qa = {
        "generated_by": "pipeline/g5_population_into_metrics.py",
        "padron_period": period,
        "metrics_files": len(files),
        "updated": updated,
        "missing_padron": missing,
        "coverage": f"{updated - len(missing)}/{len(files)}",
    }
    QA.write_text(json.dumps(qa, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(qa, ensure_ascii=False))
    return 0 if not missing else 1


if __name__ == "__main__":
    sys.exit(main())
