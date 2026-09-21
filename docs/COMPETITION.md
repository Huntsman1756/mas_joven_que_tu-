# COMPETITION — bases legales, encaje con el rubric y evidencia

> **Fuente normativa canónica:** Decreto Foral **73/2026**, de 23 de julio, de la
> Diputación Foral de Bizkaia (BDNS **921443**), versión íntegra republicada tras la
> corrección de agosto de 2026 (`datPublicacion` 2026-08-24).
> Texto íntegro y hash: `docs/legal/`. Manifest: `data/manifests/bizkaia.concurso.bases.yaml`.
>
> Todo lo que sigue se basa **en el texto del decreto**, no en resúmenes de terceros.

## 1. Datos administrativos (verificados en BDNS + decreto)

| Campo | Valor |
|-------|-------|
| Órgano | Diputación Foral de Bizkaia |
| Norma | Decreto Foral 73/2026, de 23 de julio |
| Código BDNS | 921443 |
| Periodo de solicitud | **2026-07-28 → 2026-11-20 (13:00)** |
| Presupuesto total | **6.750 €** |
| Partida | 0712/491119/46200 (proyecto 2020/0035, Transparencia y Datos Abiertos 2026) |
| Categorías | (a) Visualización de datos · (b) Narrativa audiovisual · (c) Investigación periodística |
| Premios categoría (a) | 1er **1.500 €** · 2º **750 €** |
| Código de verificación | `08PP-21E1-JGTV-DJWT` |

> Nota: el flag `abierto` de la BDNS figura como `false` aunque el plazo no ha terminado.
> Se registra como posible desajuste de la fuente; **no** se interpreta como cierre del plazo.

## 2. Elegibilidad aplicable a este proyecto

- **Base 2:** pueden presentarse **personas físicas** ≥ 18 años, individualmente o en
  equipos de **hasta 4 personas**. No es elegible una persona jurídica/empresa.
- **Base 2:** quedan excluidas personas sancionadas en firme por vulneración del derecho
  a la igualdad y no discriminación por razón de sexo, y quienes incumplan las
  obligaciones de igualdad citadas en la base.
- **Base 1 (condición de contenido):** los proyectos deben basarse **obligatoriamente**
  en el uso y análisis de **datos disponibles en el portal Open Data Bizkaia**. Otras
  fuentes (otros portales de datos abiertos o fuentes públicas) **solo** pueden
  incorporarse **si complementan la información principal**.

**Consecuencia para este proyecto (crítica):**

| Fuente | Papel legal | Estado |
|--------|-------------|--------|
| `parcelario-catastral-*` (Open Data Bizkaia) | **Fuente principal obligatoria** | ✅ Es el núcleo del producto |
| `ortoimagenes-1956…2002` (Open Data Bizkaia) | **Fuente principal** | ✅ Base de la máquina del tiempo |
| geoEuskadi (ortofotos 2004–2025, NORA) | **Complementaria** | ✅ Solo completa huecos que Open Data Bizkaia no cubre |
| IGN / otros | Complementaria | ⚠️ Solo como último recurso |

> Regla de redacción obligatoria en producto y memoria: los datos de **Open Data Bizkaia
> son la fuente principal**; geoEuskadi (ortofotos modernas, geocodificador) se describe
> expresamente como **complemento** de esa base. Presentar geoEuskadi como fuente
> principal incumpliría la Base 1.

## 3. Cláusulas materiales (extracto del decreto)

### Base 1 — Objeto y categoría

- El reto consiste en presentar proyectos de periodismo de datos.
- Los proyectos deberán basarse **obligatoriamente** en datos de Open Data Bizkaia.
- Categoría **a) Visualización de datos**: se premian **proyectos originales** cuyo
  objetivo principal sea la explotación y comprensión de datos mediante
  **visualizaciones gráficas estáticas o interactivas** (infografías, mapas, dashboards
  u otros formatos similares).
- **Quedan excluidos** los trabajos cuyo **eje principal** sea la narración periodística
  (reportaje, noticia extensa…) o el **formato audiovisual**.
