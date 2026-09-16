"""Construye el paquete de revisión humana de G1.

Extrae LITERALMENTE las secciones pedidas (sin reescribirlas) y las acompaña con
los análisis solicitados. NO modifica ningún documento de diseño.

    python docs/design/review-render/build-review-pack.py
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "docs/design/G1-HUMAN-REVIEW-PACK.md"
RENDER = ROOT / "docs/design/review-render"

SRC = {
    "tu": "docs/design/G1-TU-BIZKAIA.md",
    "copy": "docs/UX_COPY.md",
    "perf": "docs/design/G1-PERFORMANCE-BUDGETS.md",
    "gate": "docs/gates/G1.md",
    "ux": "docs/UX.md",
    "state": "docs/design/G1-STATE-MODEL.md",
    "vis": "docs/VISUAL_SYSTEM.md",
    "sem": "docs/DATA_SEMANTICS.md",
    "front": "docs/design/G1-FRONTEND-ARCHITECTURE.md",
}

# (clave, encabezado exacto) — se extraen literalmente y se anidan un nivel
BLOCKS = [
    ("gate", "## REVISIÓN HUMANA (no automatizable)"),
    ("gate", "## PRODUCT (P)"),
    ("gate", "## DATA (D)"),
    ("gate", "## MAP (M)"),
    ("gate", "## UX (U)"),
    ("gate", "## COPY (C)"),
    ("gate", "## PERFORMANCE (PERF)"),
    ("gate", "## ACCESSIBILITY (A)"),
    ("gate", "## RELIABILITY (REL)"),
    ("gate", "## DEPLOYMENT (DEP)"),
    ("gate", "## VISUAL REGRESSION (VR)"),
    ("gate", "## PROVENANCE (PROV)"),
    ("gate", "## Criterios GO / NO-GO"),
    ("gate", "## Recuento de criterios"),
    ("tu", "## 4. Regla del universo estadístico (crítica)"),
    ("tu", "## 8. Edificio: de estado de dato a representación"),
    ("tu", "## 9. Distribución temporal — una sola visualización principal"),
    ("tu", "## 10. Relación mapa ↔ distribución"),
    ("tu", "## 14. Decisiones que la revisión humana puede querer revertir"),
    ("copy", "## 12. Hero (`INTRO`)"),
    ("copy", "## 13. Titular y cobertura (`RESULT`)"),
    ("copy", "## 14. Distribución temporal"),
    ("copy", "## 15. Mapa y leyenda"),
    ("copy", "## 16. Edificio"),
    ("copy", "## 17. Ortofoto (opt-in)"),
    ("copy", "## 18. Búsqueda de lugar (`PlaceSearch`)"),
    ("copy", "## 19. Compartir y estados vacíos"),
    ("copy", "## 20. Fuentes y créditos (pie)"),
    ("copy", "## 21. Niveles de divulgación"),
    ("perf", "## 4. Presupuestos"),
    ("tu", "### 6.2 Dominio de zoom — definición única y total"),
    ("ux", "## 14. Multiescala"),
    ("state", "## 4. Estados del nivel de escala"),
    ("tu", "### 7.2 Decisión"),
    ("sem", "## 12. Agregación por celda (G1)"),
    ("vis", "## 11. Semántica antes que color"),
    ("vis", "## 12. Redundancia no cromática (obligatoria)"),
]


def section(text: str, start_heading: str) -> str:
    """Bloque desde el encabezado indicado hasta el siguiente de nivel <= al suyo."""
    lines = text.splitlines()
    level = len(start_heading) - len(start_heading.lstrip("#"))
    start = None
    for i, ln in enumerate(lines):
        if ln.strip() == start_heading.strip():
            start = i
            break
    if start is None:
        return f"[NO ENCONTRADO: {start_heading}]"
    end = len(lines)
    for j in range(start + 1, len(lines)):
        m = re.match(r"^(#{1,6}) ", lines[j])
        if m and len(m.group(1)) <= level:
            end = j
            break
    return "\n".join(lines[start:end]).rstrip() + "\n"


def demote(text: str) -> str:
    """Baja un nivel los encabezados para anidarlos bajo el del paquete."""
    out = []
    for ln in text.splitlines():
        m = re.match(r"^(#{1,5}) (.*)$", ln)
        out.append("#" + m.group(1) + " " + m.group(2) if m else ln)
    return "\n".join(out)


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def sh(cmd: list[str]) -> str:
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True).stdout.strip()


def main() -> int:
    texts = {k: (ROOT / v).read_text(encoding="utf-8") for k, v in SRC.items()}
    blocks = {f"{k}::{h}": demote(section(texts[k], h)) for k, h in BLOCKS}

    def B(key: str) -> str:
        return blocks[key]

    front_head = demote(section(texts["front"], "## 6. Entrega de datos").split("### 6.2")[0])

    head = sh(["git", "rev-parse", "HEAD"])
    status = sh(["git", "status", "--porcelain"])
    modified = [x for x in status.splitlines() if not x.startswith("??")]
    untracked = [x for x in status.splitlines() if x.startswith("??")]
    tree_note = (str(len(modified)) + " ficheros versionados modificados · "
                 + str(len(untracked)) + " rutas nuevas sin versionar")
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    manifest = json.loads((RENDER / "render-manifest.json").read_text(encoding="utf-8"))
    pngs = "\n".join(
        "| `" + m["png"] + "` | " + m["size"] + " | `" + m["png_sha256"][:16] + "…` |"
        for m in manifest
    )
    svg_rows = "\n".join(
        "| `" + m["svg"] + "` | `" + m["svg_sha256"] + "` |" for m in manifest
    )

    parts: list[str] = []
    A = parts.append

    A("# G1 — PAQUETE DE REVISIÓN HUMANA (HR1 / HR2)")
    A("")
    A("> Paquete **autosuficiente** para revisión humana externa. Se limita a copiar")
    A("> literalmente las secciones vigentes y a acompañarlas de los análisis pedidos.")
    A(">")
    A("| Campo | Valor |")
    A("|-------|-------|")
    A("| Proyecto | Más joven que tú · G1 «Tu Bizkaia» |")
    A("| Baseline | `be26508` (G0_PASS) |")
    A("| HEAD | `" + head + "` |")
    A("| Rama | `g1-design` |")
    A("| Generado | " + now + " |")
    A("| Working tree | " + tree_note + " |")
    A("| Estado del gate | **`G1_DESIGN_CHANGES_REQUIRED`** — F-1…F-8 corregidos (§11); "
      "pendiente HR1/HR2 |")
    A("")
    A("---")
    A("")
    A("## 0. Cómo leer este paquete")
    A("")
    A("1. **Mira primero los PNG** (§12): son la estructura de información tal como queda.")
    A("2. **Lee el copy real** (§4): es la página leída en voz alta.")
    A("3. **HR1 y HR2** (§1) son las dos decisiones que no puede tomar un resumen textual.")
    A("4. §6–§9 documentan, **literalmente**, el estado vigente del zoom, del denominador")
    A("   pequeño, de la distribución temporal y de los presupuestos.")
    A("5. §11 es el **registro de cambios** derivado de la revisión anterior.")
    A("")
    A("---")
    A("")
    A("## 1. Definición exacta de HR1 y HR2")
    A("")
    A(B("gate::## REVISIÓN HUMANA (no automatizable)"))
    A("---")
    A("")
    A("## 2. Criterios del gate G1 (literal)")
    A("")
    for h in ["## PRODUCT (P)", "## DATA (D)", "## MAP (M)", "## UX (U)", "## COPY (C)",
              "## PERFORMANCE (PERF)", "## ACCESSIBILITY (A)", "## RELIABILITY (REL)",
              "## DEPLOYMENT (DEP)", "## VISUAL REGRESSION (VR)", "## PROVENANCE (PROV)",
              "## Criterios GO / NO-GO", "## Recuento de criterios"]:
        A(B("gate::" + h))
    A("---")
    A("")
    A("## 3. G1-TU-BIZKAIA.md — §§4, 8, 9, 10, 14 (literal)")
    A("")
    for h in ["## 4. Regla del universo estadístico (crítica)",
              "## 8. Edificio: de estado de dato a representación",
              "## 9. Distribución temporal — una sola visualización principal",
              "## 10. Relación mapa ↔ distribución",
              "## 14. Decisiones que la revisión humana puede querer revertir"]:
        A(B("tu::" + h))
    A("---")
    A("")
    A("## 4. UX_COPY.md — §§12–21 (literal)")
    A("")
    for h in ["## 12. Hero (`INTRO`)", "## 13. Titular y cobertura (`RESULT`)",
              "## 14. Distribución temporal", "## 15. Mapa y leyenda", "## 16. Edificio",
              "## 17. Ortofoto (opt-in)", "## 18. Búsqueda de lugar (`PlaceSearch`)",
              "## 19. Compartir y estados vacíos", "## 20. Fuentes y créditos (pie)",
              "## 21. Niveles de divulgación"]:
        A(B("copy::" + h))
    A("---")
    A("")
    A("## 5. G1-PERFORMANCE-BUDGETS.md — §4 (literal)")
    A("")
    A(B("perf::## 4. Presupuestos"))
    A("---")
    A("")
    A("## 6. ZOOM DOMAIN")
    A("")
    A("### 6.1 Regla vigente, copiada literalmente de cada documento")
    A("")
    A("**`docs/design/G1-TU-BIZKAIA.md` §6.2 — definición única, completa y total**")
    A("")
    A(B("tu::### 6.2 Dominio de zoom — definición única y total"))
    A("**`docs/UX.md` §14 — repite la misma tabla**")
    A("")
    A(B("ux::## 14. Multiescala"))
    A("**`docs/design/G1-STATE-MODEL.md` §4 — repite la misma tabla**")
    A("")
    A(B("state::## 4. Estados del nivel de escala"))
    A("**`docs/design/G1-FRONTEND-ARCHITECTURE.md` §6.1 — zoom del artefacto vs dominio**")
    A("")
    A(front_head)
    A("### 6.2 Verificación de totalidad sobre **todo** valor real de zoom")
    A("")
    A("| Rango de `z` | Nivel | Opacidad municipios / celdas / edificios | Huecos | Solapes |")
    A("|---|---|---|---|---|")
    A("| `8,00 – 8,99` | `BIZKAIA` | 1 / 0 / 0 | 0 | 0 |")
    A("| **`9,00`** | `CELDA` (conmutación) | 0 / 1 / 0 | 0 | 0 |")
    A("| `9,00 – 13,49` | `CELDA` | 0 / 1 / 0 | 0 | 0 |")
    A("| **`13,50`** | `EDIFICIO` (conmutación) | 0 / 0 / 1 | 0 | 0 |")
    A("| `13,50 – 22,00` | `EDIFICIO` | 0 / 0 / 1 | 0 | 0 |")
    A("")
    A("**Confirmación:** la escala es una **función total**. Todo `z` real tiene un nivel")
    A("asignado y exactamente **una** capa visible. El intervalo `13 ≤ z < 13,5` que la")
    A("revisión señaló como ambiguo está ahora **dentro del dominio de celdas**, y `UX.md` y")
    A("`G1-STATE-MODEL.md` repiten la misma tabla.")
    A("")
    A("> **F-1: cerrado.** Se eliminaron las formulaciones parciales (`9–13`, `< 13`,")
    A("> `8 < z < 13,5`) de los tres documentos. `MUNICIPIO` deja de ser un valor del")
    A("> enumerado de escala: era una confusión entre escala y universo estadístico.")
    A("> Criterio verificable: **`M1`** (60 valores de `z` con paso 0,25).")
    A("")
    A("---")
    A("")
    A("## 7. SMALL CELL SEMANTICS")
    A("")
    A("### 7.1 Redacción vigente, copiada literalmente")
    A("")
    A("**`docs/design/G1-TU-BIZKAIA.md` §7.2**")
    A("")
    A(B("tu::### 7.2 Decisión"))
    A("**`docs/DATA_SEMANTICS.md` §12**")
    A("")
    A(B("sem::## 12. Agregación por celda (G1)"))
    A("**`docs/UX_COPY.md` §15**")
    A("")
    A(B("copy::## 15. Mapa y leyenda"))
    A("**`docs/VISUAL_SYSTEM.md` §11 y §12**")
    A("")
    A(B("vis::## 11. Semántica antes que color"))
    A(B("vis::## 12. Redundancia no cromática (obligatoria)"))
    A("### 7.2 Respuestas literales a lo preguntado")
    A("")
    A("| Pregunta | Estado vigente |")
    A("|----------|----------------|")
    A("| **Threshold** | `n_known < 15` edificios con año válido en la celda |")
    A("| **Nombre semántico** | **`CELL_SMALL_DENOMINATOR`** (retirado `CELL_LOW_N`) |")
    A("| **Por qué existe** | con `n = 15` un solo edificio mueve el porcentaje ≥ **6,7 pp** "
      "(`1/15`), y más cuando `n` es menor. Mide **sensibilidad**, no validez |")
    A("| **¿Altera datos?** | **No.** El porcentaje publicado es idéntico al de una celda "
      "sin marca |")
    A("| **¿Altera color/relleno?** | **No.** El relleno mantiene **exactamente** la misma "
      "escala cromática |")
    A("| **¿Altera contorno?** | **Sí**: contorno discontinuo |")
    A("| **¿Altera tooltip?** | **Sí**: nota de denominador pequeño |")
    A("| **Expresión al usuario** | «Pocos edificios con año válido en esta celda (n={n}); "
      "unos pocos edificios pueden cambiar mucho el porcentaje.» |")
    A("| **Términos prohibidos** | «fiabilidad», «muestra», «dato menos fiable» |")
    A("")
    A("> **F-2 y F-7: cerrados.** Se retira «baja fiabilidad» y se define explícitamente la")
    A("> invariante del relleno. Criterio verificable: **`M6`** (dos celdas con la misma")
    A("> cuota reciben el mismo color; el porcentaje no cambia por llevar marca).")
    A("")
    A("---")
    A("")
    A("## 8. DECADE DISTRIBUTION MOBILE")
    A("")
    A("### 8.1 Redacción vigente, copiada literalmente")
    A("")
    A("**`docs/design/G1-TU-BIZKAIA.md` §9**")
    A("")
    A(B("tu::## 9. Distribución temporal — una sola visualización principal"))
    A("**`docs/UX_COPY.md` §14**")
    A("")
    A(B("copy::## 14. Distribución temporal"))
    A("### 8.2 Estructura de buckets vigente")
    A("")
    A("| # | Bucket | Tipo |")
    A("|---|--------|------|")
    A("| 1 | `<1900` | **cubo abierto**: la cola antigua se agrupa, no se oculta |")
    A("| 2–14 | `1900s`, `1910s`, `1920s`, `1930s`, `1940s`, `1950s`, `1960s`, `1970s`, "
      "`1980s`, `1990s`, `2000s`, `2010s`, `2020s` | una barra por década |")
    A("| 15 | `SIN AÑO` | **fuera del eje temporal**, nunca en 0 |")
    A("")
    A("| Aspecto | Definición |")
    A("|---------|------------|")
    A("| Total | **15 categorías** (antes: 33 décadas) |")
    A("| Buckets distintos por viewport | **Prohibido**: idénticos en desktop y móvil |")
    A("| Scroll horizontal / ventana temporal | **Prohibido** |")
    A("| Edificios anteriores a 1900 | Quedan **representados** en `<1900` y **contados** |")
    A("| Marcador «TU AÑO · {Y}» | **Posición continua** dentro del eje |")
    A("| Ancho por barra en 390 px | 16 px de barra / 23 px de paso ⇒ sin scroll |")
    A("")
    A("> **F-3: cerrado.** El wireframe móvil ya dibuja los 15 buckets (antes 8 barras).")
    A("> Ver `desktop-result.png` y `mobile-result.png` en §12.")
    A("")
    A("---")
    A("")
    A("## 9. Tabla completa de presupuestos")
    A("")
    A("Valores literales de `G1-PERFORMANCE-BUDGETS.md` §4. Perfiles: **P1** local-desktop ·")
    A("**P2** móvil emulado (Slow 4G, CPU ×4) · **P3** host candidato.")
    A("")
    A("| Métrica | Perfil | Percentil / reps | Umbral | Baseline G0 comparable | Método | "
      "Regla pass/fail |")
    A("|---------|--------|------------------|--------|------------------------|--------|"
      "-----------------|")
    A("| `transfer_hero` (first-party) | P1, P2 | valor, 5 reps | ≤ 420 KB | build gzip "
      "364.587 B (incluía MapLibre) | Σ `encodedBodySize` | p95 de 5 ≤ umbral |")
    A("| `t_hero_interactive` | P1 | p75/p95, **20 reps** | ≤ 900 / 1.500 ms | canvas "
      "91–184 ms | `navigationStart` → input activo | p75 y p95 ≤ umbral |")
    A("| `t_hero_interactive` | P2 | p75/p95, **20 reps** | ≤ 2.000 / 3.200 ms | canvas "
      "157–172 ms | idem con CPU ×4 | idem |")
    A("| `build_js_raw` | repo | determinista | ≤ 1.800.000 B | 1.339.816 B | Σ "
      "`_app/immutable/**/*.js` | ≤ umbral |")
    A("| **`t_result_ready`** | P1 | p75/p95, **20 reps** + máximo | ≤ 1.600 / 2.400 ms | "
      "no comparable | CTA → celdas visibles + titular | p75 y p95 ≤ umbral |")
    A("| **`t_result_ready`** | P2 | p75/p95, **20 reps** + máximo | ≤ 3.500 / 5.000 ms | "
      "no comparable | ≈1,9 s transferencia + CPU ×4 | idem |")
    A("| `transfer_result_first_party` | P1, P2 | valor, 5 reps | ≤ 620 KB | cells z12 = "
      "7.547 B | excluye ortofoto externa | p95 ≤ umbral |")
    A("| `transfer_result_buildings_first_party` | P1, P2 | valor, 5 reps | ≤ 1.100 KB | "
      "buildings z14 = 464.599 B | caso de encuadre z ≥ 13,5 | idem |")
    A("| `t_result_ready_buildings` | P1 | p75/p95, 20 reps | ≤ 2.400 / 3.200 ms | no "
      "comparable | añade teselas de edificios | idem |")
    A("| `t_result_ready_buildings` | P2 | p75/p95, 20 reps | ≤ 5.000 / 7.000 ms | no "
      "comparable | idem | idem |")
    A("| `t_year_change` | P1 | p95, 20 reps | ≤ 120 ms | 9–10 ms | mapa + distribución + "
      "`aria-live` | p95 ≤ umbral |")
    A("| `t_year_change` | P2 | p95, 20 reps | ≤ 300 ms | 16–18 ms | idem | idem |")
    A("| `t_place_change` | P1 | p95, 20 reps | ≤ 1.800 ms | no comparable | NORA + JSON + "
      "encuadre | p95 ≤ umbral |")
    A("| `t_place_change` | P2 | p95, 20 reps | ≤ 3.500 ms | no comparable | idem | idem |")
    A("| `t_ortho_visible` (**externo**) | P1 | p75, 20 reps | ≤ 1.500 ms | tesela "
      "212–324 ms | servicio de terceros | p75 ≤ umbral |")
    A("| `t_ortho_visible` (**externo**) | P2 | p75, 20 reps | ≤ 3.000 ms | tesela "
      "231–297 ms | idem | idem |")
    A("| **`heap_after_journey`** | P1 | valor | ≤ **60 MB** | 13,9 MB (sin journey) | ≈4× "
      "baseline; techo que acota caché | `usedJSHeapSize` | ≤ umbral |")
    A("| **`heap_after_journey`** | P2 | valor | ≤ **40 MB** | **9,5–11,5 MB** (sin journey) "
      "| ≈4× baseline; techo que acota caché | idem | ≤ umbral |")
    A("| `uncaught` | P1, P2 | valor | **0** | 0 | — | `pageerror` + "
      "`unhandledrejection` | exactamente 0 |")
    A("| `console_errors` | P1, P2 | valor | **0** | 0 | lista blanca §6 | "
      "`console.error` | exactamente 0 |")
    A("")
    A("### 9.1 Separación de fiabilidad (fuera de PERFORMANCE)")
    A("")
    A("| Métrica | Dónde | Umbral | Regla |")
    A("|---------|-------|--------|-------|")
    A("| **Activos propios** (`*.pmtiles`, JS, CSS, `metrics/*.json`, `catalog.json`) | "
      "`REL6` | **0 fallos** | binaria |")
    A("| **Ortofoto externa — disponibilidad** | `REL7` | sin umbral: **caracterización** | "
      "`NOT_COVERED` no es fallo; `SERVICE_ERROR` debe degradar |")
    A("| **Ortofoto externa — smoke de release imposible** | `REL8` | — | resultado "
      "**`G1_BLOCKED`**, nunca `G1_FAIL` |")
    A("")
    A("> **F-4, F-5, F-6 y F-8: cerrados.**")
    A("> - `tile_failures` **eliminada** como métrica mezclada; se reparte entre `REL6`")
    A(">   (propio, 0), `REL7` (externo, caracterizado) y `REL8` (bloqueo por entorno).")
    A("> - `heap` móvil baja de 70 MB a **40 MB** (y P1 de 90 MB a 60 MB), con el factor 4×")
    A(">   declarado como decisión.")
    A("> - `t_result_ready` protege **p75 y p95 con 20 repeticiones** (antes p95 con 5) y se")
    A(">   reporta el máximo observado.")
    A("> - Se añade presupuesto **acumulado first-party** (`transfer_result_first_party` y la")
    A(">   variante con edificios), excluyendo JPEG/WMS externos.")
    A("")
    A("---")
    A("")
    A("## 10. Las 4 decisiones reversibles de §14")
    A("")
    A(B("tu::## 14. Decisiones que la revisión humana puede querer revertir"))
    A("### 10.1 Fichas de reversibilidad")
    A("")
    A("#### D-1 · Clase visual única `NO_YEAR`")
    A("")
    A("- **Decisión actual:** `UNKNOWN`, `SUSPICIOUS` e `INVALID` comparten **una** clase")
    A("  visual no temporal; el desglose numérico va en el disclosure y el estado exacto en el")
    A("  tooltip.")
    A("- **Alternativa:** cuatro clases visuales (color/trama distintas) en zoom de edificio.")
    A("- **Evidencia utilizada:** 12/13.750 (Bilbao), 5/2.390 (Leioa), 9/254 (Murueta) →")
    A("  0,05 %–3,5 % del parque.")
    A("- **Coste de revertir tras G1:** bajo en datos; medio en `VISUAL_SYSTEM.md` y")
    A("  `UX_COPY.md` §15; hay que rehacer leyenda, tooltip y pruebas de escala de grises.")
    A("- **Artefactos afectados:** `VISUAL_SYSTEM.md` §11–12, `UX_COPY.md` §15–16,")
    A("  `desktop-building.svg`, `mobile-detail.svg`, criterios `M3`/`M4`.")
    A("")
    A("#### D-2 · Métrica primaria de celda = conteo de edificios")
    A("")
    A("- **Decisión actual:** la celda colorea la cuota de **edificios** (`C-05`); la huella")
    A("  (`C-08`) solo en tooltip.")
    A("- **Alternativa:** celda por cuota de **huella**.")
    A("- **Evidencia utilizada:** divergencia media 14,8 pts; 25 % de celdas > 20 pts; solo")
    A("  75 % coinciden al clasificar «mayoritariamente nueva»; extremo 17,4 % vs 90,2 %.")
    A("- **Coste de revertir tras G1:** **alto**: cambia una capa visible, leyenda, tooltip,")
    A("  copy y todos los umbrales de color; requiere regenerar `cells.pmtiles`.")
    A("- **Artefactos afectados:** `G1-TU-BIZKAIA.md` §7, `DATA_SEMANTICS.md` §12,")
    A("  `UX_COPY.md` §15, `VISUAL_SYSTEM.md` §13, pipeline de celdas,")
    A("  `M1`/`M3`/`M6`, regresión visual.")
    A("")
    A("#### D-3 · Ortofoto opt-in")
    A("")
    A("- **Decisión actual:** ninguna ortofoto se carga sin acción explícita.")
    A("- **Alternativa:** mostrar la foto más próxima automáticamente bajo los edificios.")
    A("- **Evidencia utilizada:** assets 364.587 B gzip; teselas de ortofoto ≈300–600 KB.")
    A("- **Coste de revertir tras G1:** **alto** en presupuesto (sube")
    A("  `transfer_result_first_party` y `t_result_ready`; exige enmienda), medio en copy.")
    A("- **Artefactos afectados:** `G1-PERFORMANCE-BUDGETS.md` §4,")
    A("  `G1.md` `P5`/`PERF4`/`PERF5`/`PERF10`, `UX_COPY.md` §17,")
    A("  `G1-STATE-MODEL.md` §3, wireframes de resultado.")
    A("")
    A("#### D-4 · Hero sin MapLibre")
    A("")
    A("- **Decisión actual:** el hero no monta el motor de mapa.")
    A("- **Alternativa:** mapa ya en la portada.")
    A("- **Evidencia utilizada:** el hero sin MapLibre permite `transfer_hero` ≤ 420 KB.")
    A("- **Coste de revertir tras G1:** **medio-alto**: cambia el perfil de carga inicial")
    A("  (`PERF1`/`PERF2`) y la jerarquía del hero.")
    A("- **Artefactos afectados:** `UX.md` §15, `VISUAL_SYSTEM.md` §15, `UX_COPY.md` §12,")
    A("  `G1-PERFORMANCE-BUDGETS.md` §4, `PERF1`–`PERF3`,")
    A("  `desktop-hero.svg`, `mobile-hero.svg`.")
    A("")
    A("---")
    A("")
    A("## 11. Registro de cambios derivado de la revisión")
    A("")
    A("| # | Hallazgo | Acción aplicada | Artefactos tocados | Criterio |")
    A("|---|----------|-----------------|--------------------|----------|")
    A("| F-1 | Discontinuidad de zoom `13 ≤ z < 13,5` | Dominio único y total `z<9` / "
      "`9 ≤ z <13,5` / `z ≥13,5`; se eliminan formulaciones parciales; `MUNICIPIO` sale del "
      "enumerado de escala | `G1-TU-BIZKAIA` §6.2 · `UX` §14 · `G1-STATE-MODEL` §4 · "
      "`G1-FRONTEND-ARCHITECTURE` §6.1 | `M1` |")
    A("| F-2 | «Baja fiabilidad» describe un censo como si fuera una muestra | Renombrado a "
      "`CELL_SMALL_DENOMINATOR`; se prohíben «fiabilidad», «muestra», «dato menos fiable»; "
      "umbral justificado por 6,7 pp con n=15 | `G1-TU-BIZKAIA` §7.2 · `DATA_SEMANTICS` §12 · "
      "`UX_COPY` §15 · `VISUAL_SYSTEM` §11 · `RISKS` R-18 | `M6` |")
    A("| F-3 | Distribución móvil ilegible con 33 décadas; el wireframe dibujaba 8 barras | "
      "Buckets fijos `<1900` + 1900s–2020s + `SIN AÑO` (15 máx.), idénticos en ambos "
      "viewports, sin scroll; marcador continuo | `G1-TU-BIZKAIA` §9 · `DATA_SEMANTICS` §14 y "
      "`M-09` · `UX_COPY` §14 · `G1.md` `P4` · `desktop-result.svg` · `mobile-result.svg` | "
      "`P4` |")
    A("| F-4 | `tile_failures` mezclaba activos propios y servicios externos | Eliminada "
      "como métrica mezclada; activos propios → `REL6` (0); externo → `REL7` caracterizado; "
      "smoke imposible → `REL8` = `G1_BLOCKED` | `G1-PERFORMANCE-BUDGETS` §1/§4.3/§8 · "
      "`G1.md` `REL6`–`REL8` y GO/NO-GO | `REL6`, `REL7`, `REL8` |")
    A("| F-5 | `heap` móvil 70 MB con rationale «6× baseline» | Bajado a **40 MB** (P2) y "
      "**60 MB** (P1); factor 4× declarado como decisión | `G1-PERFORMANCE-BUDGETS` §4.3 · "
      "`G1.md` `PERF11` | `PERF11` |")
    A("| F-6 | `t_result_ready` solo protegía p75 con 5 repeticiones | p75 **y** p95 con "
      "**20 repeticiones** y máximo observado en todas las métricas con percentil | "
      "`G1-PERFORMANCE-BUDGETS` §2/§4 · `G1.md` `PERF2`/`PERF4`/`PERF7`–`PERF10` | `PERF4` |")
    A("| F-7 | `CELL_LOW_N` decía «no se colorea igual» sin definir color | El **relleno no "
      "cambia**: misma escala cromática; la señal es contorno discontinuo + tooltip | "
      "`VISUAL_SYSTEM` §12–13 · `UX_COPY` §15 | `M6` |")
    A("| F-8 | Sin presupuesto de transferencia acumulada first-party | Añadidos "
      "`transfer_result_first_party` (≤620 KB) y "
      "`transfer_result_buildings_first_party` (≤1.100 KB), excluyendo ortofoto externa | "
      "`G1-PERFORMANCE-BUDGETS` §4.2 · `G1.md` `PERF5`/`PERF6` | `PERF5`, `PERF6` |")
    A("")
    A("**Cambio en el recuento del gate:** 68 → **72** criterios (nuevos `M6`, `REL6`, "
      "`REL7`, `REL8`; `PERF11` reasignado de `tile_failures` a `heap_after_journey`).")
    A("")
    A("---")
    A("")
    A("## 12. Wireframes renderizados")
    A("")
    A("| PNG | Tamaño | sha256 (16) |")
    A("|-----|--------|-------------|")
    A(pngs)
    A("")
    A("Rutas completas: `docs/design/review-render/<nombre>.png`.")
    A("Render reproducible: `python docs/design/review-render/render-svg.py`.")
    A("")
    A("> `desktop-result.png` y `mobile-result.png` se han vuelto a renderizar tras el cierre")
    A("> de F-3 (15 categorías, antes 8 barras).")
    A("")
    A("---")
    A("")
    A("## 13. Check-in de artefactos")
    A("")
    A("| SVG fuente | sha256 |")
    A("|-----------|--------|")
    A(svg_rows)
    A("")
    A("> Esta ronda de correcciones afecta a `desktop-result.svg` y `mobile-result.svg`;")
    A("> los otros cuatro conservan su contenido.")
    A("")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(parts), encoding="utf-8")
    print("pack:", OUT.relative_to(ROOT), f"({OUT.stat().st_size:,} B)")
    print("bloques extraídos:", len(BLOCKS), "| PNG:", len(manifest))
    missing = [k for k, v in blocks.items() if v.startswith("[NO ENCONTRADO")]
    print("no encontrados:", missing if missing else "ninguno")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
