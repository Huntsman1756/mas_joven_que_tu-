# Revisión de incidencias de interacción — 28-09-2026

Origen reproducido: producción 2920278. Correcciones probadas inicialmente en
build local ebd93a6+dirty(9), sin cambiar datos ni algoritmos de métricas.

## Recorrido y resultados

1. Entrada desde portada: abre y enfoca intencionadamente el capítulo.
   `01-example-before.png`. Se aclara el botón: «Leer un ejemplo: el caso de
   Mungia», no se promete abrir fotos ni se realizan peticiones aéreas por leer.
2. Porcentajes y texto: `02-story-before.png` → `08-story-after.png`.
   Los porcentajes de contraste pasan de hasta 32 px a 21,6 px; se evita partir
   número y símbolo. Texto de apoyo lateral 0,95 rem y cifra 1,2 rem. Se conserva
   la jerarquía serif (titular) / sans (datos y controles), no cinco fuentes distintas.
3. Comparador: «Solo 2025» significa mostrar solo esa imagen y deja la cortina
   en 0 %, pero ahora el tirador completo de 44 px permanece dentro del lienzo.
   «Ver ambas» recupera 50 %. Comprobado por DOM y visualmente en escritorio y
   390×844: `06-swipe-edge-after.png`, `10-mobile-swipe-after.png`.
   `03-swipe-edge-before.png` es una captura transitoria y no se usa como prueba
   del porcentaje final del control.
4. Contornos: fuente de datos actual, zoom mínimo 13,5; el toggle no cambia el
   zoom. Se refuerza la línea sobre imágenes y se explica acercarse. Comprobado
   activado en foto 2025, `07-outline-after.png`; no se afirma que los edificios
   existieran en la fecha histórica de la imagen.
5. Cambio entre pestañas: la primera secuencia no produjo un mapa vacío
   (`04-evolution-after-tabs-before.png`). El fallo sí se reprodujo saliendo a
   portada y reabriendo ejemplo: `05-map-reentry-before.png`, sin edificios.
   Causa: `loadedBuildingSources` global sobrevivía al mapa destruido e impedía
   crear fuentes en el nuevo mapa. La guarda consulta ahora la fuente del mapa
   real y el inventario se limpia al destruirlo. `09-map-after.png` y prueba de
   regresión que exige geometría realmente renderizada en ambas entradas.
6. Nombre de GitHub: guion final real, no fallo de la interfaz. Renombrarlo
   implica migrar URL pública/enlaces; decisión solicitada aparte, no ejecutada.

## Comprobaciones realizadas

- `npm run check`: 0 errores, 2 avisos preexistentes.
- `npm run test`: 279 Vitest + 17 Node PASS.
- ESLint archivos tocados: exit 0. Prettier aplicado.
- Build: exit 0. Prefijo Pages: 14/14.
- Harness editorial mantenido: 25/25. Nuevos asertos: edificios renderizados
  en ciclo1/ciclo2; Play avanza tras Fotos → Histórico → Antigüedad → Evolución;
  Antigüedad recupera visibilidad/geometría y pausa Play al volver.
- Capturas del navegador de esta ronda; no se reutilizan las del paquete anterior.

## Límites

Revisión visual acotada, no certificación WCAG ni prueba con iPhone físico.
EU asistido con paridad, revisión nativa pendiente. La demo y PDF anteriores
conservan sus capturas históricas; no se reetiquetan como prueba de esta build.
