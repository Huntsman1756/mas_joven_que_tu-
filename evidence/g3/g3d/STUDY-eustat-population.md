# Estudio G3-D §12 — Demografía temporal vía Eustat

Estado: **STUDY** (no implementado públicamente en G3-D).
Fecha del probe: 2026-09-19 · Evidencia cruda: `probe-eustat.json`.

## Pregunta de producto

> «¿Cómo ha cambiado la población del municipio mientras cambia el parque
> actual registrado?»

Sin correlación ni causalidad: dos series descriptivas, cada una con su
fuente. G3-X demostró que ODB no tiene serie demográfica municipal; la
fuente oficial es Eustat (Instituto Vasco de Estadística).

## API verificada

PXWeb (estándar estadístico, JSON):

```
https://www.eustat.eus/bankupx/api/v1/es/DB
```

- `GET .../DB` → catálogo de 2 326 tablas (`id`, `type`, `text`, `updated`).
- `GET .../DB/<tabla>.px` → metadatos (dimensiones, valores, etiquetas).
- `POST .../DB/<tabla>.px` → datos (`json-stat2`, `csv`, `px`…).
- Verificado end-to-end: query Bilbao (`48020`) × todos los periodos de
  `ep31` devuelve la serie real 1900→2001 (102 845 → 349 972 hab.;
  pico 1981 — consistente con la historia conocida de Bilbao).

## Tablas candidatas verificadas

| tabla | título | periodos | dim. municipal |
|-------|--------|----------|----------------|
| `PX_010152_cepv1_ep31.px` | Población de la C.A. de Euskadi **de hecho** por ámbitos territoriales. 1900–2001 | 14 censales (1900…2001) | 112 municipios 48xxx |
| `PX_010154_cepv1_ep06b.px` | Población por ámbitos territoriales, grandes grupos de edad y sexo. 2001–2025 | 27 anuales (`20010101`…`20250101`, con algún `0701`) | 113 ámbitos 48xxx |

La dimensión `ámbitos territoriales` incluye CA → territorios históricos →
comarcas → **municipios con código INE de 5 dígitos** (`48020` = Bilbao).
Mapeo directo con nuestras claves: `48` + código municipal de 3 dígitos
(el mismo dominio que Catastro). Cobertura completa de los 112 municipios
del proyecto (el 113.º ámbito de `ep06b` es un agregado; verificar al
adoptar).

## Semántica a contraer si se adopta

- **«Población de hecho»** (`ep31`) ≠ población de derecho/empadronada:
  ep31 es serie censal de hecho; etiquetarla con su nombre oficial.
- **Fecha de referencia:** `ep06b` mezcla referencias `0101` y `0701`
  (revisiones metodológicas de la EMH); cada año debe llevar su fecha de
  referencia literal, no «año» a secas.
- **Revisiones:** la EMH revisa años anteriores; congelar snapshot y
  declarar `updated` de la tabla (ep06b: 2026-03-09).
- **Censos interanuales:** ep31 tiene 14 periodos no equiespaciados
  (incluye 1975, 1981, 1986, 1991, 1996, 2001); la UI no debe
  interpolar ni sugerir continuidad anual.
- Licencia: datos Eustat reutilizables con atribución; **pendiente** leer
  el aviso legal exacto antes de adoptar (regla AGENTS §3).

## Encaje con la pregunta de producto

- Artefacto derivado natural: `{mun_code: [[ref_date, habitantes], ...]}`
  por municipio (~112 × ~40 puntos) — pequeño, first-party, sin
  dependencia en vivo.
- Copy seguro: «El padrón/censo registró {n} habitantes en {municipio} a
  {fecha de referencia}.» Nunca «la gente se fue porque se construyó».
- Diferencia con `census_population` (P-01, G3-B): aquel es el dato
  puntual del corte vigente; este sería la **serie**, otra pregunta.

## Riesgos

- Tentación narrativa de correlacionar población↔parque: prohibido por
  el encargo y por §10 (no causalidad). Si se adopta, presentar como
  serie independiente con su fuente y fecha.
- `ep06b` añade edad/sexo — no necesarios para la pregunta; usar solo el
  total para no inflar el artefacto.
- Municipios con cambios de denominación/fusión (Abanto y Ciérvana…) están
  resueltos por la fuente con código INE actual; no reinterpretar.

## Recomendación

**STUDY → adoptable en una fase posterior.** La vía técnica está probada
end-to-end y la clave municipal es compatible. Antes de adoptar:
(1) leer licencia; (2) elegir serie (propuesta: `ep31` 1900–2001 +
`ep06b` 2001–2025 con fechas de referencia literales, total sin desagregar);
(3) congelar snapshot PX + artefacto derivado por municipio;
(4) contrato en DATA_SEMANTICS (universo: población registrada, no
residentes «reales»; fecha de referencia explícita).
