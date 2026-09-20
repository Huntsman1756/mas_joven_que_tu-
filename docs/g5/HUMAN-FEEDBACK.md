# G5 · HUMAN FEEDBACK — congelado

> Fecha de registro: 2026-09-20 · Rama: `g5-editorial-redesign`
> Origen: revisión humana real del producto tras G4-H2 (candidato
> `4a3d1ed361013d558acb4c3334560737113d9528`).
> Este documento fija **por qué existe G5**. No modifica ni reescribe
> la evidencia de G4; la revisión humana de G4 queda registrada como
> `CHANGES_REQUIRED_BY_HUMAN`.

## Hallazgos (verbatim en significado)

1. Las superficies históricas/fotográficas se solapan visualmente y
   resultan difíciles de entender.
2. La paleta actual resulta demasiado apagada.
3. Demasiadas cajas/tarjetas/rectángulos dan a la interfaz un aire de
   «generada por IA» / dashboard.
4. El producto habla de edificios de forma demasiado repetitiva y
   necesita más contexto territorial/humano procedente de fuentes
   públicas oficiales cuando sea útil.
5. El frontend puede mejorar sustancialmente.
6. El modelo temporal es confuso: el eje temporal catastral, las fechas
   de campaña de ortofoto y el mapa histórico 1923–25 aparecen
   demasiado cerca/equivalentes.
7. Una lectora normal puede no entender por qué 1923–25 aparece
   separado del resto de fechas.
8. El copy público del cálculo es demasiado técnico: «Numerador»,
   «Denominador», `Ano_Constr`, «DATA_SEMANTICS §…» no deben dominar
   el producto de consumo.
9. El resultado principal debe ser comprensible sin conocer la
   metodología.
10. El producto es técnicamente fuerte pero todavía no es suficientemente
    memorable como experiencia de periodismo de datos.

## Estado del gate humano G4

    GH5 = CHANGES_REQUIRED_BY_HUMAN

## Estado de la revisión G4-H1/H2 previa

- La remediación editorial/factual (H1) y el pulido visual (H2) fueron
  verificados y aceptados como correcciones.
- Los artefactos de revisión anteriores (`evidence/g4/human-review/`)
  NO se reescriben: documentan el estado que generó este feedback.

## Consecuencia

G5 es una fase de producto **posterior y downstream**: rediseño
editorial/público final sobre la base técnica ya validada
(G1/G2/G3 semántica + G4 automatización). La complejidad sigue
existiendo debajo; la experiencia visible debe sentirse simple.
