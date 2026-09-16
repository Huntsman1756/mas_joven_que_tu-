# ADR-008 — Semántica de «parque actual» y prohibición de presentarlo como reconstrucción histórica

- **Estado:** aceptado
- **Fecha:** 2026-09-16

## Contexto

El Catastro describe los edificios que existen **hoy**. No contiene los edificios
demolidos. Es tentador (y periodísticamente atractivo) presentar el mapa como «cómo era
Bizkaia en 1956» o medir «crecimiento». Eso sería factualmente incorrecto.

## Decisión

El universo de datos es el **parque de edificios existente en el snapshot**
(`CURRENT_BUILDING_STOCK`). Se **prohíbe** presentarlo como reconstrucción histórica
completa. Las ortofotos se usan como evidencia visual, **no** como capa de datos.

## Motivos

- La ausencia actual de un edificio no implica que no existiera antes.
- Presentar el stock actual como reconstrucción histórica mezclaría observación y
  derivación, prohibido por las reglas del proyecto.
- La credibilidad del producto depende de no afirmar más de lo que el dato sostiene.

## Formulación obligatoria

Válido:
> «Así se distribuyen por año de construcción los edificios que existen hoy.»

Prohibido:
> «Así creció Bizkaia desde 1987.» · «Aquí no había nada.» · «Bizkaia creció un 42 %.»

## Consecuencias

- La métrica M-05 se formula siempre con denominador de **años conocidos**.
- El histograma se titula «edificios actuales por año de construcción».
- La sección *Cómo lo sabemos* explica explícitamente el universo y sus límites.
- Los capítulos de *Historias del cambio* incluyen obligatoriamente «Qué no sabemos».
- Prohibido derivar métricas históricas por computer vision sobre ortofotos.