- Las visualizaciones deben permitir explicar la información de forma **clara,
  comprensible y accesible para la ciudadanía**.

➡️ Encaje: *Más joven que tú* es una visualización interactiva; el scrollytelling es
**soporte** de la visualización, no narración periodística. La accesibilidad del decreto
refuerza `docs/ACCESSIBILITY.md`.

### Base 6 — Documentación técnica (obligatoria)

Debe acompañarse, con la solicitud:
- el **conjunto de datos original (dataset)** utilizado o, en su defecto, la indicación
  de su **procedencia y forma de acceso**;
- una **breve descripción del proceso de trabajo** con los datos (obtención, selección,
  análisis, etc.) y de las **herramientas y/o técnicas** empleadas.

> «La ausencia de esta documentación podrá limitar la valoración del criterio de rigor
> en el uso de los datos.»

➡️ Encaje: lo aportamos ya construido — `data/manifests/`, `docs/METHODOLOGY.md`,
`docs/DATA_SOURCES.md`, `docs/DATA_SEMANTICS.md`, `pipeline/`. Debe **incluirse en la
documentación de solicitud** (no basta con tenerlo en el repositorio).

### Base 10 — Criterios de valoración (categoría a)

| Criterio | Peso |
|----------|------|
| Nivel de dinamismo | 25 % |
| Calidad y comprensión de los datos | 25 % |
| Rigor y calidad en los datos | 25 % |
| Innovación en la representación | 15 % |
| Diseño y usabilidad | 10 % |

Confirmado contra el texto íntegro (coincide con la hoja resumen).

### Base 14 — Premios y difusión

- 14.1: dotación por categoría (1er 1.500 €, 2º 750 €), sujeta a retenciones fiscales.
- 14.2: **las personas participantes autorizan la publicación y difusión de los
  proyectos presentados en el portal Open Data Bizkaia**, sin que ello conlleve derecho
  a **remuneración económica** alguna.

➡️ Alcance: es una **autorización de publicación/difusión**, no una cesión de titularidad.
No se infiere una licencia abierta concreta. Nuestra atribución y licencias deben seguir
siendo correctas por sí mismas.

### Base 18 — Propiedad intelectual (la cláusula más crítica para OSS)

- Las personas participantes **reconocen su dominio del título y legitimación suficiente
  sobre los contenidos** incluidos en las ideas.
- Manifiestan **no infringir ningún derecho de propiedad intelectual** ni cualquier otro
  derecho de terceros, en España o en el extranjero, sobre los contenidos.
- **Eximen a la Diputación Foral de Bizkaia de cualquier responsabilidad** relativa al uso
  de dichos contenidos.
- Asumen **bajo su exclusiva responsabilidad** las consecuencias de daños y perjuicios
  derivados del uso, reproducción, difusión y distribución de los contenidos.

➡️ Encaje: **reutilizar OSS y material de terceros es lícito solo si su licencia lo
permite y se cumple**. Esta base convierte la auditoría de licencias
(`docs/OSS_REUSE.md`) en un **requisito legal**, no en una buena práctica:
- código OSS con licencia compatible (todas las ADOPT/ADAPT son MIT/BSD);
- **`bertspaan/buildings` no tiene licencia ⇒ prohibido copiar código** (STUDY ONLY);
- datos de terceros: documentar su licencia y atribución;
- imágenes/ortofotos: conservar atribución y respetar CC BY 4.0.

### Base 19 — Obligaciones de las personas premiadas

- **Asistir obligatoriamente** al acto de entrega de premios y **presentar públicamente
  el proyecto**.
- En caso de grupo, basta la asistencia de al menos una persona integrante.
- La falta de asistencia sin causa justificada ni comunicación previa puede suponer la
  **pérdida del derecho al premio**.

➡️ Implicación operativa: prever disponibilidad para el acto y una **presentación pública**.

### Base 21 — Protección de datos

- Aplicable la LO 3/2018 (LOPDGDD) y normativa subsidiaria.

