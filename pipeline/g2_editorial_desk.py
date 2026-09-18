"""G2-C1 — mesa editorial: dossier estandarizado de los 21 candidatos S3.

Genera, para CADA candidato seleccionado determinísticamente por el spike S3,
un registro canónico + un paquete de evidencia visual idéntico, para que el
editor humano elija ~5 con evidencia equivalente delante. El script NO elige,
NO puntúa y NO interpreta.

Reglas congeladas del dossier (docs/gates/G2.md, brief G2-C1):
  - Universo: exactamente candidates.json -> selected (21). Sin añadir ni
    rerankear. Los 9 rechazados quedan referenciados en la auditoría.
  - editorial_target_period:
      A -> [década de máxima concentración, +9]
      B -> [década que contiene at_year, +9]
      C -> [década dominante del componente, +9]
  - PRE  = última campaña oficial con year <= inicio del periodo (NO_PRE si no hay)
    POST = primera campaña oficial con year >  fin del periodo  (NO_POST si no hay)
    Nunca se sustituye una campaña no disponible: se registra el estado y,
    aparte, las alternativas cubiertas más próximas (campos separados).
  - Cobertura: mismo contrato que app (probeCampaign): tile z15 Bizkaia /
    GetMap WMS 400 m geoEuskadi; imagen decodifica y >1 color => AVAILABLE,
    404 => NOT_COVERED, resto => SERVICE_ERROR.
    Puntos de sonda: centroide de la celda representativa; en componentes,
    además el miembro más próximo a cada esquina del bbox (máx. 5 puntos) para
    hacer visible la cobertura parcial.
  - Viewport determinista: envolvente 3857 de las celdas candidatas +
    margen max(35% del lado mayor, 600 m). Canvas 1200x900. La misma regla
    para mapa, orto PRE, orto POST y el par comparado (misma cámara).
  - Semántica: "el Catastro describe el parque que existe hoy". Las ortofotos
    son evidencia visual, no fuente de métricas.

Salidas en evidence/g2/editorial-desk/: candidates.json, index.html,
<candidate_id>/{map.png, ortho_pre.png, ortho_post.png, pair.png,
temporal.svg, contrast.svg}, manifest.json (SHA-256 de todo lo generado).
"""

from __future__ import annotations

import hashlib
import io
import json
import math
import sys
import time
from collections import defaultdict
from pathlib import Path

import requests
from PIL import Image, ImageDraw
from shapely.geometry import box, shape

ROOT = Path(__file__).resolve().parent.parent
GJ = ROOT / "data" / "processed" / "g1" / "geojson"
SERIES = ROOT / "app" / "static" / "data" / "cells"
CATALOG = ROOT / "app" / "static" / "data" / "catalog.json"
MUNIS = ROOT / "app" / "static" / "data" / "municipalities.json"
S3 = ROOT / "evidence" / "g2" / "spike-s3"
OUT = ROOT / "evidence" / "g2" / "editorial-desk"

CANVAS_W, CANVAS_H = 1200, 900
PROBE_TILE_Z = 15
PROBE_WMS_HALF_M = 200
HTTP_TIMEOUT = 20
MAX_COMPONENT_POINTS = 5

BIZKAIA_TILE = (
    "https://geo.bizkaia.eus/arcgisserverinspire/rest/services/"
    "Kartografia_Cartografia/ORTO_BFA_{Y}/MapServer/tile/{z}/{y}/{x}"
)
GEOEUSKADI_WMS = (
    "https://www.geo.euskadi.eus/WMS_ORTOARGAZKIAK?service=WMS&version=1.3.0"
    "&request=GetMap&layers=ORTO_{Y}&styles=&crs=EPSG:3857"
    "&bbox={bbox}&width={w}&height={h}&format=image/jpeg"
)

ACCENT = (142, 47, 76)  # mismo acento editorial que el producto


# --------------------------------------------------------------------------
# utilidades geo
# --------------------------------------------------------------------------

def lonlat_to_3857(lon: float, lat: float) -> tuple[float, float]:
    x = lon * 20037508.34 / 180
    y = math.log(math.tan((90 + lat) * math.pi / 360)) / (math.pi / 180) * (20037508.34 / 180)
    return x, y


def merc_to_lonlat(x: float, y: float) -> tuple[float, float]:
    lon = x / 20037508.34 * 180
    lat = math.atan(math.exp(y * math.pi / 20037508.34)) * 360 / math.pi - 90
    return lon, lat


