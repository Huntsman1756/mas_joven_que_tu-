# PERF4 CALIBRATION — NO RERUN-UNTIL-GREEN

Estado: **CONGELADO** (2026-09-19). Protocolo de adjudicación para la celda
`PERF4 t_result_ready` de G1 que no se pudo resolver en la sesión de
cierre de G3-D por deriva ambiental de la máquina.

Contexto del bloqueo:

- Candidato G3-D `26705c2`: `t_result_ready` P2 p75 = 3539 / 3567 ms
  (dos corridas) vs umbral congelado 3500 ms.
- Control `0d21407` (pre-G3-D): 3517 ms en las mismas condiciones —
  también sobre umbral.
- Conclusión de la sesión: **PASS funcional G3-D; GD12/PERF4
  temporalmente BLOCKED por calibración del entorno** — ni FAIL ni PASS
  condicionado.

## 1. Push del candidato

Candidato exacto: `26705c2` en `g3d-context-modules` — **pusheado**
(remoto verificado 2026-09-19).

## 2. Artefactos congelados de referencia

- Baseline de producto G1 original: **`0563d60`**.
- Definiciones originales PERF4 (sin relajar):
  - P2 `t_result_ready`: **p75 ≤ 3500 ms · p95 ≤ 5000 ms · n = 20**.
- Harness: `app/scripts/g1_gate_perf.mjs` sin modificaciones.

## 3. Sesión de medición limpia (obligatoria)

- Reboot o reset material equivalente de la máquina.
- Sin builds/tests en paralelo.
- Sin restos de navegadores ni dev-servers previos.
- Mismo estado de energía para baseline y candidato.
- Mismo navegador/harness/emulación de red.
- **Registrar antes de empezar:** versiones de Chromium/Playwright/Node y
  carga de la máquina (procesos, % CPU).

Registro de la sesión (a rellenar al ejecutar):

| Campo | Valor |
|-------|-------|
| Fecha/hora | _pendiente_ |
| Node | _pendiente_ |
| Playwright | _pendiente_ |
| Chromium | _pendiente_ |
| Carga previa (procesos/CPU) | _pendiente_ |
| Reset material aplicado | _pendiente_ |

## 4. Orden de ejecución

1. **Baseline `0563d60` primero**, 20 reps.

   Si el baseline **NO** satisface PERF4 original:

   > **STOP — SESSION_INVALID_FOR_ADJUDICATION.**
   > No medir el candidato para PASS/FAIL en esa sesión.

2. Si el baseline pasa, **inmediatamente** el candidato `26705c2`,
   mismo harness, misma máquina, mismas condiciones, 20 reps.

## 5. Criterio de PASS del candidato

El candidato pasa **solo si** él mismo satisface:

- `p75 ≤ 3500`
- `p95 ≤ 5000`

El delta vs baseline es **diagnóstico únicamente**: nunca sustituye el
umbral absoluto congelado.

## 6. Regla de no-repetición

No re-ejecutar hasta que salga una tanda que pase. Una segunda sesión
solo está permitida tras un **reset material documentado** o una causa
ambiental documentada.

## 7. Si baseline calibrado pasa pero candidato falla

La regresión PERF4 es real y hay que remediarla: **nuevo candidato de
producto requerido**. Hipótesis de remediación ya registrada (sin
ejecutar): progressive loading de la profundidad de `ResultView`
(AddressSearch / PlanningContext+ContextModules / lógica G3-B-D /
histórico 1923-25 / PhotoPanel por `mode`), sin tocar MapView, Timeline,
distribución ni núcleo municipal.
