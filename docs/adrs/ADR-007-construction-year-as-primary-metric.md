# ADR-007 — `Ano_Constr` como métrica primaria

- **Estado:** aceptado
- **Fecha:** 2026-09-16

## Contexto

La capa `Edificio` del Catastro de Bizkaia incluye varios campos temporales:
`Ano_Constr` (año de construcción), `Ano_Rehabi` (rehabilitación), `Ano_Reform` (reforma)
y `Ano_Calcul` (semántica desconocida). Hay que decidir cuál es la métrica primaria.

## Decisión

La métrica primaria es **`Ano_Constr`**. `Ano_Rehabi` y `Ano_Reform` **no** se usan como
año de construcción. `Ano_Calcul` queda **prohibido** como métrica hasta documentar su
significado.

## Motivos

- `Ano_Constr` es el campo que responde literalmente a la pregunta del producto
  («¿qué apareció después que tú?»).
- Una rehabilitación o reforma posterior no convierte un edificio antiguo en nuevo;
  usarla inflaría la sensación de construcción reciente.
- `Ano_Calcul` no está documentado en la fuente ⇒ usarlo fabricaría precisión.

## Evidencia

- Esquema real verificado (Leioa, 2026-09-03): existen los cuatro campos; `Ano_Rehabi`
  ≠ 0 en 105/2390 registros, `Ano_Reform` = 0 en todos, `Ano_Calcul` ≠ 0 en 9/2390.
- Cobertura de `Ano_Constr`: 99,79 % en Leioa.

## Consecuencias

- El objeto de datos expone `build_year` (= `Ano_Constr`, o `UNKNOWN`).
- `Ano_Rehabi`/`Ano_Reform` podrán ser capas/campos informativos **solo** si su semántica
  se documenta por completo; nunca sustituirán a `Ano_Constr`.
- `Ano_Calcul` se guarda en el dataset pero no se usa en ninguna métrica visible.
- Toda estadística respeta la clasificación `BEFORE`/`AFTER`/`UNKNOWN` de `DATA_SEMANTICS.md`.
