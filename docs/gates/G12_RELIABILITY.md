# G12 — correcciones de la revisión de comprensión

Base: `ffc9f88`. Cambios locales, sin commit, push ni despliegue desde esta tarea.

## Alcance

1. Trama solo con denominador confirmado cero. Estado de carga separado de
   ausencia de año; fallo de descarga con mensaje y reintento explícito;
   descarga resuelta sin el fid → `missing` («No se han podido obtener los
   datos de esta zona»), sin porcentaje ni trama.
2. Capturas de edificios con `z=16` y aserción de nivel; móvil con tacto.
   Captura temporal con cabezal explícito `play=1988`.
3. Explicación a 16 px y pregunta independiente. Recuento exacto desplegable;
   aproximación redundante oculta en móvil sin ocultar el universo del titular.
4. Tooltip desactivado en puntero táctil; ficha persistente y huella bajo demanda.
5. Universo de año conocido explícito en explicación municipal y temporal.

No se modificaron datos, contratos de cálculo ni pipeline. La alternativa
de fotografías primero sigue siendo una hipótesis de producto, no un defecto
resuelto ni una opción descartada por pruebas de comprensión inexistentes.

## Verificación realizada

- Tipos: cero errores; dos warnings preexistentes de inicialización de props.
- Lint, formato y build: correctos.
- Vitest: 187/187; servidor estático: 15/15; pytest datos: 45/45.
- G10 hardening: 58 checks, cero fallos (servicios externos simulados).
  El harness anota que no encontró un botón de hotspots; no equivale a una
  nueva validación exhaustiva de ese recorrido.
- G8 viewer: 30 comprobaciones correctas, incluidas axe en los cinco modos
  y menú móvil, navegación, foco y cero pageerrors (servicios simulados).
- `g12_reliability.mjs`: seis comprobaciones, cero pageerrors. Retrasa las
  series, provoca 503, verifica que no se anuncie ausencia, reintenta y
  comprueba recuperación, tacto y zoom. Datos locales reales, imágenes
  externas simuladas. Incorporado al job E2E de CI.
- `_diag_shots.mjs`: escritorio y móvil con servicios reales, cero pageerrors;
  capturas revisadas en `evidence/comp-g12-fix/`. Verifica nivel edificio antes
  de capturar. No demuestra disponibilidad futura de los servicios externos.

Evidencia determinista: `evidence/g12-reliability/checks.json` y
`touch-card-stubbed.png`. No usar esta última como evidencia de ortofoto real.

## Pendiente

Comprensión con usuarios, NVDA y móvil físico sobre el nuevo frontend.
La versión pública anterior no incorpora estas correcciones. No se certifica
ausencia universal de defectos ni se autoriza automáticamente la publicación.
