# G4-R · RUBRIC-AUDIT — contra los criterios reales del concurso

Criterios: dinamismo 25 % · calidad/comprensión 25 % · rigor/datos 25 % ·
innovación 15 % · diseño/usabilidad 10 %.

## 1. Dinamismo (25 %)

**Ya demuestra:** Play temporal que repinta el mapa en vivo; scrub;
ViewSwitch instantáneo; deep links que reconfiguran toda la escena;
comparador de campañas; overlays opt-in exclusivas.
**Evidencia más fuerte:** pulsar Play y ver el municipio «construirse» —
es el momento del producto.
**Evidencia débil:** el jurado tiene que descubrir Play por sí mismo —
está en la vista TIEMPO, no activo por defecto (correcto, pero hay que
invitarlo).
**Redundante:** tres entradas a ortofoto (marca timeline + OrthoControls +
FOTO) — dinamismo percibido < dinamismo real.
**Lo que el jurado entiende en 30 s:** la cifra del titular + el mapa
coloreado.
**Lo que requiere explicación:** qué hacen las marcas del eje; diferencia
year/playYear/compareYear.
**Lo que puede dañar el criterio:** que el jurado nunca llegue a TIEMPO.

## 2. Calidad / comprensión (25 %)

**Ya demuestra:** headline personalizado claro; «de cada 100» como
lenguaje; cada módulo con su pregunta; negativos explícitos.
**Evidencia más fuerte:** «Entre los edificios actuales cuyo año consta
en Catastro, 47,6 de cada 100…» — comprensión inmediata con denominador.
**Evidencia débil:** la secuencia plana posterior — 8 bloques con igual
jerarquía diluyen la comprensión del conjunto (ver STATE_ATLAS §1).
**Redundante:** distribución por décadas + contraste edificios/huella —
dos lecturas de la misma cifra base.
**En 30 s:** qué es el producto y qué responde.
**Requiere explicación:** «huella en planta», «parque actual», bandas de
ruido D/T/N, qué mide exactamente el contraste.
**Puede dañar:** la sensación de «muchos módulos» = trabajo acumulado, no
producto pensado.

## 3. Rigor / calidad del dato (25 %)

**Ya demuestra:** contratos visibles (cobertura, denominador, numerador);
UNKNOWN≠0; SUSPICIOUS declarado («5 con año anómalo»); parque actual ≠
histórico en caveat permanente; año nominal ≠ fecha de vuelo; NORA vs
Catastro con desacuerdo explícito; fail-closed en todas las fuentes;
«cómo lo sabemos».
**Evidencia más fuerte:** BOTH_DIFFER — dos fuentes oficiales en
desacuerdo mostrado sin resolverlo (único en el benchmark).
**Evidencia débil:** el rigor está distribuido en microcopy — un jurado
rápido puede no verlo; metodología vive en otra página.
**Redundante:** ninguna — el rigor no sobra, falta visibilizarlo.
**En 30 s:** la línea de cobertura bajo el titular.
**Requiere explicación:** por qué «parque actual ≠ histórico» importa;
qué significa «año anómalo».
**Puede dañar:** que el jurado interprete «47,6 de cada 100» como precisión
inventada si no lee el denominador (riesgo mitigado por el copy, no por
la jerarquía).

## 4. Innovación (15 %)

**Ya demuestra:** personalización año+lugar; tres tiempos en una escena;
identidad de edificio por doble fuente; corpus determinista de historias;
deep-link completo de estado.
**Evidencia más fuerte:** «máquina de preguntas» — cambiar cualquier
parámetro reejecuta la respuesta, con URL compartible.
**Evidencia débil:** la innovación está en el modelo, no en la superficie —
un jurado de 30 s ve «otro mapa con slider».
**En 30 s:** nada diferencial salvo el titular en segunda persona.
**Puede dañar:** que el jurado lo clasifique como «visor catastral +» —
la diferenciación hay que hacerla visible en el primer tramo.

## 5. Diseño / usabilidad (10 %)

**Ya demuestra:** tipografía sobria, color funcional, cero dashboard,
44px, reduced-motion, 3 motores, axe limpio.
**Evidencia más fuerte:** el sistema editorial ya existe — falta
composición.
**Evidencia débil:** 3 estilos de CTA para la misma acción; controles
compitiendo en primer viewport (10); módulos de igual peso visual.
**Puede dañar:** la percepción de «acumulado» — el enemigo exacto del
criterio.

## Matriz jurado → evidencia

| Criterio | Acción del jurado | Resultado visible | Evidencia técnica | Doc soporte |
|----------|-------------------|-------------------|-------------------|-------------|
| Dinamismo | Pulsar Play | mapa se construye | playYear/repaint | G2 report |
| Dinamismo | Cambiar año | todo recalcula | URL year= | G1/G3 |
| Comprensión | Leer titular | respuesta en 5 s | headlineForYear | — |
| Comprensión | Scroll | secuencia de módulos | atlas | STATE_ATLAS |
| Rigor | Leer cobertura | denominador visible | metrics contract | DATA_SEMANTICS |
| Rigor | Abrir «cómo lo sabemos» | método completo | página dedicada | metodología |
| Rigor | Buscar edificio con desacuerdo | BOTH_DIFFER | corpus c13 | G3-A report |
| Innovación | Compartir vista | URL reproduce estado | serializeUrl | — |
| Innovación | Descúbreme (G4) | caso configurado | corpus SELECT | G4-DIRECTION |
| Diseño | Usar en móvil | 1 acción/viewport | atlas w390 | STATE_ATLAS |

## Veredicto por criterio

- **Dinamismo:** materia prima de sobra; falta que el jurado la
  encuentre → problema de IA, no de features.
- **Comprensión:** fuerte en unidad, débil en conjunto — la secuencia
  plana es el riesgo.
- **Rigor:** el mejor del benchmark; convertirlo en ventaja visible.
- **Innovación:** real pero invisible; «Descúbreme» + historias la hacen
  evidente.
- **Diseño:** criterio decidido por composición G4, no por componentes.
