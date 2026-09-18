"""G3 spike — resolución de dirección exacta vía NORA (geoEuskadi).

Cadena verificada (spec sidl/rest/nora.json):
  calles?descCalle=..&descMunicipio=..
    -> calle/{id}/portales?portalNum=N
    -> portal/{id}/edificios -> edificios/{id}?withParents=true
  reverse: portales/cercano?x&y&crs

Mide: resolución, ambigüedad, no-match, latencia. Interno, evidencia g3.
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from net import http_get  # noqa: E402

BASE = "https://www.geo.euskadi.eus/t17iApiRestWar/rest/v1/"
OUT = Path("evidence/g3/address")
OUT.mkdir(parents=True, exist_ok=True)


def norm(s):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", s or "")
                   if unicodedata.category(c) != "Mn").lower().strip()

# Muestra estratificada: gran ciudad, margen izquierda, interior, rural, euskera, ambigua
QUERIES = [
    ("Bilbao", "Gran Via Don Diego Lopez de Haro", "1"),
    ("Bilbao", "Ercilla", "21"),
    ("Leioa", "Elexalde", "1"),
    ("Getxo", "Mayor", "10"),
    ("Mungia", "Itsasbide", "2"),
    ("Muskiz", "San Julian", "5"),
    ("Santurtzi", "Mariana Pineda", "3"),
    ("Portugalete", "Maria Diaz de Haro", "12"),
    ("Abanto-Zierbena", "Gallarta", "1"),  # localidad ambigua (Gallarta es localidad)
    ("Karrantza Harana", "Concha", "1"),   # rural
    ("Gernika-Lumo", "Foru", "1"),         # euskera
    ("Durango", "Kurutziaga", "4"),
    ("Amorebieta-Etxano", "Zelai Haundi", "1"),
    ("Balmaseda", "Korujo", "2"),
]


def t(f, *a, **k):
    s = time.perf_counter()
    try:
        r = f(*a, **k)
        return r, round((time.perf_counter() - s) * 1000)
    except Exception as e:
        return e, round((time.perf_counter() - s) * 1000)


def resolve(muni, street, num):
    out = {"muni": muni, "street": street, "num": num, "steps": {}}
    # 1. calles
    r, ms = t(http_get, BASE + "calles",
              params={"descCalle": street, "descMunicipio": muni, "withParents": "true"}, timeout=20)
    out["steps"]["calles_ms"] = ms
    if not hasattr(r, "status_code"):
        out["state"] = "CALLE_ERROR"
        return out
    calles = r.json() if r.status_code == 200 else []
    out["steps"]["calles_status"] = r.status_code
    out["steps"]["calles_n"] = len(calles)
    if not calles:
        out["state"] = "CALLE_NO_MATCH"  # 204 oficial = sin resultados
        return out
    # descMunicipio no filtra por id: elegir candidato cuyo municipio anidado coincide
    def muni_of(c):
        loc = (c.get("localidad") or [{}])[0]
        ent = (loc.get("entidad") or {})
        m = (ent.get("municipio") or {})
        return m.get("descripcionOficial", ""), m.get("idProvincia", "")
    same = [c for c in calles if norm(muni_of(c)[0]) == norm(muni)
            and muni_of(c)[1] == "48"]
    calle = (same or calles)[0]
    out["steps"]["calles_muni_match"] = len(same)
    out["steps"]["calles_ambiguas"] = len(calles) - len(same)
    out["steps"]["calle_id"] = calle["id"]
    out["steps"]["calle_desc"] = calle.get("descripcionCastellano")
    # 2. portales por número
    r, ms = t(http_get, BASE + f"calle/{calle['id']}/portales",
              params={"portalNum": num, "withParents": "true"}, timeout=20)
    out["steps"]["portales_ms"] = ms
    if not hasattr(r, "status_code"):
        out["state"] = "PORTAL_ERROR"
        return out
    out["steps"]["portales_status"] = r.status_code
    portales = r.json() if r.status_code == 200 else []
    if isinstance(portales, dict):
        portales = [portales]
    out["steps"]["portales_n"] = len(portales)
    if not portales:
        out["state"] = "PORTAL_NO_MATCH"
        return out
    portal = portales[0]
    out["steps"]["portal_id"] = portal["id"]
    out["steps"]["portal_cp"] = portal.get("codigoPostal")
    out["steps"]["portal_xy"] = [portal.get("dxEtrs89"), portal.get("dyEtrs89")]
    # 3. edificios del portal
    r, ms = t(http_get, BASE + f"portal/{portal['id']}/edificios",
              params={"withParents": "false"}, timeout=20)
    out["steps"]["edificios_ms"] = ms
    if not hasattr(r, "status_code") or r.status_code != 200:
        out["state"] = "EDIFICIO_ERROR"
        return out
    ed = r.json()
    ed = ed if isinstance(ed, list) else [ed]
    out["steps"]["edificios_n"] = len(ed)
    out["steps"]["edificios"] = [
        {"id": e["id"], "fechaConstr": e.get("fechaConstr"), "tipo": e.get("tipo"),
         "estado": e.get("estado")} for e in ed[:5]
    ]
    out["state"] = "RESOLVED" if ed else "EDIFICIO_NO_MATCH"
    out["total_ms"] = sum(v for k, v in out["steps"].items() if k.endswith("_ms"))
    return out


def main():
    results = [resolve(*q) for q in QUERIES]
    states = {}
    for r in results:
        states[r["state"]] = states.get(r["state"], 0) + 1
    lat = [r["total_ms"] for r in results if "total_ms" in r]
    report = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "base": BASE,
        "chain": ["calles?descCalle&descMunicipio", "calle/{id}/portales?portalNum",
                  "portal/{id}/edificios", "portales/cercano?x&y&crs"],
        "sample_n": len(results),
        "states": states,
        "latency_ms": {"min": min(lat), "median": sorted(lat)[len(lat) // 2], "max": max(lat)},
        "results": results,
    }
    (OUT / "address_spike.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    for r in results:
        print(f"{r['muni']:>18} {r['street'][:28]:<30} {r['num']:>3} -> {r['state']:<18}"
              f" calles={r['steps'].get('calles_n')} portales={r['steps'].get('portales_n')}"
              f" edif={r['steps'].get('edificios_n')} {r.get('total_ms','')}ms")
    print(states, report["latency_ms"])


if __name__ == "__main__":
    main()