def lonlat_to_tile(lon: float, lat: float, z: int) -> tuple[int, int]:
    n = 2 ** z
    x = int(((lon + 180) / 360) * n)
    y = int(
        ((1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2) * n
    )
    return x, y


def tile_bounds_3857(tx: int, ty: int, z: int) -> tuple[float, float, float, float]:
    n = 2 ** z
    size = 40075016.68557849 / n
    x0 = -20037508.3427892 + tx * size
    y1 = 20037508.3427892 - ty * size
    return x0, y1 - size, x0 + size, y1


def decade_of(y: int) -> int:
    return (y // 10) * 10


def parse_series(s: str | None) -> dict[int, float]:
    out: dict[int, float] = {}
    if not s:
        return out
    for part in s.split(","):
        y, _, n = part.partition(":")
        out[int(y)] = out.get(int(y), 0.0) + float(n)
    return out


# --------------------------------------------------------------------------
# sonda de cobertura — mismo contrato que app/src/lib/domain/ortho.ts
# --------------------------------------------------------------------------

def image_has_content(raw: bytes) -> bool:
    try:
        im = Image.open(io.BytesIO(raw)).convert("RGB").resize((32, 32))
    except Exception:
        return False
    seen = set()
    for px in im.getdata():
        seen.add(px)
        if len(seen) > 1:
            return True
    return False


def probe_campaign(c: dict, lon: float, lat: float) -> str:
    """AVAILABLE | NOT_COVERED | SERVICE_ERROR — réplica de probeCampaign."""
    try:
        if c["source"] == "bizkaia":
            tx, ty = lonlat_to_tile(lon, lat, PROBE_TILE_Z)
            url = BIZKAIA_TILE.format(Y=c["year"], z=PROBE_TILE_Z, y=ty, x=tx)
        else:
            x, y = lonlat_to_3857(lon, lat)
            h = PROBE_WMS_HALF_M
            url = GEOEUSKADI_WMS.format(
                Y=c["year"], bbox=f"{x-h},{y-h},{x+h},{y+h}", w=256, h=256
            )
        r = requests.get(url, timeout=HTTP_TIMEOUT)
        if r.status_code == 404:
            return "NOT_COVERED"
        if not r.ok:
            return "SERVICE_ERROR"
        if not (r.headers.get("content-type") or "").startswith("image/"):
            return "SERVICE_ERROR"
        return "AVAILABLE" if image_has_content(r.content) else "SERVICE_ERROR"
    except requests.RequestException:
        return "SERVICE_ERROR"


# --------------------------------------------------------------------------
# render
# --------------------------------------------------------------------------

def fit_view(cells_geom: list) -> tuple[float, float, float, float]:
    """bbox 3857 = envolvente candidatas + max(35% span, 600 m). Regla única."""
    xs, ys = [], []
    for g in cells_geom:
        minx, miny, maxx, maxy = g.bounds
        x0, y0 = lonlat_to_3857(minx, miny)
        x1, y1 = lonlat_to_3857(maxx, maxy)
        xs += [x0, x1]
        ys += [y0, y1]
    span = max(max(xs) - min(xs), max(ys) - min(ys))
    pad = max(0.35 * span, 600.0)
    return min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad


class View:
    """Proyección 3857 -> canvas 1200x900 para un bbox fijo."""

    def __init__(self, bbox3857: tuple[float, float, float, float]):
        self.x0, self.y0, self.x1, self.y1 = bbox3857
        self.sx = CANVAS_W / (self.x1 - self.x0)
        self.sy = CANVAS_H / (self.y1 - self.y0)

    def px(self, lon: float, lat: float) -> tuple[float, float]:
        x, y = lonlat_to_3857(lon, lat)
        return (x - self.x0) * self.sx, (self.y1 - y) * self.sy

    def lonlat_at(self, fx: float, fy: float) -> tuple[float, float]:
        return merc_to_lonlat(self.x0 + fx / self.sx, self.y1 - fy / self.sy)


def render_map(view: View, cand_geoms: list, ctx_geoms: list, out: Path) -> None:
    im = Image.new("RGB", (CANVAS_W, CANVAS_H), (247, 245, 241))
    dr = ImageDraw.Draw(im)
    for g in ctx_geoms:
        pts = [view.px(lon, lat) for lon, lat in g.exterior.coords]
        dr.polygon(pts, fill=(234, 231, 224), outline=(200, 196, 186))
    for g in cand_geoms:
        pts = [view.px(lon, lat) for lon, lat in g.exterior.coords]
        dr.polygon(pts, fill=(198, 96, 122), outline=ACCENT)
        dr.line(pts + [pts[0]], fill=ACCENT, width=3)
    im.save(out)


def fetch_ortho(c: dict, bbox3857: tuple[float, float, float, float]) -> tuple[Image.Image | None, str]:
    """Compone la imagen oficial sobre el viewport. Devuelve (imagen, estado)."""
    x0, y0, x1, y1 = bbox3857
    if c["source"] == "geoeuskadi":
        url = GEOEUSKADI_WMS.format(
            Y=c["year"], bbox=f"{x0},{y0},{x1},{y1}", w=CANVAS_W, h=CANVAS_H
        )
        try:
            r = requests.get(url, timeout=HTTP_TIMEOUT * 2)
        except requests.RequestException:
            return None, "SERVICE_ERROR"
        if r.status_code == 404:
            return None, "NOT_COVERED"
        if not r.ok or not (r.headers.get("content-type") or "").startswith("image/"):
            return None, "SERVICE_ERROR"
        try:
            return Image.open(io.BytesIO(r.content)).convert("RGB"), "AVAILABLE"
        except Exception:
            return None, "SERVICE_ERROR"
    # bizkaia: teselas z15 cubriendo el viewport
    lon_min, lat_min = merc_to_lonlat(x0, y0)
    lon_max, lat_max = merc_to_lonlat(x1, y1)
    tx0, ty0 = lonlat_to_tile(lon_min, lat_max, PROBE_TILE_Z)
    tx1, ty1 = lonlat_to_tile(lon_max, lat_min, PROBE_TILE_Z)
    mosaic = Image.new("RGB", ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256), (220, 220, 220))
    any_ok = False
    for tx in range(tx0, tx1 + 1):
        for ty in range(ty0, ty1 + 1):
            url = BIZKAIA_TILE.format(Y=c["year"], z=PROBE_TILE_Z, y=ty, x=tx)
            try:
                r = requests.get(url, timeout=HTTP_TIMEOUT)
            except requests.RequestException:
                continue
            if not r.ok or not (r.headers.get("content-type") or "").startswith("image/"):
                continue
            try:
                t = Image.open(io.BytesIO(r.content)).convert("RGB")
            except Exception:
                continue
            mosaic.paste(t, ((tx - tx0) * 256, (ty - ty0) * 256))
            any_ok = True
    if not any_ok:
        return None, "SERVICE_ERROR"
    # recortar al viewport exacto
    bx0, by0, bx1, by1 = tile_bounds_3857(tx0, ty0, PROBE_TILE_Z)
    tile_span_x = bx1 - bx0
    scale = mosaic.width / ((tx1 - tx0 + 1) * tile_span_x)
    px0 = (x0 - bx0) * scale
    py0 = (by1 - y1) * scale
    px1 = (x1 - bx0) * scale
    py1 = (by1 - y0) * scale
    crop = mosaic.crop((int(px0), int(py0), int(px1), int(py1))).resize((CANVAS_W, CANVAS_H))
    return crop, "AVAILABLE"


def status_image(state: str, year: int | None) -> Image.Image:
    im = Image.new("RGB", (CANVAS_W, CANVAS_H), (239, 237, 231))
    dr = ImageDraw.Draw(im)
    label = f"{state} — campaña {year}" if year else state
    dr.text((CANVAS_W // 2, CANVAS_H // 2), label, fill=(107, 107, 99), anchor="mm")
    return im


def overlay_cells(im: Image.Image, view: View, geoms: list) -> Image.Image:
    """Contorno de las celdas candidatas sobre la ortofoto (misma cámara)."""
    im = im.copy()
    dr = ImageDraw.Draw(im)
    for g in geoms:
        pts = [view.px(lon, lat) for lon, lat in g.exterior.coords]
        dr.line(pts + [pts[0]], fill=ACCENT, width=4)
    return im


def render_pair(pre: Image.Image, post: Image.Image, y_pre: int | None, y_post: int | None, out: Path) -> None:
    w = CANVAS_W * 2 + 16
    im = Image.new("RGB", (w, CANVAS_H), (247, 245, 241))
    im.paste(pre, (0, 0))
    im.paste(post, (CANVAS_W + 16, 0))
    dr = ImageDraw.Draw(im)
    dr.rectangle([CANVAS_W, 0, CANVAS_W + 16, CANVAS_H], fill=(28, 26, 23))
    dr.text((20, 20), f"PRE {y_pre}", fill=(255, 255, 255))
    dr.text((CANVAS_W + 36, 20), f"POST {y_post}", fill=(255, 255, 255))
    im.save(out)


# --------------------------------------------------------------------------
# SVG: distribución temporal + contraste C-05/C-08
# --------------------------------------------------------------------------

def svg_temporal(by_dec_n: dict[int, float], by_dec_a: dict[int, float], target: tuple[int, int], out: Path) -> None:
    """Barras: edificios (arriba) y huella m² (abajo) por década; banda = periodo."""
    W, H = 1200, 340
    decs = sorted(set(by_dec_n) | set(by_dec_a))
    if not decs:
        out.write_text("<svg xmlns='http://www.w3.org/2000/svg'/>", encoding="utf-8")
        return
    d0, d1 = decs[0], decs[-1] + 10
    mx_n = max(by_dec_n.values()) or 1
    mx_a = max(by_dec_a.values()) or 1
    bw = (W - 80) / (d1 - d0)
    half = (H - 70) / 2
    parts = [f"<svg xmlns='http://www.w3.org/2000/svg' width='{W}' height='{H}' viewBox='0 0 {W} {H}'>",
             f"<rect width='{W}' height='{H}' fill='#f7f5f1'/>"]
    tx0 = 40 + (target[0] - d0) * bw
    tx1 = 40 + (target[1] + 1 - d0) * bw
    parts.append(f"<rect x='{tx0:.1f}' y='20' width='{tx1-tx0:.1f}' height='{H-50}' fill='#efe3d8'/>")
    mid = 20 + half
    for d in decs:
        x = 40 + (d - d0) * bw
        hn = (by_dec_n.get(d, 0) / mx_n) * (half - 10)
        ha = (by_dec_a.get(d, 0) / mx_a) * (half - 10)
        parts.append(f"<rect x='{x+1:.1f}' y='{mid-hn:.1f}' width='{bw-2:.1f}' height='{hn:.1f}' fill='#3a3835'/>")
        parts.append(f"<rect x='{x+1:.1f}' y='{mid+12:.1f}' width='{bw-2:.1f}' height='{ha:.1f}' fill='#8e2f4c'/>")
        parts.append(f"<text x='{x+bw/2:.1f}' y='{H-12}' font-size='11' text-anchor='middle' fill='#6b6b63'>{d}</text>")
    parts.append(f"<line x1='40' y1='{mid:.1f}' x2='{W-40}' y2='{mid:.1f}' stroke='#ddd9d0'/>")
    parts.append(f"<text x='46' y='36' font-size='12' fill='#3a3835'>edificios</text>")
    parts.append(f"<text x='46' y='{mid+30:.1f}' font-size='12' fill='#8e2f4c'>huella m²</text>")
    parts.append("</svg>")
    out.write_text("".join(parts), encoding="utf-8")


def svg_contrast(ys: dict[int, float], ya: dict[int, float], out: Path) -> tuple[float, int]:
    """CDF acumuladas de conteo y huella; marca el punto de máxima divergencia."""
    W, H = 1200, 360
    tn, ta = sum(ys.values()), sum(ya.values())
    if tn == 0 or ta == 0:
        out.write_text("<svg xmlns='http://www.w3.org/2000/svg'/>", encoding="utf-8")
        return 0.0, 0
    years = sorted(set(ys) | set(ya))
    y0, y1 = years[0], years[-1]
    cn = ca = 0.0
    pts_n, pts_a, d_max, peak = [], [], 0.0, y0
    for y in years:
        cn += ys.get(y, 0.0)
        ca += ya.get(y, 0.0)
        fn, fa = cn / tn, ca / ta
        pts_n.append((y, fn))
        pts_a.append((y, fa))
        if abs(fn - fa) > d_max:
            d_max, peak = abs(fn - fa), y
    def X(y): return 50 + (y - y0) / max(y1 - y0, 1) * (W - 100)
    def Y(f): return 30 + (1 - f) * (H - 80)
    pl_n = " ".join(f"{X(y):.1f},{Y(f):.1f}" for y, f in pts_n)
    pl_a = " ".join(f"{X(y):.1f},{Y(f):.1f}" for y, f in pts_a)
    parts = [f"<svg xmlns='http://www.w3.org/2000/svg' width='{W}' height='{H}' viewBox='0 0 {W} {H}'>",
             f"<rect width='{W}' height='{H}' fill='#f7f5f1'/>",
             f"<line x1='50' y1='{Y(0):.1f}' x2='{W-50}' y2='{Y(0):.1f}' stroke='#ddd9d0'/>",
             f"<line x1='50' y1='{Y(1):.1f}' x2='{W-50}' y2='{Y(1):.1f}' stroke='#ddd9d0'/>",
             f"<polyline points='{pl_n}' fill='none' stroke='#3a3835' stroke-width='2'/>",
             f"<polyline points='{pl_a}' fill='none' stroke='#8e2f4c' stroke-width='2'/>",
             f"<line x1='{X(peak):.1f}' y1='30' x2='{X(peak):.1f}' y2='{Y(0):.1f}' stroke='#8e2f4c' stroke-dasharray='4 3'/>",
             f"<text x='{X(peak)+6:.1f}' y='44' font-size='12' fill='#8e2f4c'>|D| máx = {d_max:.3f} en {peak}</text>",
             f"<text x='{X(y0):.1f}' y='{H-14}' font-size='11' fill='#6b6b63'>{y0}</text>",
             f"<text x='{X(y1):.1f}' y='{H-14}' font-size='11' text-anchor='end' fill='#6b6b63'>{y1}</text>",
             f"<text x='60' y='48' font-size='12' fill='#3a3835'>— edificios (CDF)</text>",
             f"<text x='60' y='66' font-size='12' fill='#8e2f4c'>— huella (CDF)</text>",
             "</svg>"]
    out.write_text("".join(parts), encoding="utf-8")
    return d_max, peak


# --------------------------------------------------------------------------
# HTML
# --------------------------------------------------------------------------

def esc(s) -> str:
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def card_html(c: dict) -> str:
    sig = "/".join(sorted(c["signals"]))
    ortho = c["ortho"]
    probe_rows = "".join(
        f"<tr><td>{esc(p['kind'])}</td><td>{p['lon']:.5f}, {p['lat']:.5f}</td>"
        f"<td>{esc(ortho['pre']['year']) if ortho['pre']['year'] else '—'}: {esc(p['pre'])}</td>"
        f"<td>{esc(ortho['post']['year']) if ortho['post']['year'] else '—'}: {esc(p['post'])}</td></tr>"
        for p in c["probe_points"]
    )
    return f"""
<article class="card" id="{c['id']}">
  <header>
    <h2>{esc(c['id'])} · {esc(c['municipality'])}</h2>
    <p class="meta">señal {sig} · periodo objetivo {c['editorial_target_period'][0]}–{c['editorial_target_period'][1]}
    · {c['n_cells']} celda(s) · conocidos {c['n_known']} · cobertura {c['coverage']:.1f}%</p>
  </header>
  <table class="kv"><tbody>
    <tr><th>C-05 (edificios &gt; {c['ref_year']})</th><td>{c['c05']*100:.1f}%</td>
        <th>C-08 (huella &gt; {c['ref_year']})</th><td>{c['c08']*100:.1f}%</td>
        <th>|C05−C08|</th><td>{c['abs_c05_c08']*100:.1f} pt</td></tr>
    <tr><th>década dominante</th><td>{c['dominant_decade']}</td>
        <th>municipio</th><td>{esc(c['municipality'])} ({c['municipality_code']})</td>
        <th>fid rep.</th><td>{c['representative_fid']}</td></tr>
    <tr><th>municipios en el caso</th><td colspan='5'>{esc(', '.join(c['municipalities_spanned']))}</td></tr>
    {signal_rows(c)}
  </tbody></table>
  <p class="sem">El Catastro describe el parque que existe hoy. Parque actual ≠ parque histórico.
     Las ortofotos son evidencia visual, no fuente de métricas.</p>
  <h3>Cobertura orto (sonda real)</h3>
  <table class="probe"><thead><tr><th>punto</th><th>lon,lat</th><th>PRE</th><th>POST</th></tr></thead>
  <tbody>{probe_rows}</tbody></table>
  <p class="meta">PRE {esc(ortho['pre']['year']) if ortho['pre']['year'] else '—'}: {esc(ortho['pre']['status'])}
     · POST {esc(ortho['post']['year']) if ortho['post']['year'] else '—'}: {esc(ortho['post']['status'])}
     · alt. cubiertas PRE: {esc(ortho['pre']['alt_covered'])} · POST: {esc(ortho['post']['alt_covered'])}</p>
  <div class="imgs">
    <figure><img src="{c['id']}/map.png" alt="mapa analítico"><figcaption>mapa analítico</figcaption></figure>
    <figure><img src="{c['id']}/ortho_pre.png" alt="ortofoto PRE"><figcaption>PRE {esc(ortho['pre']['year'])} — {esc(ortho['pre']['status'])}</figcaption></figure>
    <figure><img src="{c['id']}/ortho_post.png" alt="ortofoto POST"><figcaption>POST {esc(ortho['post']['year'])} — {esc(ortho['post']['status'])}</figcaption></figure>
  </div>
  <figure class="wide"><img src="{c['id']}/pair.png" alt="par PRE/POST"><figcaption>par PRE/POST — misma cámara</figcaption></figure>
  <div class="imgs">
    <figure><img src="{c['id']}/temporal.svg" alt="distribución temporal"><figcaption>distribución temporal</figcaption></figure>
    <figure><img src="{c['id']}/contrast.svg" alt="contraste C-05/C-08"><figcaption>contraste edificios/huella</figcaption></figure>
  </div>
  <p class="meta">limitaciones: {esc(c['limitations'])}</p>
  <form class="editorial">
    <fieldset><legend>Decisión editorial (humana)</legend>
      <label><input type="radio" name="status-{c['id']}"> SELECT</label>
      <label><input type="radio" name="status-{c['id']}"> REJECT</label>
      <label><input type="radio" name="status-{c['id']}"> HOLD</label>
      <select name="reason-{c['id']}">
        <option value="">— razón —</option>
        <option>STRONG_TEMPORAL_PATTERN</option><option>STRONG_BUILDING_FOOTPRINT_CONTRAST</option>
        <option>STRONG_SPATIAL_COHERENCE</option><option>STRONG_ORTHO_EVIDENCE</option>
        <option>DISTINCT_FROM_OTHER_SELECTED</option><option>WEAK_VISUAL_EVIDENCE</option>
        <option>REDUNDANT_WITH_OTHER_CASE</option><option>ORTHO_INADEQUATE</option>
        <option>SEMANTICALLY_AMBIGUOUS</option><option>OTHER</option>
      </select>
      <textarea name="note-{c['id']}" placeholder="nota editorial" rows="2"></textarea>
    </fieldset>
  </form>
</article>"""


def signal_rows(c: dict) -> str:
    rows = []
    if "A" in c["signals"]:
        a = c["signal_detail"]["A"]
        rows.append(f"<tr><th>A concentración</th><td colspan='5'>share {a['share']*100:.1f}% en {a['decade']}s (rank {a['rank']})</td></tr>")
    if "B" in c["signals"]:
        b = c["signal_detail"]["B"]
        rows.append(f"<tr><th>B divergencia</th><td colspan='5'>|D| {b['d']:.3f} en {b['at_year']} (rank {b['rank']})</td></tr>")
    if "C" in c["signals"]:
        k = c["signal_detail"]["C"]
        rows.append(f"<tr><th>C componente</th><td colspan='5'>{k['size']} celdas · {k['known_total']} conocidos · {k['decade']}s (rank {k['rank']})</td></tr>")
    return "".join(rows)


def index_html(recs: list[dict], audit: dict) -> str:
    cards = "".join(card_html(c) for c in recs)
    toc = "".join(
        f"<li><a href='#{c['id']}'>{c['id']}</a> {esc(c['municipality'])} · {'/'.join(sorted(c['signals']))} · {c['dominant_decade']}s</li>"
        for c in recs
    )
    return f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Mesa editorial G2 — 21 candidatos</title>
<style>
body{{font-family:Georgia,serif;margin:0;background:#f7f5f1;color:#1c1a17}}
header.top{{padding:2rem; border-bottom:2px solid #1c1a17}}
h1{{margin:0 0 .4rem}} .meta{{color:#6b6b63;font-size:.85rem}}
ol.toc{{columns:3;max-width:1100px}}
article.card{{background:#fff;margin:2rem auto;max-width:1240px;padding:1.4rem 1.6rem;border:1px solid #ddd9d0}}
article.card h2{{margin:.1rem 0 .2rem}}
table.kv th{{text-align:left;color:#6b6b63;font-weight:400;font-size:.8rem;padding-right:.8rem}}
table.kv td{{font-variant-numeric:tabular-nums;padding-right:1.6rem}}
table.probe{{border-collapse:collapse;font-size:.8rem}}
table.probe td,table.probe th{{border:1px solid #ddd9d0;padding:.2rem .6rem}}
.imgs{{display:flex;gap:1rem;flex-wrap:wrap}}
figure{{margin:.6rem 0}} figure img{{max-width:590px;border:1px solid #ddd9d0;display:block}}
figure.wide img{{max-width:1200px}}
figcaption{{font-size:.75rem;color:#6b6b63}}
.sem{{background:#efe3d8;padding:.5rem .8rem;font-size:.85rem}}
.editorial fieldset{{border:1px dashed #a9a49a;margin-top:.8rem}}
.editorial label{{margin-right:1rem;font-size:.85rem}}
textarea{{width:100%;margin-top:.4rem}}
</style></head><body>
<header class="top"><h1>Mesa editorial — 21 candidatos S3</h1>
<p class="meta">Herramienta interna de revisión (G2-C1). No es UI de producto. Sin ranking ni puntuación:
el editor elige ~5 con evidencia equivalente. Universo: {audit['universe']} celdas ·
base {audit['base']} · componentes {audit['components']} · rechazados S3: {', '.join(audit['rejected'])}.</p>
<ol class="toc">{toc}</ol></header>
{cards}
</body></html>"""


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------

def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    cand = json.loads((S3 / "candidates.json").read_text(encoding="utf-8"))
    universe = {r["fid"]: r for r in json.loads((S3 / "universe.json").read_text(encoding="utf-8"))}
    cells_gj = json.loads((GJ / "cells.geojson").read_text(encoding="utf-8"))
    geom_by_fid = {f["properties"]["fid"]: shape(f["geometry"]) for f in cells_gj["features"]}
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    campaigns = sorted(catalog["campaigns"], key=lambda c: c["year"])
    munis = {m["cod"]: m for m in json.loads(MUNIS.read_text(encoding="utf-8"))["municipalities"]}

    def series_for(mun: int) -> dict:
        return json.loads((SERIES / f"{mun:03d}.json").read_text(encoding="utf-8"))

    records = []
    for key in cand["selected"]:
        c = cand["candidates"][key]
        comp = c["component"]
        member_fids = comp["members"] if comp else [c["fid"]]
        rep_fid = comp["rep_fid"] if comp else c["fid"]
        rec_cells = [universe[f] for f in member_fids]
        mun_code = universe[rep_fid]["mun"]
        mun_name = universe[rep_fid]["mun_name"]
        geoms = [geom_by_fid[f] for f in member_fids]
        rep_geom = geom_by_fid[rep_fid]
        cen = rep_geom.centroid

        # series agregadas (suma de miembros)
        ys: dict[int, float] = defaultdict(float)
        ya: dict[int, float] = defaultdict(float)
        series = series_for(mun_code)
        for f in member_fids:
            ent = series.get(str(f))
            if not ent:
                continue
            for y, n in parse_series(ent[0]).items():
                ys[y] += n
            for y, a in parse_series(ent[1]).items():
                ya[y] += a

        n_known = sum(r["known"] for r in rec_cells)
        n_total = sum(r["n"] for r in rec_cells)
        coverage = 100.0 * n_known / n_total if n_total else 0.0

        # periodo objetivo determinista
        if "A" in c["signals"]:
            dec = universe[c["fid"]]["a"]["decade"]
        elif "B" in c["signals"]:
            dec = decade_of(universe[c["fid"]]["b"]["at_year"])
        else:
            dec = comp["decade"]
        target = (dec, dec + 9)
        ref_year = target[1]

        # C-05 / C-08 en ref_year (posteriores a ref / total conocido)
        tot_n = sum(ys.values())
        tot_a = sum(ya.values())
        c05 = sum(n for y, n in ys.items() if y > ref_year) / tot_n if tot_n else None
        c08 = sum(a for y, a in ya.items() if y > ref_year) / tot_a if tot_a else None
        abs_diff = abs(c05 - c08) if c05 is not None and c08 is not None else None

        # campañas PRE / POST
        pre = next((x for x in reversed(campaigns) if x["year"] <= target[0]), None)
        post = next((x for x in campaigns if x["year"] > target[1]), None)

        # puntos de sonda
        points = [{"kind": "representative", "lon": cen.x, "lat": cen.y}]
        if comp and len(member_fids) > 1:
            bx0, by0, bx1, by1 = (
                min(g.bounds[0] for g in geoms), min(g.bounds[1] for g in geoms),
                max(g.bounds[2] for g in geoms), max(g.bounds[3] for g in geoms),
            )
            corners = [(bx0, by0), (bx1, by0), (bx0, by1), (bx1, by1)]
            extra = []
            for cx, cy in corners:
                g = min(geoms, key=lambda gg: (gg.centroid.x - cx) ** 2 + (gg.centroid.y - cy) ** 2)
                extra.append({"kind": "extent", "lon": g.centroid.x, "lat": g.centroid.y})
            seen = {(round(p["lon"], 6), round(p["lat"], 6)) for p in points}
            for p in extra:
                k2 = (round(p["lon"], 6), round(p["lat"], 6))
                if k2 not in seen and len(points) < MAX_COMPONENT_POINTS:
                    points.append(p)
                    seen.add(k2)

        # sondas
        ortho = {"pre": {"year": pre["year"] if pre else None,
                         "source": pre["source"] if pre else None,
                         "status": "NO_PRE" if not pre else None, "alt_covered": []},
                 "post": {"year": post["year"] if post else None,
                          "source": post["source"] if post else None,
                          "status": "NO_POST" if not post else None, "alt_covered": []}}
        for p in points:
            p["pre"] = probe_campaign(pre, p["lon"], p["lat"]) if pre else "NO_PRE"
            p["post"] = probe_campaign(post, p["lon"], p["lat"]) if post else "NO_POST"
            time.sleep(0.05)
        def stat(res):
            if all(r == "AVAILABLE" for r in res):
                return "AVAILABLE"
            if any(r == "AVAILABLE" for r in res):
                return "PARTIAL"
            if any(r == "SERVICE_ERROR" for r in res):
                return "SERVICE_ERROR"
            return "NOT_COVERED"
        if pre:
            ortho["pre"]["status"] = stat([p["pre"] for p in points])
        if post:
            ortho["post"]["status"] = stat([p["post"] for p in points])

        # alternativas cubiertas (campo separado — nunca sustituye PRE/POST)
        def alternatives(exclude_year, prefer_year):
            alts = []
            others = sorted(
                (x for x in campaigns if x["year"] != exclude_year),
                key=lambda x: abs(x["year"] - prefer_year))
            for alt in others[:4]:
                st = probe_campaign(alt, cen.x, cen.y)
                time.sleep(0.05)
                if st == "AVAILABLE":
                    alts.append(alt["year"])
                if len(alts) >= 2:
                    break
            return alts

        if ortho["pre"]["status"] != "AVAILABLE":
            ortho["pre"]["alt_covered"] = alternatives(pre["year"] if pre else 0, target[0])
        if ortho["post"]["status"] != "AVAILABLE":
            ortho["post"]["alt_covered"] = alternatives(post["year"] if post else 0, target[1])

        # viewport + render
        vb = fit_view(geoms)
        view = View(vb)
        cand_dir = OUT / key
        cand_dir.mkdir(exist_ok=True)
        ctx = [g for f, g in geom_by_fid.items()
               if f not in member_fids and g.intersects(box(*merc_to_lonlat(vb[0], vb[1]), *merc_to_lonlat(vb[2], vb[3])))]
        render_map(view, geoms, ctx, cand_dir / "map.png")

        pre_img, pre_fetch = (fetch_ortho(pre, vb) if pre else (None, "NO_PRE"))
        post_img, post_fetch = (fetch_ortho(post, vb) if post else (None, "NO_POST"))
        ortho["pre"]["fetch"] = pre_fetch
        ortho["post"]["fetch"] = post_fetch
        pre_fin = overlay_cells(pre_img, view, geoms) if pre_img else status_image(pre_fetch, pre["year"] if pre else None)
        post_fin = overlay_cells(post_img, view, geoms) if post_img else status_image(post_fetch, post["year"] if post else None)
        pre_fin.save(cand_dir / "ortho_pre.png")
        post_fin.save(cand_dir / "ortho_post.png")
        render_pair(pre_fin, post_fin,
                    ortho["pre"]["year"], ortho["post"]["year"], cand_dir / "pair.png")

        by_dec_n = {d: sum(n for y, n in ys.items() if decade_of(y) == d) for d in sorted({decade_of(y) for y in ys})}
        by_dec_a = {d: sum(a for y, a in ya.items() if decade_of(y) == d) for d in sorted({decade_of(y) for y in ya})}
        svg_temporal(by_dec_n, by_dec_a, target, cand_dir / "temporal.svg")
        d_max, peak = svg_contrast(dict(ys), dict(ya), cand_dir / "contrast.svg")

        sig_detail = {}
        u = universe[rep_fid]
        if "A" in c["signals"]:
            sig_detail["A"] = u["a"]
        if "B" in c["signals"]:
            sig_detail["B"] = u["b"]
        if "C" in c["signals"]:
            sig_detail["C"] = {"size": comp["size"], "known_total": comp["known_total"],
                               "decade": comp["decade"], "rank": comp["rank"]}

        limitations = ["parque actual ≠ parque histórico"]
        if not ya:
            limitations.append("sin serie de huella (ya)")
        if ortho["pre"]["status"] != "AVAILABLE":
            limitations.append(f"PRE {ortho['pre']['status']}")
        if ortho["post"]["status"] != "AVAILABLE":
            limitations.append(f"POST {ortho['post']['status']}")

        records.append({
            "id": key,
            "signals": list(c["signals"].keys()),
            "signal_detail": sig_detail,
            "municipality": mun_name,
            "municipality_code": mun_code,
            "municipalities_spanned": sorted({r["mun_name"] for r in rec_cells}),
            "municipality_slug": munis.get(mun_code, {}).get("slug"),
            "representative_fid": rep_fid,
            "component_members": member_fids if comp else None,
            "n_cells": len(member_fids),
            "n_known": n_known,
            "n_total": n_total,
            "coverage": round(coverage, 1),
            "bbox": [round(v, 6) for v in (min(g.bounds[0] for g in geoms), min(g.bounds[1] for g in geoms),
                                           max(g.bounds[2] for g in geoms), max(g.bounds[3] for g in geoms))],
            "centroid": [round(cen.x, 6), round(cen.y, 6)],
            "dominant_decade": dec,
            "editorial_target_period": list(target),
            "ref_year": ref_year,
            "c05": c05, "c08": c08, "abs_c05_c08": abs_diff,
            "divergence_d_max": d_max, "divergence_at_year": peak,
            "year_distribution": {str(d): n for d, n in sorted(by_dec_n.items())},
            "footprint_distribution": {str(d): round(a, 1) for d, a in sorted(by_dec_a.items())},
            "ortho": ortho,
            "probe_points": points,
            "viewport_3857": [round(v, 1) for v in vb],
            "limitations": "; ".join(limitations),
            "editorial_status": "PENDING_HUMAN",
            "primary_reason": None,
            "editorial_note": None,
        })
        print(f"{key}: {mun_name} {'/'.join(c['signals'])} dec={dec} "
              f"pre={ortho['pre']['status']}({ortho['pre']['year']}) post={ortho['post']['status']}({ortho['post']['year']})")

    audit = {
        "universe": len(universe),
        "base": sum(1 for r in universe.values() if r["base"]),
        "components": json.loads((S3 / "exclusions.json").read_text(encoding="utf-8"))["components"],
        "rejected": cand["rejected"],
    }
    (OUT / "candidates.json").write_text(
        json.dumps({"audit_refs": {
            "spike_s3_selected": "evidence/g2/spike-s3/candidates.json",
            "spike_s3_universe": "evidence/g2/spike-s3/universe.json",
            "spike_s3_exclusions": "evidence/g2/spike-s3/exclusions.json",
            "rejected_s3": cand["rejected"],
        }, "candidates": records}, ensure_ascii=False, indent=1),
        encoding="utf-8")
    (OUT / "index.html").write_text(index_html(records, audit), encoding="utf-8")

    # manifest SHA-256 (sin timestamps: regeneración debe ser idéntica)
    man = {}
    for p in sorted(OUT.rglob("*")):
        if p.is_file() and p.name != "manifest.json":
            man[str(p.relative_to(OUT))] = hashlib.sha256(p.read_bytes()).hexdigest()
    (OUT / "manifest.json").write_text(json.dumps(man, indent=1), encoding="utf-8")
    print(f"\n{len(records)} dossiers · manifest {len(man)} ficheros")
    return 0


if __name__ == "__main__":
    sys.exit(main())
