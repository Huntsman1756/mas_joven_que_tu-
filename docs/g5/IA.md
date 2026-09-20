# G5 · ARQUITECTURA DE INFORMACIÓN

> Estado: congelada para implementación G5. Sustituye la organización
> «tramos» de G4. La secuencia es la emocional congelada en el gate.

## INTRO (home)

```
MASTHEAD          Más joven que tú · 70 años construyendo Bizkaia
PREGUNTA          ¿Qué parte de la Bizkaia que ves hoy apareció después que tú?
FORM              [año de nacimiento] [lugar] → Ver mi Bizkaia
PRIVACIDAD        solo el año; nada se guarda
FUENTES           línea editorial (Catastro ODB · ortofotos · Eustat)
```

Sin cajas. Tipografía editorial, fondo cálido, un solo CTA.

## RESULT — secuencia

```
0. TOPBAR           marca · «Cambiar año o lugar» · compartir

1. RESPUESTA        headline-block
   h1               «Eres mayor que el NN % de los edificios
                     que hoy forman {municipio}»
   lead             aproximación humana («casi 6 de cada 10»)
                    + frase literal en lenguaje llano
   coverage         cobertura en una frase (sin jerga)
   disclosure       <details> «Cómo se calcula» — lenguaje llano
                    n÷m con palabras; la referencia técnica exacta
                    (C-04/C-05…) vive en la capa técnica, no aquí

2. DÓNDE            #scene — el mapa
   mapband          lienzo continuo (zoom: municipios → celdas →
                    edificios; la rejilla de celdas no dibuja bordes
                    visibles a zoom medio)
   legend           leyenda flotante mínima (ya existe; se clarifica)
   modes            dos grupos con etiqueta:
                    LEER EL DATO      [Edificios] [En el tiempo]
                    COMPROBAR         [Con fotos aéreas] [Con el mapa de 1923–25]

3. CUÁNDO           eje temporal único + distribución por décadas
   Timeline         solo en modo TIEMPO: cabezal + décadas +
                    marcador TU AÑO. Las campañas de ortofoto YA NO
                    son marcas en este eje (GT1): viven en el modo
                    FOTO. El mapa de 1923–25 nunca aparece aquí.
   DecadeDistribution  barras por década, split por año, marcador,
                    «sin año» con hatch fuera del eje, tabla
                    accesible, nota de heaping.

4. COMPRUÉBALO      modo FOTO dentro de #scene
   PhotoPanel       dos paneles sincronizados (desktop) /
                    toggle segmentado (móvil). Nunca swipe ni
                    superposición de opacidad por defecto.
                    Fuente + campaña nominal + rango de vuelo
                    real junto a cada panel.
   modo HIST        mapa 1923–25 standalone, mismo lienzo, copy:
                    «es un mapa, no una fotografía» + fecha nominal
                    por hoja. Sin overlay de edificios por defecto.

5. QUÉ MÁS SABEMOS  sección editorial «El lugar»
   · 1 hecho demográfico fechado (Eustat, snapshot propio)
   · 1–2 hechos de planeamiento vigente (capacidad, no predicción)
   · cada hecho con fuente + fecha inline, en línea de texto
   · cero tarjetas KPI

6. CASOS            «Cinco lugares de Bizkaia»
   índice editorial  lista numerada de 5 líneas (lugar · señal ·
                    década) — no grid de tarjetas
   capítulo          destacado: kicker, título, 3 bloques
                    (vemos/dato/sabemos-no sabemos), contraste si
                    aplica, acciones con jerarquía

7. TU CALLE         profundidad personal por demanda
   AddressInvite    búsqueda de dirección (lazy)
   CompareInvite    segundo año (lazy)
   CellDetail       detalle de celda al inspeccionar
   BuildingCard +   lazy/depth: solo con edificio resuelto
   PlanningLocal +
   ContextModules

8. CÓMO LO SABEMOS  footer + página /como-lo-sabemos
   público          qué mide, qué no mide, por qué falta el año
   técnico          contratos C-XX, DATA_SEMANTICS, provenance —
                    en la página metodológica, no en RESULT
```

## Reglas de la IA

- Una escena de mapa (`#scene`), cuatro modos agrupados en dos
  intenciones. Cambiar de modo nunca toca `place` ni `year`.
- El eje temporal es catastral y único: las campañas de foto y la
  cartografía histórica son *fuentes de comprobación*, no puntos en
  ese eje.
- Cada sección nueva hace una pregunta de lectura, no muestra un
  módulo de datos.
- Nada de contenedores de contenido con borde+radio en RESULT fuera
  de leyenda/controles/formularios (GV1).
