# G0 — Frontend vertical slice: evidencia

> Superficie mínima para demostrar el concepto end-to-end. **No es el producto final.**

Stack congelado: SvelteKit (adapter-static) · TypeScript · MapLibre GL JS 6.10.0 ·
PMTiles 4.5.0 · maplibre-gl-swipe 0.11.3.

## Qué demuestra

| Capacidad del gate | Estado |
|--------------------|--------|
| Seleccionar municipio (3) | ✅ selector con Bilbao / Leioa / Murueta |
| Seleccionar año | ✅ slider 1700–2026 con `aria-valuetext` |
| Ver edificios | ✅ capa PMTiles `buildings` (z10–16) |
| Distinguir anterior / posterior / `UNKNOWN` | ✅ color + **trama discontinua** para `UNKNOWN` (no solo color) |
| Estadística personalizada canónica | ✅ leída de agregados precalculados (`C-04/C-05`) |
| Cobertura del dato | ✅ siempre visible junto a la cifra |
| Seleccionar ortofoto histórica | ✅ selector de campaña (catálogo congelado) |
| Comparar con 2025 (swipe) | ✅ `SwipeControl` izquierda=histórica / derecha=`ORTO_2025` |

## Verificación en navegador (`browser-evidence.json`)

| Métrica | Valor |
|---------|-------|
| Peticiones PMTiles | **206 Partial Content** (Range) |
| Peticiones de ortofoto | **207 / 207 con HTTP 200** |
| Errores de consola | **0** |
| Canvas presentes | 2 (mapa + capa de comparación) |
| Atribución visible | Open Data Bizkaia (CC BY 4.0) + Catastro + licencia de código |

Estados capturados (texto real renderizado, sin lorem ipsum):

- Leioa 1987 → «En Leioa, **47.6 de cada 100** edificios actuales con año de construcción
  conocido se terminaron después de ese año.» Cobertura 2385/2390 (99.79 %).
- Bilbao 1975 → «**25.1 de cada 100**». Cobertura 13738/13750 (99.91 %).
- Murueta 1975 → «**48.6 de cada 100**». Cobertura 245/254 (96.46 %).

## Hallazgos

1. **PMTiles exige HTTP Range (Byte Serving).** Un servidor estático sin `Accept-Ranges`
   hace fallar el source `pmtiles://` con
   `Server returned no content-length header or content-length exceeding request`.
   → Requisito de despliegue. El servidor de prueba se corrigió (`scripts/static-server.mjs`).
2. **`nearest_ortho(1987) = 1990`**, no 1983. El ejemplo del encargo («1983») era
   ilustrativo; el contrato C-11 (minimizar |Δ|, empate → la más antigua) da 1990
   (Δ=3) frente a 1983 (Δ=4). El copy genera el valor calculado, no el ejemplo.
3. **La campaña 1975 no cubre todo el territorio** (teselas 404 en zonas de Bilbao y en
   Murueta): la cobertura es por campaña y por tesela. El frontend tiene un manejador de
   error con el copy de indisponibilidad.

## Accesibilidad (smoke, `a11y-smoke.json`)

- 3/3 controles con `<label>` real.
- Slider `type=range` con `min/max` y `aria-valuetext="año 1987"`.
- Teclado: foco al slider + `ArrowRight` cambia 1987 → 1988.
- Foco visible: `outline: auto 1px` (mejorable en G4).
- **axe-core: 0 violaciones** (se corrigió `landmark-unique` dando nombres únicos a los
  canvas de MapLibre).
- `prefers-reduced-motion: reduce` → sin animación de cámara; el mapa y el titular siguen
  funcionando.

> El gate completo de accesibilidad es G4; esto es solo el smoke de G0.

## Rendimiento — CHARACTERIZATION ONLY

`perf-characterization.json`. **Sin juicio**: el gate no evalúa rendimiento.

| Valor | Desktop 1440×900 | Móvil 390×844 (dsf 3) |
|-------|------------------|------------------------|
| DOM listo | 23 ms | 21 ms |
| Canvas presente | 91 ms | 157 ms |
| Primera tesela de ortofoto | 324 ms | 297 ms |
| Cambio de año (2 frames) | 10 ms | 18 ms |
| JS heap | 11,4 MB | 9,5 MB |
| Transfer total | 1.338.694 B | 1.338.694 B |
| JS de build (sin comprimir) | 1.214.081 B | — |

## Capturas

`evidence/g0/08-screenshots/` — 4 PNG verificados como **no blancos**
(23.512–61.603 colores únicos; `screenshot-analysis.json`):
desktop Leioa 1987, móvil Leioa 1987, desktop Bilbao 1975, desktop Murueta campaña 1956.
