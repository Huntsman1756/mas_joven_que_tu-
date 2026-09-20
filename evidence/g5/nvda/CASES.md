# GA3-NVDA — tabla de casos congelada (declarada ANTES de la prueba)

Recorrido único predefinido sobre el build congelado `1765a64`+
(`0781832`). Los valores de «esperado» se extrajeron del árbol de
accesibilidad real del build (`a11y-tree/*.yml`, generado con
`app/scripts/g5_a11y_dump.mjs`), no de supuestos.

## Entorno (rellenar en la sesión)

| campo        | valor                                          |
| ------------ | ---------------------------------------------- |
| NVDA versión |                                                |
| Navegador    |                                                |
| SO           |                                                |
| Fecha        |                                                |
| Build        | `0781832` (`app/build`)                        |
| URL          | `http://localhost:4173/?year=1987&place=leioa` |
| Tester       |                                                |

Procedimiento: NVDA iniciado antes de cargar la página; caché normal de
usuario; desde carga nueva en `http://localhost:4173/` para los casos
NV-01/02, y en la URL de resultado para el resto. Servir con
`node app/scripts/static-server.mjs 4173 app/build`.

## Severidad (congelada)

- **FAIL**: bloqueo de navegación, información esencial inaccesible,
  foco perdido, control sin nombre accesible, interacción principal
  imposible.
- **Finding**: defecto cosmético o fricción secundaria documentada; no
  necesariamente bloqueante.
- Veredicto global: `PASS` | `FAIL` | `PASS_WITH_FINDINGS`.

## Casos

| ID    | Acción                  | Esperado                                                                                                                                                                                                         | Observado | Veredicto | Evidencia |
| ----- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | --------- |
| NV-01 | Cargar `/` nueva        | Título «Más joven que tú — 70 años construyendo Bizkaia»; h1 «¿Qué parte de la Bizkaia que ves hoy apareció después que tú?» anunciado                                                                           |           |           |           |
| NV-02 | Tab desde carga         | Skip link «Saltar al contenido» (#main) es el primer foco                                                                                                                                                        |           |           |           |
| NV-03 | Recorrer con `H`        | h1 resultado + h2 «La forma del parque», «Qué más sabemos del lugar», «Para seguir leyendo», «Cinco lugares de Bizkaia», «Baja hasta tu calle»                                                                   |           |           |           |
| NV-04 | Leer bloque resultado   | Se entiende sin contexto visual: h1 + «Es decir: casi N de cada 10…» + denominador + cobertura + población                                                                                                       |           |           |           |
| NV-05 | Selector año/lugar      | Botón «Cambiar año o lugar» con nombre y rol; al abrir, campos con etiqueta                                                                                                                                      |           |           |           |
| NV-06 | Cambio de vista         | `navigation "Vista del mapa"` con grupos «Leer el dato» (Edificios, En el tiempo) y «Comprobar con otras fuentes» (Con fotos aéreas, Con el mapa de 1923–25); estado del modo activo alcanzable                  |           |           |           |
| NV-07 | Timeline (En el tiempo) | Botones «Reproducir», «Reiniciar desde 1987», «Volver al presente»; `slider "Año en reproducción"` con valor; `status` anuncia «Año en reproducción NNNN…»                                                       |           |           |           |
| NV-08 | Mapa/canvas             | `region "Mapa de edificios actuales por estado temporal respecto a tu año."`; botones zoom con nombre (observado: «Zoom in»/«Zoom out», en inglés — finding candidato); sin ruido de elementos gráficos internos |           |           |           |
| NV-09 | Cambiar año → resultado | El foco no desaparece ni salta a ciegas tras actualizar el resultado                                                                                                                                             |           |           |           |
| NV-10 | Cambios dinámicos       | Regiones `status` anuncian cambios clave (año en reproducción, búsqueda); si algo no se anuncia, sigue alcanzable por teclado                                                                                    |           |           |           |
| NV-11 | Modo foto               | `region "Fotografía aérea oficial…"`; botones «Campaña anterior: NNNN» / «Campaña siguiente: NNNN» con nombre; campaña y atribución en texto                                                                     |           |           |           |
| NV-12 | Modo 1923–25            | `region "Mapa histórico 1923–1925"`; texto «Es un mapa dibujado por cartógrafos, no una fotografía»; botones «Ver el contorno…» y «Volver al mapa actual»                                                        |           |           |           |
| NV-13 | Below-fold tras lazy    | Tras scroll/Tab, el orden leído es: distribución → contexto → historias → calle/comparar → pie; el chunk lazy no deja contenido inalcanzable                                                                     |           |           |           |
| NV-14 | Flujo dirección         | `combobox "Calle en Leioa"`, `textbox "Número"`, `textbox "Bis"`, botón «→» (nombre débil — finding candidato), «Buscar otra dirección», «Cerrar la búsqueda de dirección»                                       |           |           |           |
| NV-15 | CTAs y enlaces          | «Buscar una dirección», «Añade otro año…», «Compartir esta vista», link «Cómo lo sabemos» — todos con nombre y alcanzables                                                                                       |           |           |           |
| NV-16 | Distribución            | `table "Edificios actuales de Leioa por periodo de construcción"` con caption y columnheaders — el dato no depende del gráfico                                                                                   |           |           |           |
| NV-17 | Teclado → lazy          | Tabular hasta el boundary `.below` dispara el montaje (fallback `focusin`); el contenido below-fold es alcanzable sin scroll de ratón                                                                            |           |           |           |
| NV-18 | Modo 1956 / hoy         | `slider "Cortina de comparación: 1956 a la izquierda, hoy a la derecha"` con valor 0–100; ←/→/Inicio/Fin mueven la cortina; `status` anuncia carga/error de la ortofoto; el canvas del overlay no lee (aria-hidden) |           |           |           |
| NV-19 | Salir de 1956 / hoy     | Cambiar a otro modo en `navigation "Vista del mapa"` retira la cortina y la ortofoto actual; foco y orden de tabulación intactos                                                                                 |           |           |           |

## Registro de la sesión

- Vídeo corto con audio de NVDA del recorrido: `nvda-session.*`
- Hallazgos: listar con ID de caso y severidad.
