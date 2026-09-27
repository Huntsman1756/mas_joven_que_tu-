# Experiencia, diseño y accesibilidad

Se usó producción antes de leer documentación detallada del producto. Auditoría experta secuencial, no estudio con participantes. Se aplicó el workflow Product Design Audit. Navegador disponible: Brave conectado; IAB y Chrome dedicado no estaban disponibles. Emulación CDP verificada 390×844 y 320×800 no equivale a dispositivo físico. Capturas en EVIDENCE.

## Primera visita ciega

Marcas aproximadas de la sesión:4,5 s,32 s,118 s y 587 s. Hubo llamadas de herramientas y tareas intercaladas; no son tiempos de éxito de un usuario humano ni un experimento controlado.

|Momento|Qué creo que es / puedo hacer|Por qué importa / dato y fuente|Qué haría después / recuerdo|
|---|---|---|---|
|~5 s|Comparar mi edad con la de edificios del municipio; formulario|Territorio cercano; se nombran Catastro y fuentes oficiales|Poner año y lugar. Recuerdo «mi municipio tiene edad»|
|~30 s|Debo seleccionar una opción, no solo escribir; búsqueda muestra NORA|No sé todavía qué hallazgo territorial obtendré; sí que parte de datos oficiales|Enviar Bilbao 1922. Recuerdo la promesa personal, no una conclusión|
|~2 min|Resultado municipal y cinco formas de explorar|85,7% de edificios actuales con año conocido posteriores a 1922; veo cobertura|Probar foto. El lienzo vacío con 1945 me hace dudar si hay imagen|
|~10 min|Visor rico y casos narrativos más abajo|Entiendo stock actual≠pasado completo; Mungia distingue número/huella|Explorar otro lugar. Recuerdo personalización y capas antes que una tesis única|

01-home es captura con Bilbao 1922 ya introducido/desplegable: **no representa primer viewport virgen**. El estado inicial se observó, pero esa captura se sustituyó al guardar.13-below-fold es realmente zoom cartográfico de Karrantza: no usar para probar posición de contenido.15-mobile-photo-direct fue capturada antes de que la emulación efectiva quedara fijada;16 sí es 390 px.

## Golden cases y límites

|Caso|Resultado observado|Interpretación|
|---|---|---|
|Bilbao 1922|11780/13738=85,7%;13750 total|Conteo coherente; secuencia 5 modos observada|
|Getxo 1952|4927/6211=79,3%;6221 total|Foto cercana 1956, diferencia 4 años; municipio se resetea a vista mapa|
|Mungia 1979|2679/4472=59,9%;4483 total|No confundir porcentaje municipal con 85,7% del conjunto editorial 70 edificios|
|Arakaldo 1987|28/109=25,7%;100% cobertura|Escala edificio; nombre y controles caben|
|Karrantza Harana/Valle de Carranza 2025|1/3528 conocidos,3540 total,0%«exacto»|Contraejemplo reproducible de redondeo; nombre largo encaja desktop yEU320|
|Missing real|12 no-válidos en Karrantza; cobertura 99,7%;desglose accesible|No se mostró como 0 antiguo|
|Sin cobertura ortofoto|No se encontró un punto real inequívoco en esta sesión|NOT_TESTED actual; no usar foto inicial vacía como «sin cobertura»|
|URL inválida|lat 999:aviso y reencuadre municipal|Recuperación local comprobada|

## Home y resultado

Identidad visual consistente: Newsreader para voz editorial, SourceSans para controles, blanco/grisazulado/terracota. Hay una pregunta concreta y formulario comprensible sin depender del scroll. La fuente principal aparece. No hace falta añadir sellos de concurso ni premios ficticios para aparentar terminación.

Debilidad: no hay una demostración inmediata del hallazgo sin introducir datos; placeholders 1988/Getxo pueden parecer una selección ya preparada, pero CTA sigue deshabilitado hasta selección real. Referencia útil: ejemplos de IGN. Esto es P2, no razón para rehacer la portada.

