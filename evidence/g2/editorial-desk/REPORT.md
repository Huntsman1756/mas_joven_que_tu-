# G2-C1 — Mesa editorial de candidatos (dossier)

Generado por `pipeline/g2_editorial_desk.py`. Herramienta interna de revisión;
no es UI de producto y no selecciona ni puntúa nada.

## Universo preservado

- 21/21 candidatos del `candidates.json -> selected` del spike S3. Ni uno
  añadido, rerankeado ni reemplazado.
- Los 9 rechazados S3 permanecen en la auditoría (`audit_refs.rejected_s3`).
- Métricas trazadas a artefactos canónicos: `universe.json`, series
  `cells/{mun}.json` (`ys`/`ya`), `cells.geojson`, `catalog.json`. Sin
  corrección manual.

## Reglas congeladas aplicadas

- `editorial_target_period`: A→década de máxima concentración; B→década que
  contiene `at_year`; C→década dominante del componente. `[dec, dec+9]`.
- PRE = última campaña ≤ inicio del periodo; POST = primera > fin del periodo.
  Sin sustituciones silenciosas: `NO_PRE`/`NO_POST`/`NOT_COVERED`/
  `SERVICE_ERROR`/`PARTIAL` se registran como tales; las alternativas cubiertas
  van en `alt_covered` (campo separado).
- Sonda = mismo contrato que `probeCampaign` de la app (tile z15 Bizkaia /
  WMS 400 m geoEuskadi; imagen con >1 color ⇒ AVAILABLE). Puntos: centroide
  representativo + miembro más próximo a cada esquina del bbox en componentes
  (máx. 5) para hacer visible la cobertura parcial.
- Viewport determinista único: envolvente 3857 de las celdas + margen
  max(35 % del lado mayor, 600 m); canvas 1200×900. La misma cámara para mapa,
  PRE, POST y el par (los contornos de celda se dibujan sobre la ortofoto).

## Resultados clave (no selección)

- Señales: A×7, B×7, C×7. Décadas dominantes: 1970×13, 2000×3, 1990×3,
  1960×1, 1900×1.
- Municipios representativos: Mungia×5, Santurtzi×2, Muskiz×2,
  Abanto-Zierbena×2, + 11 más. Cuatro componentes C atraviesan límites
  municipales (p. ej. c2803 abarca 6 municipios del continuo del Gran Bilbao)
  — registrado en `municipalities_spanned`.
- Cobertura orto: 20/21 con PRE+POST AVAILABLE completos; **c89** es `NO_PRE`
  (no existe campaña ≤1900) con POST=1956 AVAILABLE.
- Huecos blancos estables en teselas 1956 (p. ej. c2803): cobertura real
  incompleta de la campaña a z15 — evidencia, no sustituida.
- Mayor |C-05−C-08| a ref_year: f4625 (90.8 pt), f3218 (89.9), f4008 (86.2),
  f4036 (83.8), f4738 (83.6).

## Determinismo

Dos regeneraciones consecutivas → manifest SHA-256 idéntico (128 ficheros,
0 diffs), incluidas las imágenes de servicio en vivo. Nota: la comparación
asume estabilidad del servicio; un `SERVICE_ERROR` transitorio quedaría
registrado como evidencia, no corregido.

## Estado H4

`PENDING_HUMAN` — los campos `editorial_status`, `primary_reason` y
`editorial_note` están en blanco en los 21 registros. H4 no puede cerrarse
hasta que el editor humano registre las decisiones.

## Archivos

- `candidates.json` — 21 registros canónicos completos + audit_refs
- `index.html` — mesa de revisión (misma evidencia por candidato, formulario
  editorial en blanco, sin ranking)
- `<id>/map.png · ortho_pre.png · ortho_post.png · pair.png · temporal.svg ·
  contrast.svg`
- `manifest.json` — SHA-256 de todo lo generado
