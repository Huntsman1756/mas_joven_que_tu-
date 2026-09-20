# G9 — auditoría editorial before/after

Pasada de copy/style hardening sobre `d2e3f8c` (G8). Sin cambios de datos,
cálculos ni semántica. Contrato: `docs/EDITORIAL_STYLE.md`.
Capturas: `bilbao-result.png`, `bilbao-context.png`, `mungia-context.png`,
`mungia-result.png`, `mungia-dist.png`, `story-f4036.png`.

## Before → after representativo

| Superficie | Antes | Después |
|---|---|---|
| Resultado · población (Bilbao 1952) | «Bilbao tiene hoy 346.933 habitantes empadronados (Eustat, padrón de 2025).» | «A 1 de enero de 2025, Bilbao tenía 346.933 habitantes empadronados.» + línea `.src` «Eustat · Padrón municipal» |
| Resultado · lead | «De los 13.738 edificios actuales con año registrado en Catastro, 9.289 se terminaron después de 1952.» | «9.289 de los 13.738 edificios actuales con año conocido se construyeron después de 1952.» |
| Card población | `346.933` / «habitantes empadronados (Eustat, padrón de 2025)» | `346.933` / «habitantes empadronados» / «1 ene 2025» |
| Card foto (Bilbao 1952 → campaña 1956) | `1956` / «la foto aérea oficial más cercana a tu año» | `1956` / «la imagen aérea oficial más cercana a tu año» / «4 años después» |
| Card década | `2000–9` (bucket truncado) | «años 2000» (`decadeName`) |
| Contexto · población (Mungia 1979) | «Mungia tiene hoy 17.772 habitantes empadronados (Eustat, padrón de 2025). La observación de 1981 registraba 11.345 habitantes (censo).» | «A 1 de enero de 2025, Mungia tenía 17.772 habitantes empadronados. La observación oficial más cercana a tu año es el censo de 1981: 11.345 habitantes en Mungia.» |
| Contexto · viviendas | «En el censo de 1991 había 4.935 viviendas familiares; en el de 2021, 7.934.» | «Entre los censos de 1991 y 2021, las viviendas familiares pasaron de 4.935 a 7.934.» |
| Contexto · fuentes | «(Eustat, padrón municipal)» / «(Eustat, población de hecho)» por frase | «Eustat · padrón municipal y censos de población y vivienda» — una vez por bloque |
| Planeamiento | «A fecha de 2026-08-04, el planeamiento vigente registra en Mungia: 2122 viviendas pendientes de ejecución; 46,1 ha de suelo residencial vacante; 57,6 ha de suelo de actividad económica vacante.» | «A 4 de agosto de 2026, el planeamiento vigente de Mungia registraba 2.122 viviendas pendientes de ejecución, 46,1 ha de suelo residencial vacante y 57,6 ha de suelo para actividades económicas vacante.» |
| Swipe | chip «Hoy · 2025» | chip «Actualidad · 2025» (la campaña es una observación, no el día actual) |
| Historia f4036 · EL DATO | párrafo con «85,7 %… 1,9 %…» + debajo las dos cifras grandes otra vez | solo las cifras grandes + «El número de edificios y el terreno que ocupan cuentan historias distintas.» |
| Eje distribución | ticks `1900s 1910s …` (forma anglosajona) | ticks `1900 1910 …` (año de inicio de década) |
| Observación padrón mensual | «el padrón de 2022» para literal `20220701` | «el padrón de julio de 2022» (`obsLabel` distingue por literal) |

## Cobertura de la auditoría

- Municipios grandes (Bilbao), medios (Mungia) y la rama `exact`/`near` de
  la observación Eustat cubiertos por `resolvePopulationObs` + `obsLabel`.
- Años anteriores a la primera serie: `near` nombra el censo real más
  próximo; nunca interpola.
- Barrido de código: `slice(0,10)` de fechas solo alimenta `fmtDateEs`;
  ningún componente construye rangos ni decimales a mano.

## Contratos automatizados

- `format.test.ts` (10 its): miles 4+ cifras con `useGrouping: 'always'`,
  decimales con coma, fechas ISO → «4 de agosto de 2026», rangos
  `2000–2009` (regresión `2000–9`), `obsLabel` por familia/literal,
  `relYearLabel`/`relYearShort`, `joinEs`.
- `copylint.test.ts` bloque «G9»: fecha ISO, rango a una cifra, `%` sin
  espacio y «década de 1990s» prohibidos en el diccionario.