➡️ Encaje: el producto **no recoge datos personales**; solo el *año*, que vive en la
URL del cliente (un enlace abierto lo envía al hosting en la petición inicial, como
cualquier parámetro de consulta). Sin backend propio, cookies ni almacenamiento; la
búsqueda de dirección consulta NORA y lo declara en el copy
(`docs/PRODUCT.md` §1, `docs/RISKS.md` R-11).

### Bases no localizadas (no se puede inferir nada)

- **No hay cláusula que regule la publicación previa** ni que exija que la obra sea
  inédita. La base 1 exige que el proyecto sea **original**.
  → No asumimos ni permiso ni prohibición; se marca como incertidumbre residual.
- **No hay cláusula** sobre mantenimiento/operatividad de enlaces, alojamiento posterior
  o cesión de dominio.
- **No hay cláusula** que imponga licencia abierta al proyecto presentado más allá de la
  autorización de difusión de la Base 14.2.

## 4. Requisitos que afectan al uso de OSS (resumen)

| Requisito legal | Implicación técnica |
|-----------------|---------------------|
| Base 18: titularidad y no infracción de terceros | Inventario de licencias por dependencia y por dato; atribución visible |
| Base 18: exención de responsabilidad a la DFB | Debe quedar claro que las dependencias son de terceros y con licencia propia |
| Base 6: documentación de herramientas/técnicas | `OSS_REUSE.md` + `METHODOLOGY.md` + `requirements` congelados |
| Base 1: Open Data Bizkaia como base, otras fuentes como complemento | Encuadrar geoEuskadi como complementario (ver §2) |
| Base 14.2: autorización de difusión sin remuneración | No altera las licencias de terceros ya incluidas |
| Base 2: persona física, ≤4 integrantes | No crear sociedad para presentarse |

## 5. Matriz de encaje con el rubric

| Criterio | Feature(s) | Evidencia exigida | Artefacto |
|----------|-----------|-------------------|-----------|
| **Dinamismo (25 %)** | Control temporal único; mapa reactivo; histograma sincronizado; campañas + swipe | Cambio de año actualiza mapa + cifras + histograma + ortofoto; swipe con vista sincronizada | E2E + vídeo corto |
| **Comprensión (25 %)** | Estadística con denominador; cobertura; *Cómo lo sabemos*; alternativa textual | Cifra y cobertura juntas; *¿Cómo se calcula?*; resumen textual | `UX_COPY.md`, tests a11y |
| **Rigor (25 %)** | QA reproducible; manifests; semántica; `UNKNOWN` explícito | `data/qa/`, `data/manifests/`, contratos de métrica; tests verdes | `tests/data`, informes QA |
| **Innovación (15 %)** | Sincronía Catastro ↔ ortofoto con una variable personal (tu año) | La ortofoto cambia con tu año y declara su desfase | Demo + `PRODUCT.md` §3.2 |
| **Diseño/usabilidad (10 %)** | Mapa protagonista; mobile-first; bottom sheet; AA | Prueba en móvil real; axe sin críticos; targets táctiles | `tests/accessibility` |

## 6. Cumplimiento de la condición de uso de Open Data Bizkaia

Datasets del portal explícitamente consumidos:

- `parcelario-catastral-de-bizkaia` + `parcelario-catastral-<municipio>` (Catastro/edificios);
- `ortoimagenes-1956 … -2002` (ortofotos históricas);
- opcional y solo si aporta: `planeamiento-urbanistico`, cartografía histórica 1923–1925, etc.

Licencia: **CC BY 4.0** por recurso; atribución a Open Data Bizkaia / Diputación Foral
de Bizkaia. Complementos (geoEuskadi, CC BY 4.0) identificados como complementarios.

## 7. Entrega (G5)

Memoria técnica · catálogo de fuentes y licencias · **documentación técnica de la Base 6**
· capturas · build congelado · paquete de reproducibilidad · enlace público funcionando ·
previsión de asistencia y presentación pública (Base 19).

## 8. Estado del gate legal

