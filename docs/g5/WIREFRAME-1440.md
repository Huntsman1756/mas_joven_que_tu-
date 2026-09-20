# G5 · WIREFRAME 1440 — RESULT

```
┌──────────────────────────────────────────────────────────────────────┐
│ MÁS JOVEN QUE TÚ                          [Cambiar año o lugar] [⤴]  │  topbar hairline
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Eres mayor que el                                                   │  RESPUESTA
│  58,3 %                                                              │  serif, la cifra ES el titular
│  de los edificios que hoy forman Muskiz.                             │  ~casi 6 de cada 10
│                                                                      │
│  De los 3.214 edificios actuales con año registrado en Catastro,     │  lead llano
│  1.874 se terminaron después de 1979.                                │
│  Cobertura: 3.214 de 3.301 tienen año (97,4 %) · 87 sin año.         │  una línea, sin jerga
│  ▸ Cómo se calcula                                                   │  details → lenguaje llano
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌───────────────────────────── mapa ──────────────────────────┐   │
│   │                                                             │   │  DÓNDE · lienzo a
│   │   (rellenos por cuota, sin rejilla; contorno municipal)      │   │  ancho de columna
│   │                                        ┌──leyenda──┐        │   │  ancha, ~56vh
│   │                                        │ ■ antes   │        │   │
│   │                                        │ ■ después │        │   │
│   │                                        │ ▨ sin año │        │   │
│   │                                        └───────────┘        │   │
│   └─────────────────────────────────────────────────────────────┘   │
│   LEER EL DATO   (Edificios) (En el tiempo)                         │  grupos de modo
│   COMPROBAR      (Con fotos aéreas) (Con el mapa de 1923–25)        │  con etiqueta
│   El tiempo es el año de construcción registrado; las fotos y el    │  copy puente
│   mapa de 1923–25 son otras fuentes para comprobarlo.               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CUÁNDO — modo TIEMPO                                               │
│  ┌ eje temporal único: 1900 ──────●──TU AÑO──▶─cabezal── 2025 ┐     │  sin marcas de
│  └ [Reproducir] [Reiniciar] [Volver al presente]             ┘     │  campaña (GT1)
│                                                                      │
│  LA FORMA DEL PARQUE                                                │
│  ████ barras por década · split por tu año · ▨ sin año aparte       │  DecadeDistribution
│  (tabla accesible sr-only + nota de redondeo)                        │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  COMPRUÉBALO CON IMÁGENES — modo FOTO                                │
│  ┌── campaña 1970 ──┐    ┌── campaña 1983 ──┐                       │  dos paneles
│  │  ortofoto        │    │  ortofoto         │  ← ODB · nom. 1970    │  sincronizados;
│  │  (sincronizada)  │    │  (sincronizada)   │  ← ODB · nom. 1983    │  nunca swipe
│  └──────────────────┘    └───────────────────┘                       │
│  [← 1956]  campaña 1970  [1983 →]     [Añadir/quitar comparación]   │
│                                                                      │
│  —o— modo 1923–25 (standalone)                                       │
│  ┌── cartografía 1:25.000 ──────────────────────────┐               │
│  │ Es un mapa dibujado entre 1923 y 1925, no una foto│               │
│  └───────────────────────────────────────────────────┘               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  QUÉ MÁS SABEMOS DEL LUGAR                                          │
│  Muskiz contaba con 6.201 habitantes en el censo de 1986             │  líneas de texto,
│  (Eustat).                                                          │  fuente+fecha inline
│  El planeamiento vigente registra 12 viviendas pendientes y         │  máx. 2–3 hechos
│  4,3 ha de suelo de actividad económica vacante (ODB, ej. 2026).    │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CINCO LUGARES DE BIZKAIA                                           │
│  1. Margen izquierda — un patrón de los sesenta cruza 6 municipios  │  índice editorial
│  2. Mungia — muchos edificios posteriores, muy poca huella          │  de 5 líneas
│  3. Muskiz — un conjunto entero construido en una década            │
│  4. Santurtzi — pocos edificios concentran casi toda la huella      │
│  5. Abanto Zierbena — el caso más reciente                          │
│                                                                      │
│  ─ capítulo activo (al activar uno) ─                                │
│  CAPÍTULO 3 DE 5 · MUSKIZ · 51 EDIFICIOS · 1970–1979                │
│  Un conjunto entero construido en una década                        │
│  Qué vemos / El dato / Qué sabemos y qué no sabemos                 │
│  [Ver en el tiempo] [Míralo desde el aire]  Otro · Volver           │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TU CALLE                                                            │
│  ¿Bajas hasta tu calle?  [Buscar una dirección]                     │  por demanda
│  ¿Y el de otra persona?  [Añadir otro año]                          │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  Fuentes · Código MIT · Snapshot 2026 · Cómo lo sabemos →           │  footer
└──────────────────────────────────────────────────────────────────────┘
```

Notas: nada de tarjetas; la separación es espacio + hairline. El mapa
es el primer elemento «fuerte» tras la cifra. El disclosure técnico
(n÷m en palabras) queda tras un `<details>`; los identificadores de
contrato viven en `/como-lo-sabemos`.