Resultado: titular largo pero semánticamente cuidadoso; recuento, cobertura y detalle permiten auditar porcentaje. En producción repite cifra/explicación y promueve fotografía antes del hallazgo editorial. El ES local 9 a 1 a 782 ya modifica varios textos: no trasladar automáticamente todo hallazgo de producción al candidato. RT04 yRT05 sí persisten en código actual. Contexto población/planeamiento aporta profundidad, pero no debe tener prioridad automática sobre la idea principal. Las salvedades de stock y denominador deben quedarse junto al dato; la documentación exhaustiva puede seguir tras disclosure.

## Cinco modos: contrato frente a experiencia

|Modo|Pregunta/fuente/semántica|Encoding/leyenda/interacción|URL y estado observado|Desktop/móvil/teclado/lector|
|---|---|---|---|---|
|Por antigüedad|Qué edificios actuales son posteriores a mi año;CatastroODB|Cuota porzona 500 m y detalle por edificio;unknownseparado|Vista default, year/place/cámara;goldencases coherentes|Desktop verificado;320 EU;alternativa textual;lectorrealNT|
|Evolución|Cómo se acumulan años de construcción del stock superviviente|Cabezal yplay, cuota hasta año;no inventariohistórico|view=time/play observado;CI tieneaserto vivo fallido|Desktopinteracción;mobileevidenciaprevia;NVDApendiente|
|Fotos aéreas|Qué muestra un vuelo oficial del lugar|Campañas discretas, metadato nominal/real;imagen pura|view=photo sin ortho →foto desactivada aunque 1945 visible;1956 activada sí pinta|Problema reproducido desktop/móvil/local;sliderteclado en código;SRrealNT|
|Mapa 1923–25|Qué muestra la cartografía histórica|Rastergeorreferenciado, explicita mapa≠foto|view=hist con contenido;otrosrellenos excluidos|Desktop verificado;mobilefullNT;texto alternativo existe, SRNT|
|Antes/ahora|Comparar evidencia visual de 2 campañas|Cortina, fechas, soloA/B, selector|view=swipe/ortho;1945→2025 y 1989→2025 observados|Local 390 imagen+handle;ArrowRight operativo;axe 0, no NVDA real|

No se verificó toda combinación del producto cartesiano tab×URL×idioma×capas×back/forward. El desacople demostrado es foto inactiva/control activo. No afirmar «stale state generalizado» sin más pruebas.

## Cartografía y color

Celdas iguales por cuota no codifican huella ni densidad. Una zona roja rural puede tener pocos edificios; el borde municipal y la ficha textual ayudan, pero un jurado puede leer «más territorio construido» si no ve unidad/denominador. El capítulo Mungia es la mejor explicación disponible y debe ser más fácil de encontrar. Generalizaciónmultiescala correcta en casos observados; no se auditó cada zoom/tile de 112 municipios. Se vio atribución y escala en fotografías/mapas.

Paleta inventariada en`palette.ts` y`app.css`: paper#f 7 f 8 fa, paper 2#eef 1 f 4, surface#fff, ink#182631, ink 2#52606 d, ink 3#5 f 6 d 79, accent#a 8372 a, before#52768 e, after#c 94 f 38, noyear#d 8 dde 2/stroke#5 b 6874;warn#fdf 3 e 0/#a 86 e 14/#5 e 4210;rampa#e 3 e 8 ec→#d 8 c 2 b 6→#c 79 a 85→#b 5704 f→#a 8372 a. Rojo sirve como acento ydato temporal; en evolución cambia la pregunta«posterior» por«hasta». La leyenda explícita mitiga, no elimina, esfuerzo cognitivo. No añadir más colores para decorar.

Contrastes recalculados(token-contrast.json):ink/paper 14,53;ink 2/paper 6,08;ink 3/paper 5,00;accent/blanco 6,47;before/blanco 4,84;after/blanco 4,51;warnText/warnBg 8,43. Línea/blanco 1,31 no demuestra incumplimiento si es separador decorativo; sí requiere comprobar cuando delimite control esencial. No se concluyeAA de gráficos superpuestos sobre ortofotos a partir de tokens. Simulación completa de daltonismo no realizada;unknown tiene patrón ytexto, una ventaja real.

