# Qué conservar

«Conservar» significa no rediseñar sin una regresión demostrada; no certifica ausencia absoluta de defectos.

| Elemento | Motivo | Evidencia | Riesgo de tocarlo |
|---|---|---|---|
|Ano_Constr y parque actual|La verdad esencial de la pieza|`metrics.py`, `metrics.ts`, invariantes 112 municipios|Convertir supervivencia actual en historia total|
|Denominador año válido|Coherencia pipeline/UI|45 tests datos;244 Vitest; `data-invariants.json`|Cambiar porcentajes al esconder unknown|
|UNKNOWN/SUSPICIOUS/INVALID|No inventa precisión|Clasificador Python/SQL y tests|Asimilar 0 a antiguo|
|Campaña nominal y vuelo real|Evita falsa coincidencia con nacimiento|Foto 1956 muestra 1953–55; `metrics.py:102`|Perder trazabilidad al abreviar|
|Arquitectura estática, PMTiles|Adecuada a datos congelados, sin backend necesario|Build correcto; Range 206 observado; `engine.ts` lazy|Coste/operación nueva sin retorno|
|Catálogo municipal local|NORA no bloquea resultados locales|`nora.ts:83–109`; tests|Introducir dependencia externa en onboarding|
|Separación de modos semánticos|Cada vista responde pregunta distinta|5 modos observados; no colorear fotografías como métricas históricas|Mezclar ejes/afirmaciones|
|Tipografía Newsreader/SourceSans y base cromática|Jerarquía consistente y fuentes propias|01–14; `app.css`; contraste calculado|Rediseño caro sin ventaja demostrada|
|Swipe local MOB-R2|Imagen y handle visibles a 390×844|19-local-swipe-mobile.png; teclado y axe|Deshacer mejora pendiente de físico|
|Alternativas textuales y teclado|El canvas no es única vía|Snapshots; swipe ArrowRight; tablas/distribución|Quitar información por limpieza visual|
|Licencias separadas software/datos|Fundamental Base 18|OSS_REUSE, fuentes/manifiestos|Asumir MIT cubre datos|
|ES revisado|Ya existe revisión reciente|COPY_AUDIT§11|Reabrir todo el copy genera divergenciasEU|
|Historial de evidencias/gates|Permite auditar decisiones previas|run manifests y capturas fechadas|Reescribir retrospectivamente un PASS|

No reescribir Git history, cambiar framework, añadir 3 D/IA, backend, cuentas, analítica invasiva ni una app offline integral. No retirar caveats del todo; jerarquizarlos. No convertir automáticamente la candidatura en Investigación periodística: la categoría elegida excluye reportajes como eje principal.
