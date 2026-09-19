# G4-R · COPY-AUDIT — las 285 strings del producto

Fuente: `app/src/lib/i18n/es.ts` → `evidence/g4/research/copy-strings.json`
(285 claves; 58 > 80 caracteres).

## Estado general

El copy es la parte más sólida del producto: segunda persona honesta,
denominadores explícitos, negativos declarados, proveniencia en cada
módulo. Los problemas son de **sistema**, no de frases sueltas.

## Clasificación

| Tipo | n | Ejemplos | Estado |
|------|---|----------|--------|
| Headline/resultado | ~12 | hero.title, result.lead | fuerte |
| Instrucción | ~30 | address.label.*, time.* | correcto |
| CTA | ~25 | *.view, *.start, hero.cta | **3 estilos distintos** (ver §3) |
| Métrica/cifra | ~20 | contrast.*, result.* | correcto |
| Proveniencia | ~15 | *.source, *.sources, ortho.available | correcto pero repetitivo |
| Caveat/límite | ~18 | result.caveat, how.*, *.note | correcto pero disperso |
| Error | ~12 | error.*, *.service_error | correcto |
| Empty/negative | ~15 | *.none, *.not_mapped, *.outside | excelente (negativos honestos) |
| Explicación técnica | ~20 | how.*, planning.meaning | correcto |

## Hallazgos

### 1. El caveat «parque actual» aparece ~5 veces en distintas formas
`result.caveat`, `time.caption`, `how.nocalc`, `result.text_summary`,
`limitations` del corpus. Correcto repetir el contrato, pero la misma
idea con 5 redacciones distintas se lee como ruido. → **Una formulación
canónica** («El Catastro describe los edificios que existen hoy») usada
consistentemente, variando solo el contexto.

### 2. Tres verbos de opt-in con tres registros
- «Ver la foto de {year}» (imperativo + dato)
- «Ver el mapa histórico 1923–25» (imperativo + nombre técnico)
- «Buscar una dirección» (imperativo genérico)
- «Comprobar desde el aire» (photo.activate — ¡un cuarto!)
→ Un único patrón verbal para opt-ins de evidencia: p.ej. «Ver…» +
objeto concreto. Y «mapa histórico 1923–25» debería decir qué es antes
que cuándo («el mapa de 1923–25» ya lo dice la propuesta).

### 3. Jerga residual controlada pero presente
- «campaña» (ortho/photo/time.campaigns_note): término técnico de
  producción aérea. La UI lo explica («año nominal») pero el concepto se
  introduce antes de explicarse. Alternativa: «foto de {year}» en
  superficie, «campaña» solo en proveniencia.
- «huella en planta»: correcto y necesario por contrato; se explica en
  cada aparición — bien, pero la explicación parentética se repite 3×.
- «paradas de Bizkaibus»: correcto, es nombre propio del servicio.
- «celda»: map.cell.* lo usa — jerga interna que asoma en tooltip. El
  usuario ve zonas, no celdas. Alternativa: «esta zona».
- D/T/N en ruido: se muestran como día/tarde/noche — bien.

### 4. Duplicaciones terminológicas
- «edificios actuales» vs «parque» vs «parque actual» vs «los edificios
  que existen hoy» — cuatro formas del mismo universo. Elegir dos:
  «edificios actuales» (técnico, en métricas) y «los edificios que hoy
  forman {lugar}» (narrativo, en titulares).
- Fuentes escritas de ~6 formas: «Open Data Bizkaia — Diputación Foral
  de Bizkaia», «Open Data Bizkaia (Diputación Foral de Bizkaia)»,
  «geoEuskadi — Gobierno Vasco», «geoEuskadi / Gobierno Vasco»…
  → canonical source labels (una forma por fuente, corta).

### 5. Strings > 80 caracteres (58)
Casi todas son caveats/proveniencia/empty-states — longitud justificada
por el contrato (no esconder límites). Las que NO se justifican:
- `ortho.proposal`, `histmap.proposal`: una sola idea por propuesta.
- `time.campaigns_note`: dos ideas (qué son las marcas + nominal≠vuelo)
  → dividir o mover la segunda a «cómo lo sabemos».

### 6. Contratos semánticos en copy — verificación

| Contrato | ¿Respeta el copy? |
|----------|-------------------|
| parque actual ≠ histórico | sí, ~5 formas (ver §1) |
| nominal ≠ fecha de vuelo | sí, explícito |
| planeamiento ≠ predicción | sí (`planning.meaning`) |
| NOT_MAPPED ≠ cero | sí (`context.noise.not_mapped`) |
| monte ≠ espacio protegido | sí (`context.monte.source`) |
| NORA ≠ Catastro | sí (`address.provenance`) |
| solape ≠ causalidad | parcial — `planning.local.ambito_multi` lista sin juicio; ok |
| UNKNOWN ≠ 0 | sí (`how.unknown`) |

### 7. Conceptos introducidos antes de explicarse
- «campana/marca» en el eje antes de saber qué es una campaña.
- «C-05/C-08» NO aparece en copy de usuario (bien — es interno).
- «Año anómalo» en cobertura — aparece sin enlace a explicación en la
  misma línea; la explicación existe en cómo-lo-sabemos.
- «Más joven que tú» como título — funciona; el subtítulo hace el trabajo.

## Recomendaciones (sin reescribir aún)

1. **Una formulación canónica por contrato** — tablas en UX_COPY.
2. **Un patrón verbal de opt-in**: «Ver + evidencia concreta».
3. **Canonical source labels**: 6 fuentes → 6 etiquetas fijas.
4. Sustituir «celda» por «zona» en strings user-facing.
5. «Campaña» solo en proveniencia/metodología; superficie = «foto de {año}».
6. Mover la nota nominal≠vuelo del eje temporal a la propuesta ortofoto.