## Tipografía, grid, iconos y motion

Escala displayclamp 2,375–4,5 rem;h 1 1,75–2,625 rem;body 1,125 rem/1,0625 mobile;meta 0,875 rem;texto 40 rem, página 82,5 rem, control 52 px. Las capturas respaldan jerarquía y legibilidad; nombre largo no desborda en 320 EU. No hay razón demostrada para cambiar pareja tipográfica. Las cifras pequeñas deben conservar unidades y evitar precisión engañosa antes de ajustar tamaños.

Lucide como familia principal, con texto en modos/acciones; los controles cartográficos del motor tienen estilo propio funcional. Iconos no sustituyen categorías. No se recomienda añadirlos decorativamente. No se midieron todos los objetivos táctiles: la regla interna 44 px es más exigente que mínimoWCAG2.2 AA24 px con excepciones; no confundir ambos umbrales.

Motion: pausa explícita, scrollIntoView con reduced motion y no automático enreload;transiciónmunicipal debe orientar, no narrar demolición/construcciónhistórica. No perfil completo de jank/pinch. CSScontiene tokensz y algunos valoresnuméricos restantes; sin overlap nuevo reproducible no justifica refactor de z-index. ANDROID03 histórico no reproducido determinísticamente permanecependiente físico.

## WCAG2.2 AA y validación humana

Referencia [WCAG2.2](https://www.w3.org/TR/WCAG22/). Se observaron skiplink, main, h 1, labels, combobox, erroresasociados, anuncios yalternativastextuales. ArrowRight del swipe cambióposición. Axe 0 en 2 estados no valida todos criterios, ni todosestados, ni el contenido del canvas. Contrastes 4/8 nodos inconclusos necesitanrevisiónmanual.

|Área|Estado actual|
|---|---|
|Headings/landmarks/formulario|MuestraDOM revisada; no auditoría exhaustiva de cada estado|
|Teclado|Swipe comprobado; recorrido integral y orden de overlays pendiente|
|Foco/dialog/sheets|Código y evidenciaMOB-R revisados; no NVDA actual|
|Live regions|Presentes en snapshots; no adjudicada calidad de anuncios reales|
|Mapas/canvas/charts/tablas|Alternativas textuales presentes; equivalencia completa requiere lector|
|Reducedmotion|Código/test; nuevo recorrido completo bajo preferenciaNT|
|Reflow|320 pxEU sin overflowhorizontal; no equivale a zoomnativo 400%|
|Zoom 200/400 ytextspacing|NO TESTED real en esta sesión|
|NV-18/NV-19|PENDING;no marcarPASS|
|iOSfísico/safeareas/teclado/barra|MOB-05 b PENDING/FAIL segúnregistro; no adjudicadoahora|

## ES y EU

Se leyó COPY_AUDIT y su implementación, no se rehízo desde cero. ES permanece congelado salvo RT04/05/11 y casosreproducibles. EU:513/513 claves, placeholders por suite;24 claves cambiadas enES requieren revisiónnativa. El corpusglobal también carece de adjudicaciónnativa final; **no son solo 24 frases para certificar todoEU**. Estado`REQUIRES_NATIVE_EU_REVIEW`. La captura 20 comprueba layout/lang=eu a 320 px, no corrección lingüística. No se proporcionan traduccionesautomáticas como copyfinal.

## Poda, antes de añadir

No hay analítica ni estudio que demuestre «nadie usa» una feature. Propuesta evaluable: relegar planeamiento/contexto y comparación de dosaños detrás de una acción secundaria durante recorridojury; mantener cinco modos pero recomendar uno por hallazgo. No eliminar cartografía 1923–25 sin comprobar su papel en la demostración histórica. No añadir sexto modo, onboardinglargo ni gamificación. Dar acceso al hallazgo existente tiene másretorno que decorar elvisor.
