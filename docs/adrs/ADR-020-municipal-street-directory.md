# ADR-020: callejero municipal local (EUSTAT/NORA) para sugerencias de dirección

**Fecha:** 2026-09-21 · **Estado:** aceptado

## Contexto

«Mi edificio» pedía la calle por búsqueda libre contra el REST de NORA
(`/calles?descCalle=`), que exige una grafía muy próxima y no puede
devolver el callejero completo de un municipio (`descCalle` es
obligatorio; sin él → 204; `descCalle=%` devuelve ~16 316 calles de
toda la CAV, ~31 MB — inaceptable en cliente). El usuario pedía
sugerencias tolerantes a mayúsculas y tildes con casi-matches ofrecidos
sin autoselección.

Existe una fuente oficial descargable: la capa de **portales** del
Callejero de la CAPV (Open Data Euskadi/EUSTAT, `48_Atariak_Portales.csv`,
~23 MB, CC BY 4.0, actualización 2025-04-02). Cada fila lleva claves que
hemos verificado que encadenan con el REST de NORA:

- `Kalea-gakoa` == `calle.id` (verificado: Calle Mayor de Getxo
  `134804400000870` coincide con la respuesta de `/calles`).
- `Atari-gakoa` == `portal.id` (verificado: `84804400015688`).

## Decisión

1. `pipeline/g6_streets.py` genera `app/static/data/streets/<slug>.json`
   por municipio (112 ficheros, 6 340 calles): `{i, e, u, bis, n, nuc?}`
   — id NORA, nombre ES/EU, si la calle tiene portales bis y su recuento.
   QA en `data/qa/g6_streets.json`; manifiesto
   `data/manifests/eustat.callejero.nora.yaml`.
2. `src/lib/domain/streets.ts` carga el fichero por municipio, normaliza
   (NFD + sin marcas combinantes, minúsculas) y despoja el tipo de vía
   escrito por el usuario — los tipos se extraen del propio callejero
   oficial, así «Calle Ogoño», «Ogoño kalea» y «Ogoño (Calle)» resuelven
   lo mismo que «ogono», mientras «calle» a secas no casa nada. Ordena
   empieza-por → contiene, y solo si no hay coincidencia exacta ofrece
   casi-matches (Levenshtein acotado ≤2, consulta ≥4 caracteres). Nunca
   autoselecciona un casi-match.
3. El flujo de portal/número sigue siendo NORA REST (`listPortals`) —
   el fichero local solo sustituye la *búsqueda* de calle, no la
   resolución. Si el fichero no carga, se degrada a `searchStreets`.
4. El campo Bis solo se muestra cuando la calle elegida tiene portales
   bis en el callejero oficial (o los portales descargados lo muestran).
   El número se pide tras elegir calle, nunca antes.

## Evidencia

- `evidence/callejero/` — respuestas del REST y del CSV, verificación
  de claves, contratos `descCalle`/`descMunicipio`.
- `data/qa/g6_streets.json` — recuento por municipio.
- `scripts/g13_ux.mjs` — regresiones: tilde-insensible («ogono» → Ogoño),
  orden «tipo + nombre», casi-match sin autoselección, Bis condicional,
  número tras calle, edición que invalida la calle confirmada sin
  consultar portales stale.
- `src/lib/domain/streets.test.ts` — variantes de orden en ambos idiomas
  y límites del casi-match.

## Consecuencias

- Atribución obligatoria CC BY 4.0: «Eusko Jaurlaritza / Gobierno Vasco»
  — ya cubierta en la lista de fuentes (`sources.eustat.*`) y en el
  `source`/`license` de cada fichero.
- El callejero es una foto del CSV: cambios de callejero exigen
  regenerar (`python pipeline/g6_streets.py`).
- Cobertura: calles representadas en la capa de portales oficial (una
  vía sin portales no aparece). Los 112 ficheros cubren los 112
  municipios del catálogo — no «toda Bizkaia»: Usansolo (cod 916) tiene
  355 registros de portales en el CSV pero queda fuera por el corpus de
  edificios (gap G1), no por falta de callejero.
- Sin dependencias nuevas: matching propio, ~130 líneas.

## Alternativas descartadas

- **`/calles?descCalle=%` por municipio**: `descMunicipio` no filtra de
  verdad (contrato R1) y la respuesta es ~31 MB de toda la CAV.
- **Geocoder de terceros (photon, nominatim)**: rompe la cadena de
  claves NORA→portal→edificio y añade una fuente no oficial para datos
  que la Administración ya publica.
- **Sugerencias vía NORA con debounce** (status quo): sin tolerancia a
  tildes y dependiente de red en cada pulsación.
