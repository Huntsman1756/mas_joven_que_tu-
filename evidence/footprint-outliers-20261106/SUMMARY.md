# Huella en planta dominada por una sola construcción — 06-11-2026

Hallazgo de QA visual: en el capítulo f4036 (Mungia) medio mapa es un único polígono
catastral `69-1042-3001-1-3` (1975, uso `D`, 1 altura, 0 viviendas, 497.934 m²).

- `sensitivity.py` → `sensitivity.json`: reproduce C-05/C-08 publicados de f4036, f4233
  y f4738 y recalcula C-08 sin la construcción de mayor huella.
- `mungia-2025.jpg`, `santurtzi-2025.jpg`: GetMap `ORTO_2025` (geoEuskadi, CC BY 4.0)
  sobre el bbox de cada polígono. Mungia: campo de golf. Santurtzi (`82-3-460-1-3`,
  133.150 m²): terminal de contenedores del puerto. Evidencia visual, no métrica.

Resultado: f4036 pasa de 1,9 % a 84,7 % sin esa construcción; f4738, de 94,7 % a 10,1 %.
Decisión del responsable (06-11-2026): mantener datos y métricas y declararlo en el copy
(`docs/METHODOLOGY.md` §5.1).
