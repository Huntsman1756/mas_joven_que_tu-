# Mejoras del 30/09: implementadas, cierre de publicación pendiente

Comprobación del 01-10-2026: las mejoras finales de orientación del mapa y copy EU
están en `52daba93fe62acc090f99d507aa7bffa9cd8513e`, con CI correcta. No están
publicadas ni incluidas en el paquete de entrega existente.

## Estado observado

| Elemento | Resultado |
| --- | --- |
| Rama de trabajo | `g11-visual-renewal`, HEAD `52daba9` |
| CI final `36774241320` | app, data-tests, e2e y browser-matrix: success, consultado en GitHub |
| Web pública | HTML con sello `c353154c4ff60ba32cc98e350afccb40a5a092a6` |
| Rama gh-pages | `ad87d731a822872a3d74a554818fd1d785b62927`, mensaje de despliegue desde `c353154` |
| Capturas y paquete | snapshot `c353154`; ZIP íntegro, 33/33 archivos con tamaño y SHA-256 correctos; manifiestos interno y externo iguales |
| Verificación local repetida | svelte-check: cero errores/avisos; 283 Vitest y 18 tests Node PASS |
| WebKit real del candidato | informe previo: iPhone 13 PASS; desktop FAIL esperando navegación al método; no resuelto ni repetido en esta revisión |

[Evidencia de identidad e integridad](status-20261001.json). La consulta del HTML
no verifica contenido cartográfico. Los resultados de navegador del 30/09
conservan su fecha y alcance en [RELEASE.md](RELEASE.md); no se presentan como
pruebas ejecutadas el 01/10. No se repitieron build, tests de datos ni matriz
de navegadores en esta revisión de documentación y workflow.

## Continuación local realizada

- Corregidas las referencias obsoletas y la distinción candidato/publicación en
  README de entrega, checklist, memoria, README audiovisual y RELEASE.
- Reparado el borrador `release-qa.yml`: ejecución manual con SHA completos
  obligatorios, checkout del origen exacto, contraste del sello local y público,
  shell bash explícito y artefactos de smoke/capturas solo posteriores al marcador.
  Eliminado `PAGES_SHA_PENDING` y el disparo automático con identidades incompletas.
- Sintaxis YAML y estructura básica comprobadas con PyYAML; `git diff --check`
  correcto. El workflow no está publicado ni ejecutado en GitHub Actions.

Los cambios y evidencias previos sin commit se conservan. Esta revisión no crea
commits, no publica, no envía solicitudes ni modifica datos, métricas o producto.
Reversión de esta continuación: restaurar únicamente los párrafos aquí descritos
y el borrador de workflow, y retirar este registro y su JSON; conservar las
evidencias anteriores y los dos cambios documentales que ya existían al inicio.

## Trabajo pendiente

1. Diagnosticar el fallo WebKit desktop con servicios reales y conservar el
   resultado, incluyendo errores de acceso a geoEuskadi; no atribuir causa solo
   por el timeout ni declarar aprobada la integración global.
2. Preparar el artefacto exacto del candidato con sus datos runtime y procedencia;
   publicar únicamente con autorización para cambiar la web pública.
3. Tras publicación, ejecutar el QA público con los SHA reales; recapturar y
   regenerar vídeo silencioso/PDF/ZIP con procedencia compartida. El ZIP existente
   sigue siendo un snapshot anterior y no incluye las correcciones de documentos
   realizadas el 01/10.
4. Incorporar las evidencias y cambios pendientes al cierre versionado cuando se
   solicite un commit; el árbol de trabajo sigue sin estar limpio.
5. Mantener abiertos revisión humana EU, NVDA, teléfonos físicos y observación de
   personas nuevas. La revisión asistida del delta EU falló; no equivale a revisión
   humana. Solicitud y declaraciones del concurso siguen pendientes humanas.