`LEGAL_GATE`: **PASSED** para P0 — texto íntegro oficial obtenido, cláusulas materiales
extraídas y contingencias documentadas.
Incertidumbres **residuales** (no bloquean P0, deben resolverse antes de G5 si afectan a
la presentación): publicación previa no regulada; forma concreta de la autorización de
difusión (Base 14.2); posible necesidad de ceder un enlace mantenido.

---

# G1 — Trazabilidad frente al rubric

> Matriz decisión → criterio oficial. No se añaden funciones «para sumar puntos».
> Gate verificable: `docs/gates/G1.md`.

## 9. Dinamismo (25 %)

| Decisión de G1 | Cómo puntúa | Verificación |
|----------------|-------------|--------------|
| Un único año personal como estado global | el gesto más simple mueve todo el producto | `U4`, `M2` |
| Año → mapa + distribución + titular sincronizados | dinamismo observable en una sola interacción | `PERF7` + `P4` |
| Progresión multiescala Bizkaia → municipio → celda → edificio | movimiento exploratorio con significado | `M1`, `VR3` |
| `flyTo` corto al elegir municipio | transición espacial comprensible | `A5` (con reduced-motion equivalente) |
| Ortofoto opt-in con `swipe` | comparación temporal dentro de G1 | `REL5`, `P5` |

## 10. Calidad y comprensión de los datos (25 %)

| Decisión | Cómo puntúa | Verificación |
|----------|-------------|--------------|
| Titular en 1.ª persona con cifra y ámbito explícitos | comprensión inmediata | `P3`, `C2` |
| Denominador y cobertura **contiguos** a toda cifra | elimina la ambigüedad del porcentaje | `C2`, `D5` |
| **Una sola** distribución por décadas | evita la sobrecarga de widgets | `P4` |
| El zoom no cambia el universo estadístico | la cifra significa siempre lo mismo | `U4` |
| Divulgación progresiva en 4 niveles | del titular a la metodología sin muros | `C6`, `A4` |
| Disclosure de heaping junto al gráfico | evita leer precisión inexistente | `C4` |

## 11. Rigor y calidad en los datos (25 %)

| Decisión | Cómo puntúa | Verificación |
|----------|-------------|--------------|
| Frontend **no** recalcula denominadores | una sola fuente de verdad | `D4` |
| Contratos `C-01`…`C-12` intactos | trazabilidad metodológica | `D2` |
| `NO_YEAR` (sin dato / anómalo) fuera de las métricas y publicado | no se esconde incertidumbre | `D5`, `M3` |
| Reparaciones de geometría registradas | ninguna corrección silenciosa | `D6` |
| Cobertura por campaña como estado de dominio | rigor en la evidencia aérea | `REL5` |
| Manifests, licencias y snapshot visibles | procedencia verificable | `PROV1`–`PROV3` |

## 12. Innovación en la representación (15 %)

| Decisión | Cómo puntúa | Verificación |
|----------|-------------|--------------|
| Integración coherente año + geografía multiescala + estadística + ortofoto + metodología | es la aportación diferencial verificada | `D4`, `U4`, `M1` |
| Un único estado temporal que gobierna cuatro capas | no es «building age map + birth year» | `M2`, `U4` |
| Celdas como nivel intermedio con métrica declarada | evita la lectura ambigua del agregado | `M3`, `C2` |

Validación de la hipótesis de diferenciación: `docs/design/G1-TU-BIZKAIA.md` §17.

## 13. Diseño y usabilidad (10 %)

| Decisión | Cómo puntúa | Verificación |
|----------|-------------|--------------|
| Estructura editorial, no panel de GIS | identidad propia | `HR1` |
| Móvil primero real, hoja inferior, objetivos ≥ 44 px | usabilidad móvil | `U6`, `A9` |
| Escala de grises y `prefers-reduced-motion` | accesibilidad integrada | `M4`, `A5` |
| Jerarquía con el dato como protagonista | densidad controlada | `P4`, `HR1` |

## 14. Riesgo competitivo declarado

El mayor riesgo competitivo de G1 **no** es de datos ni de arquitectura (ya validados en G0),
sino de **diseño de información, copy y ejecución visual**. Por eso la revisión humana
bloqueante `HR1`/`HR2` se centra exactamente en eso.
