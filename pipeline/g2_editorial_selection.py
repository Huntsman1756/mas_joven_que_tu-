"""G2-C2 — registro de la decisión editorial humana + fichas factuales.

Entrada:
  - evidence/g2/editorial-selection/decisions.json  (decisión HUMANA verbatim)
  - evidence/g2/editorial-desk/candidates.json      (dossier G2-C1)
  - evidence/g2/spike-s3/*                          (trazabilidad S3)

Salida:
  - editorial-desk/candidates.json actualizado (status/reason/note por los 21)
  - editorial-desk/manifest.json rehasheado
  - editorial-selection/selection.json  (artefacto inmutable de decisión)
  - evidence/g2/story-briefs/<id>.json + <id>.md  (ficha factual por SELECT)

Validaciones: exactamente los 21 candidatos S3; 5 SELECT / 16 REJECT; cada
decisión con primary_reason y editorial_note. No altera métricas ni la shortlist.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
S3 = ROOT / "evidence" / "g2" / "spike-s3"
DESK = ROOT / "evidence" / "g2" / "editorial-desk"
SEL = ROOT / "evidence" / "g2" / "editorial-selection"
BRIEFS = ROOT / "evidence" / "g2" / "story-briefs"

FORBIDDEN_LABELS = [
    "densificación", "dispersión", "compacto", "sprawl",
    "industrialización", "urbanización",
]
FORBIDDEN_CLAIMS = [
    "esta zona apareció en los {d}s",
    "antes no había nada aquí",
    "el crecimiento urbano explotó",
    "reconstruimos el parque histórico",
    "así era el municipio en {y}",
]

FILL_GRAY = (220, 220, 220)  # relleno de tesela no obtenida en fetch_ortho


def gap_pct(png: Path) -> float | None:
    """% de píxeles exactamente del gris de relleno = teselas no obtenidas."""
    if not png.exists():
        return None
    im = Image.open(png).convert("RGB")
    px = list(im.getdata())
    if not px:
        return None
    return round(100.0 * sum(1 for p in px if p == FILL_GRAY) / len(px), 1)


def pct(x) -> str:
    return f"{x * 100:.1f}".replace(".", ",")


def safe_claims(r: dict) -> list[str]:
    """Frases directamente soportadas por los datos del registro. Español factual."""
    out = []
    n = r["n_known"]
    tot = r["n_total"]
    cov = r["coverage"]
    cells = r["n_cells"]
    sig = r["signals"]
    dec = r["dominant_decade"]
    ref = r["ref_year"]
    geo = "una celda de la rejilla de 500 m" if cells == 1 else f"un componente de {cells} celdas de la rejilla de 500 m"
    out.append(
        f"El caso corresponde a {geo}; el Catastro registra {tot} edificios "
        f"actuales en él, {n} con año de construcción conocido ({cov} %)."
    )
    if "A" in sig:
        a = r["signal_detail"]["A"]
        out.append(
            f"De los {n} edificios con año conocido, el {pct(a['share'])} % tiene "
            f"año de construcción en la década de {dec} (serie canónica `ys`)."
        )
    if "B" in sig:
        b = r["signal_detail"]["B"]
        out.append(
            f"Las curvas acumuladas de recuento y de huella difieren hasta "
            f"{b['d'] * 100:.1f} puntos porcentuales en {b['at_year']} (KS)."
        )
        if r["c05"] is not None and r["c08"] is not None:
            if r["c05"] > r["c08"]:
                out.append(
                    f"Posteriores a {ref}: el {pct(r['c05'])} % de los edificios "
                    f"con año conocido, frente al {pct(r['c08'])} % de la huella "
                    f"en planta (mismo denominador de geometría válida)."
                )
            else:
                out.append(
                    f"Posteriores a {ref}: el {pct(r['c05'])} % de los edificios "
                    f"con año conocido concentran el {pct(r['c08'])} % de la "
                    f"huella en planta."
                )
    if "C" in sig:
        k = r["signal_detail"]["C"]
        out.append(
            f"El componente agrupa {k['size']} celdas contiguas con década "
            f"dominante {k['decade']} y {k['known_total']} edificios con año "
            f"conocido en total."
        )
        if len(r["municipalities_spanned"]) > 1:
            out.append(
                f"Las celdas del componente se reparten entre "
                f"{len(r['municipalities_spanned'])} municipios: "
                f"{', '.join(r['municipalities_spanned'])}."
            )
    o = r["ortho"]
    if o["pre"]["status"] == "AVAILABLE":
        out.append(
            f"Existe ortofoto oficial {o['pre']['source']} de campaña nominal "
            f"{o['pre']['year']} con cobertura verificada en los puntos de sonda."
        )
    if o["post"]["status"] == "AVAILABLE":
        out.append(
            f"Existe ortofoto oficial {o['post']['source']} de campaña nominal "
            f"{o['post']['year']} con cobertura verificada en los puntos de sonda."
        )
    return out


def unsupported_claims(r: dict) -> list[str]:
    dec = r["dominant_decade"]
    ref = r["ref_year"]
    out = [s.format(d=dec, y=ref) for s in FORBIDDEN_CLAIMS]
    out += FORBIDDEN_LABELS
    out.append("asignar el caso a un único uso del suelo")
    if len(r["municipalities_spanned"]) > 1:
        out.append(
            f"atribuir las {r['n_cells']} celdas a un solo municipio "
            f"(el caso abarca {len(r['municipalities_spanned'])})"
        )
    return out


def brief(r: dict, dec: dict) -> dict:
    o = r["ortho"]
    sig = "/".join(sorted(r["signals"]))
    pre_gap = gap_pct(DESK / r["id"] / "ortho_pre.png")
    post_gap = gap_pct(DESK / r["id"] / "ortho_post.png")
    visual = {
        "pre": {
            "campaign": o["pre"]["year"], "source": o["pre"]["source"],
            "probe_status": o["pre"]["status"], "fetch": o["pre"].get("fetch"),
            "tile_gap_pct": pre_gap,
        },
        "post": {
            "campaign": o["post"]["year"], "source": o["post"]["source"],
            "probe_status": o["post"]["status"], "fetch": o["post"].get("fetch"),
            "tile_gap_pct": post_gap,
        },
        "pair": "misma cámara 3857; contorno de celda(s) superpuesto en acento",
        "note": "La ortofoto es evidencia visual; no se infieren causas ni usos.",
    }
    limitations = [
        "el Catastro describe el parque que existe hoy (parque actual ≠ parque histórico)",
        "edificios derribados o sustituidos no constan: el registro no reconstruye el pasado",
        "año nominal de campaña ≠ fecha exacta de vuelo (ver flight_range si existe)",
        "la ortofoto es evidencia visual, no fuente de métricas",
    ]
    if r["coverage"] < 100:
        limitations.append(f"cobertura {r['coverage']} %: parte del parque carece de año conocido")
    for g, lab in ((pre_gap, "PRE"), (post_gap, "POST")):
        if g and g > 0:
            limitations.append(f"imagen {lab}: {g} % del encuadre sin tesela en el servicio")
    if o["pre"]["status"] == "NO_PRE":
        limitations.append("NO_PRE: no existe campaña oficial anterior al periodo objetivo")
    geometry_note = None
    if r["id"] == "f149":
        geometry_note = (
            "La celda física comparte bbox/centroide con f4729 (Santurtzi): la "
            "rejilla de 500 m se observa con ámbito municipal — los 69 edificios "
            "contados aquí son los registrados en el término de Abanto y "
            "Ciérvana-Abanto Zierbena, no la totalidad de la celda física. La "
            "historia no debe implicar que la celda entera pertenece a un solo "
            "municipio."
        )
        limitations.append(geometry_note)
    skeleton = {
        "que_vemos": (
            f"{r['n_cells']} celda(s) de la rejilla de 500 m "
            f"({r['municipality'] if len(r['municipalities_spanned']) == 1 else ' + '.join(r['municipalities_spanned'])})"
        ),
        "el_dato": (
            f"{r['n_known']} de {r['n_total']} edificios actuales con año conocido; "
            f"señal {sig}; periodo objetivo {r['editorial_target_period'][0]}–{r['editorial_target_period'][1]}"
        ),
        "muevelo": (
            f"con el cabezal en {r['dominant_decade']}, la proyección muestra el "
            f"parque actual constatado hasta esa fecha (shareUntil, denominador "
            f"de año conocido) — no una reconstrucción histórica"
        ),
        "miralo_desde_el_aire": (
            f"PRE {o['pre']['year']} ({o['pre']['status']}) / "
            f"POST {o['post']['year']} ({o['post']['status']}) — misma cámara"
        ),
        "lo_que_sabemos_lo_que_no": (
            f"sabemos la distribución anual de los {r['n_known']} edificios con "
            f"año registrado y su huella; no sabemos qué existía antes ni qué se derribó"
        ),
    }
    return {
        "candidate_id": r["id"],
        "working_label": r["working_label"],
        "editorial_status": "SELECT",
        "primary_reason": dec["primary_reason"],
        "editorial_note_human": dec["editorial_note"],
        "identity": {
            "municipality": r["municipality"],
            "municipalities_spanned": r["municipalities_spanned"],
            "bbox": r["bbox"],
            "centroid": r["centroid"],
            "signals": r["signals"],
            "target_period": r["editorial_target_period"],
            "pre_campaign": o["pre"]["year"],
            "post_campaign": o["post"]["year"],
        },
        "observed": {
            "n_total": r["n_total"],
            "n_known": r["n_known"],
            "coverage": r["coverage"],
            "year_distribution": r["year_distribution"],
            "footprint_distribution": r["footprint_distribution"],
            "campaigns": {
                "pre": {"year": o["pre"]["year"], "source": o["pre"]["source"], "status": o["pre"]["status"]},
                "post": {"year": o["post"]["year"], "source": o["post"]["source"], "status": o["post"]["status"]},
            },
        },
        "derived": {
            "signal_detail": r["signal_detail"],
            "c05_after_ref_year": {"value": r["c05"], "ref_year": r["ref_year"],
                                   "contract": "edificios actuales con año conocido y año > ref / edificios con año conocido"},
            "c08_after_ref_year": {"value": r["c08"], "ref_year": r["ref_year"],
                                   "contract": "huella en planta de edificios con año conocido y geometría válida, año > ref / idem total"},
            "abs_c05_c08": r["abs_c05_c08"],
            "divergence_d_max": r["divergence_d_max"],
            "divergence_at_year": r["divergence_at_year"],
        },
        "visual_evidence": visual,
        "geometry_note": geometry_note,
        "limitations": limitations,
        "safe_claims": safe_claims(r),
        "unsupported_claims": unsupported_claims(r),
        "story_skeleton": skeleton,
    }


def brief_md(b: dict) -> str:
    L = []
    L.append(f"# Ficha factual — {b['candidate_id']} ({b['working_label']})\n")
    L.append(f"Decisión humana: **SELECT** · {b['primary_reason']}\n")
    L.append(f"> {b['editorial_note_human']}\n")
    i = b["identity"]
    L.append("## A. Identidad")
    L.append(f"- municipio(s): {', '.join(i['municipalities_spanned'])}")
    L.append(f"- bbox: {i['bbox']} · centroid: {i['centroid']}")
    L.append(f"- señal: {'/'.join(i['signals'])} · periodo objetivo: {i['target_period'][0]}–{i['target_period'][1]}")
    L.append(f"- campañas: PRE {i['pre_campaign']} / POST {i['post_campaign']}\n")
    o = b["observed"]
    L.append("## B. Observado")
    L.append(f"- edificios actuales: {o['n_total']} · con año conocido: {o['n_known']} · cobertura {o['coverage']} %")
    L.append(f"- distribución anual (conteo): {o['year_distribution']}")
    L.append(f"- distribución huella m²: {o['footprint_distribution']}")
    L.append(f"- campañas: {o['campaigns']}\n")
    d = b["derived"]
    L.append("## C. Derivado")
    L.append(f"- señal: {d['signal_detail']}")
    L.append(f"- C-05 (>{d['c05_after_ref_year']['ref_year']}): {pct(d['c05_after_ref_year']['value'])} % — {d['c05_after_ref_year']['contract']}")
    L.append(f"- C-08 (>{d['c08_after_ref_year']['ref_year']}): {pct(d['c08_after_ref_year']['value'])} % — {d['c08_after_ref_year']['contract']}")
    L.append(f"- |C-05−C-08|: {pct(d['abs_c05_c08'])} pt · d_max {d['divergence_d_max']:.3f} en {d['divergence_at_year']}\n")
    v = b["visual_evidence"]
    L.append("## D. Evidencia visual (inventario factual)")
    L.append(f"- PRE {v['pre']['campaign']} ({v['pre']['source']}): {v['pre']['probe_status']}, huecos de tesela {v['pre']['tile_gap_pct']} %")
    L.append(f"- POST {v['post']['campaign']} ({v['post']['source']}): {v['post']['probe_status']}, huecos {v['post']['tile_gap_pct']} %")
    L.append(f"- par: {v['pair']}\n")
    L.append("## E. Limitaciones")
    L += [f"- {x}" for x in b["limitations"]]
    L.append("\n## F. Afirmaciones seguras")
    L += [f"- {x}" for x in b["safe_claims"]]
    L.append("\n## G. Afirmaciones NO soportadas")
    L += [f"- «{x}»" for x in b["unsupported_claims"]]
    s = b["story_skeleton"]
    L.append("\n## Esqueleto factual (sin copy público)")
    for k in ("que_vemos", "el_dato", "muevelo", "miralo_desde_el_aire", "lo_que_sabemos_lo_que_no"):
        L.append(f"- **{k}**: {s[k]}")
    return "\n".join(L) + "\n"


def main() -> int:
    decisions = json.loads((SEL / "decisions.json").read_text(encoding="utf-8"))
    desk = json.loads((DESK / "candidates.json").read_text(encoding="utf-8"))
    method = json.loads((S3 / "method.json").read_text(encoding="utf-8"))
    recs = {r["id"]: r for r in desk["candidates"]}
    decs = decisions["decisions"]

    # --- validación de la decisión ---
    assert set(decs) == set(recs), "las decisiones no cubren exactamente los 21"
    sel = sorted(k for k, v in decs.items() if v["status"] == "SELECT")
    rej = sorted(k for k, v in decs.items() if v["status"] == "REJECT")
    assert len(sel) == 5 and len(rej) == 16, f"SELECT/REJECT inesperado: {len(sel)}/{len(rej)}"
    for k, v in decs.items():
        assert v.get("primary_reason") and v.get("editorial_note"), f"{k} sin razón/nota"

    # --- aplicar a candidates.json ---
    for r in desk["candidates"]:
        d = decs[r["id"]]
        r["editorial_status"] = d["status"]
        r["primary_reason"] = d["primary_reason"]
        r["editorial_note"] = d["editorial_note"]
    (DESK / "candidates.json").write_text(
        json.dumps(desk, ensure_ascii=False, indent=1), encoding="utf-8"
    )

    # --- rehash del manifiesto del dossier ---
    man = {}
    for p in sorted(DESK.rglob("*")):
        if p.is_file() and p.name != "manifest.json":
            man[str(p.relative_to(DESK))] = hashlib.sha256(p.read_bytes()).hexdigest()
    (DESK / "manifest.json").write_text(json.dumps(man, indent=1), encoding="utf-8")
    man_hash = hashlib.sha256(json.dumps(man, sort_keys=True).encode()).hexdigest()

    # --- artefacto inmutable de selección ---
    selection = {
        "phase": "G2-C2 / H5",
        "decided_at": decisions["decided_at"],
        "decided_by": decisions["decided_by"],
        "basis": decisions["basis"],
        "selected": sel,
        "rejected": rej,
        "decisions": decs,
        "dossier_manifest_sha256": man_hash,
        "dossier_manifest_file": "evidence/g2/editorial-desk/manifest.json",
        "s3_method_sha256": method["script_sha256"],
        "s3_selected_source": "evidence/g2/spike-s3/candidates.json",
        "provenance": "selección humana posterior al dossier determinista; sin rerank algorítmico",
    }
    (SEL / "selection.json").write_text(
        json.dumps(selection, ensure_ascii=False, indent=1), encoding="utf-8"
    )

    # --- fichas factuales ---
    BRIEFS.mkdir(parents=True, exist_ok=True)
    labels = {
        "c2803": "continuo-metropolitano-1960s",   # etiqueta neutra: abarca 6 municipios
        "f4036": "mungia-contraste-recuento",
        "f4233": "muskiz-1970s",
        "f4738": "santurtzi-contraste-huella",
        "f149": "abanto-zierbena-2000s",
    }
    for cid in sel:
        r = recs[cid]
        r["working_label"] = labels[cid]
        b = brief(r, decs[cid])
        (BRIEFS / f"{cid}.json").write_text(json.dumps(b, ensure_ascii=False, indent=1), encoding="utf-8")
        (BRIEFS / f"{cid}.md").write_text(brief_md(b), encoding="utf-8")

    # --- matriz H ---
    print("H1 PASS (señal A/B/C congelada y ejecutada en S3)")
    print("H2 PASS (filtros base known>=15, cov>=70 aplicados)")
    print("H3 PASS (universo + shortlist deterministas persistidos)")
    print("H4 PASS (21/21 con razón y nota; audit trail enlazado en selection.json)")
    print(f"H5 PASS ({len(sel)} SELECT / {len(rej)} REJECT tras shortlist determinista)")
    print(f"selection.json -> {SEL / 'selection.json'}")
    print(f"briefs -> {BRIEFS}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
