# EDITORIAL_STYLE.md — contrato editorial temporal y numérico

Estado: **vigente** (G9). Todo texto público de la aplicación sigue estas
reglas. Los formatos se materializan en `app/src/lib/domain/format.ts` —
ningún componente improvisa fechas, números ni rangos propios.

## 1. Fechas públicas

- Nunca `YYYY-MM-DD` en copy ciudadano: `2026-08-04` → **«4 de agosto de 2026»**
  (`fmtDateEs`). Forma corta para cards: **«1 ene 2025»** (`fmtDateShortEs`).
- ISO se reserva a metadata técnica, manifests, atributos machine-readable
  y metodología avanzada.
- Observación con fecha efectiva: **«A 1 de enero de 2025, Bilbao tenía…»**.
- Observación anual sin día/mes: **«En 2021…»**. No inventar «1 de enero»
  si la fuente solo da año.

## 2. Años próximos al nacimiento

- La observación se nombra por lo que es: **«La observación oficial más
  cercana a tu año es el censo de 1950…»** (`obsLabel`: `place.obs.*`).
- Distancia explícita cuando ayuda: **«2 años antes de que nacieras»**
  (`relYearLabel`); en cards, **«2 años antes»** (`relYearShort`).
- Nunca llamar «tu año» a una observación que no coincide exactamente.

## 3. Periodos

- Prohibido `2000–9`. En tablas/metadata: **«2000–2009»** (`fmtYearRange`,
  `fmtDecade`). En copy narrativo: **«años 2000»** (`decadeName`).
- En dash `–` para rangos, no guion `-`.
- Etiquetas compactas aceptadas donde el espacio manda: eje de gráfico
  «2000», nombre de modo «Mapa 1923–25», campaña «1945–46».

## 4. Números en español

- Miles: **«13.738»** (`fmt`). Nunca en años.
- Decimales con coma: **«80,5»** (`fmtDec`, `fmtPct`).
- Porcentaje con espacio: **«59,9 %»**.
- Unidades con espacio: **«80,5 ha»** (`fmtHa`).

## 5. Terminología temporal

- «Hoy» solo para el estado conceptual del parque actual («los edificios
  que hoy forman Bilbao»). Nunca para una observación fechada: la ortofoto
  de 2025 o el padrón de 2025 no son «hoy» — se dice el año/fecha.

## 6. Fuentes

- Provenance una vez por bloque, con menor jerarquía (línea `.src` o
  disclosure «Fuente»): **«Eustat · Padrón municipal»**.
- No repetir `(Eustat, …)` / `(Catastro, …)` dentro de cada frase.
  Los paréntesis se reservan a aclaraciones.

## 7. Comparaciones

- Los pares de observaciones se escriben como comparación:
  **«Entre los censos de 1991 y 2021, las viviendas familiares pasaron de
  137.245 a 165.685.»** (`place.housing.then_now`).

## 8. Planeamiento

- **«A 4 de agosto de 2026, el planeamiento vigente de Bilbao registraba…»**
  (`planning.intro` + `planning.item.*` unidos con `joinEs` — una frase,
  no una lista de campos).
- Nunca «construirá»: capacidad registrada, no predicción. El disclaimer
  `planning.meaning` es obligatorio.

## 9. Edificios

- Resultado: **«2.679 de los 4.472 edificios actuales con año conocido se
  construyeron después de 1979.»** La cobertura va en línea propia
  (`result.coverage`), sin repetir denominadores en párrafos seguidos.

## 10. Cards

- Estructura: **cifra · concepto · contexto temporal opcional**.
  Ej.: «17.772 / habitantes empadronados / 1 ene 2025»,
  «1977 / imagen aérea más cercana / 2 años antes». Sin frases largas.

## 11. Historias

- `QUÉ VEMOS → EL DATO → QUÉ SABEMOS Y QUÉ NO SABEMOS`. En capítulos con
  contraste (dos denominadores), EL DATO son las cifras grandes + una
  frase interpretativa: **dato → lectura**, nunca dato → dato → lectura.

## 12. Implementación

- Helpers en `app/src/lib/domain/format.ts`: `fmt`, `fmtDec`, `fmtPct`,
  `fmtHa`, `fmtDateEs`, `fmtDateShortEs`, `fmtYearRange`, `fmtDecade`,
  `decadeName`, `relYearLabel`, `relYearShort`, `obsLabel`, `joinEs`.
- Todo literal visible sale del diccionario i18n (C1); los helpers que
  producen copy reciben `t()` — el dominio no incrusta español.
- `copylint.test.ts` (test «G9») bloquea en el diccionario: fechas ISO,
  rangos a una cifra (`2000–9`), `%` sin espacio, décadas «1990s».
