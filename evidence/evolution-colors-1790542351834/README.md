# Evolución: contraste respecto al año personal

Revisión del 2026-09-27 solicitada por el usuario.

Verificado con Chromium sobre Vite local (http://127.0.0.1:5199), fuentes
actuales y PMTiles reales de Mungia. No es una prueba del build estático
ni de producción: el otro agente estaba verificando el build editorial.

Comando desde `app/`: `node scripts/evolution_colors_verify.mjs`.
Resultado: exit 0. Ver `report.json` (edificios concretos y expresiones
de pintura/filtro) y `colors-2000.png` (captura).

- Año personal 1979, cabezal 2000: edificios anteriores gris/azul y
  posteriores rojos; futuros al cabezal excluidos.
- Play avanza, pausa congela el cabezal y el año personal sigue en 1979.
- Arrastrar a 1979 oculta los posteriores, sin eliminar los anteriores.
- Entrada en modo mapa con cabezal guardado: reaparecen los posteriores.
- Expresión no-VALID separada; opacidades personales 0,45 y 0,95.

`npm run check`: 0 errores, 2 warnings en AddressSearch/CompareYear.
ESLint del mapa y del harness: exit 0. Prettier aplicado a ambos.

Antes de congelar: incorporar estos cambios al siguiente build y verificar
ese artefacto; no reutilizar una huella anterior como identidad de este cambio.
Sin commit, push ni despliegue.
