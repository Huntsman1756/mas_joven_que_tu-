# G4-R · STATE ATLAS — estados reales del producto

Research-only. Build `f869de0`, Chromium 153, viewports 320/390/768/1440/1920.
Capturas en `state-atlas/`; métricas por estado en `state-atlas/atlas.json`.

## Lectura global (datos de `atlas.json`)

- Result page: **2,5 viewports** en 1440×900, **3,0–3,1** en 390×844.
- Botones en la página de resultado: **17–25** según estado.
- **Acciones visibles en el primer viewport: 10** (topbar×2, ViewSwitch×3,
  «Ver datos de esta zona», zoom ±, Reproducir/Reiniciar del timeline que
  asoma). En vista TIEMPO sube a **18** — el viewport con más controles.
- Deep link inválido (`place=inventado`) → cae a intro limpio (OK).
- El fullpage móvil confirma la secuencia plana: headline → mapa → timeline
  → distribución → propuesta ortofoto → propuesta histórico → MI EDIFICIO →
  DOS AÑOS → contraste → planning → caveat → footer.

## Estados capturados y observaciones

| Estado | Prerequisito | Controles visibles | Acción primaria | Problemas observados |
|--------|--------------|--------------------|-----------------|---------------------|
| 01-intro | — | year, place, CTA | «Ver mi Bizkaia» | Limpio. 4 acciones. |
| 02-year-entered | year relleno | + place activo | elegir lugar | OK |
| 03-place-suggestions | «bil» tecleado | listbox | elegir opción | Enter sin ArrowDown no compromete selección (ver BUGS) |
| 04-result-loading | deep link | — | esperar | transición correcta |
| 05-result-ready | year+place | 10 acciones 1er viewport | mirar mapa | El mapa en captura headless muestra celdas aún cargando (timing); en tiempos reales cubre. **La cifra del headline compite con 4 líneas de cobertura/cálculo/área antes del mapa.** |
| 06-mapa-cell | tap centro | tooltip/celda | «Ver datos de esta zona» | tooltip correcto |
| 07-tiempo-paused | view=time | **18 acciones** | Reproducir | viewport más denso del producto |
| 08-tiempo-playing | Play | animación | pausar | playhead avanza, caption explica |
| 09-tiempo-endpoint | play=2025 | igual | reiniciar | «Reiniciar desde 1987» visible |
| 10-foto | view=photo | panel bajo el mapa | comparar/nav campañas | FOTO no sustituye al mapa: PhotoPanel se renderiza **debajo** del mapband — el nombre «FOTO» sugiere cambio de escena pero es un panel adicional |
| 11-foto-not-covered | WMS 404 forzado | alternativas | probar otra campaña | estado explícito correcto |
| 12-foto-error | WMS abortado | reintentar | reintentar | estado explícito correcto |
| 13-histmap-proposal | place cubierto | «Ver el mapa histórico» | opt-in | propuesta honesta |
| 14-histmap-active | clic | overlay sobre mapa | ocultar | activa capa sobre el mapa |
| 15-address-closed | — | «Buscar una dirección» | opt-in | invitación clara |
| 16-address-open | clic | inputs calle/portal/bis | buscar | Escape no cierra (BUG B9) |
| 17-address-street | teclear calle | listbox | elegir | OK |
| 18-address-portals | portal con variantes | variantes | elegir portal | OK (corpus c01: 8 variantes) |
| 19-address-nora-only | Portugalete c06 | ficha | — | NORA_ONLY declarado con honestidad |
| 20-address-both-differ | Durango c13 | ficha | — | BOTH_DIFFER muestra ambas fuentes |
| 21-building-selected | building=+cámara | ficha + contexto | ver ficha | **sin lat/lon/z el restore falla en silencio (BUG mayor)** |
| 22-compare-active | compare=1960 | leyenda partición | quitar | partición correcta |
| 23-planning-municipal | — | 3 cifras + «Qué significa» | leer | editorial y compacto — buen modelo |
| 24-building-depth | building | ficha→planning→contexto | scroll | la profundidad aparece al final de la página, lejos del edificio en el mapa |
| 25-context-abdino | building V5 | ruido+paradas | overlay opt-in | funciona CON cámara en URL |
| 26-context-overlay | clic geom | overlay exclusiva | quitar | exclusividad correcta |
| 27-monte-inside | building V9 | monte TOKI-ALAI | overlay | OK |
| 28-context-negatives | building V8 | negativos explícitos | — | correcto: no inventar |
| 29-low-coverage | izurtza | aviso low-coverage | metodología | aviso visible y honesto |
| 30-invalid-deeplink | place falso | intro | reintentar | graceful |
| 31-invalid-ortho | ortho=9999 | ignora param | — | param ignorado en silencio (graceful) |

## Hallazgos del atlas (para el gate)

1. **La página no es alta (2,5–3 viewports) pero es plana**: todo el
   contenido tiene la misma jerarquía visual; el usuario no sabe qué
   importa primero tras el mapa.
2. **3 CTAs oscuros casi consecutivos** («Ver la foto de 1990», «Ver el
   mapa histórico 1923–25», «Buscar una dirección») con **3 estilos de
   botón distintos** (granate, marrón oscuro, negro) para la misma clase
   de acción opt-in.
3. **FOTO es un panel, no una escena**: el nombre del switch promete un
   modo y entrega una sección adicional bajo el mapa.
4. La profundidad por edificio (ficha → planning local → contexto) se
   acumula al final del scroll — con `building=` + cámara el usuario ve
   el edificio en el mapa arriba pero su información está 2+ viewports
   abajo.
5. El timeline con sus marcas de campaña duplica la función de entrada a
   la ortofoto (3 caminos: marca → OrthoControls → modo FOTO).
