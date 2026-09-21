# PROJECT_CHARTER — Más joven que tú

> Documento canónico. Congela la idea del producto. Cualquier cambio de alcance
> requiere actualizar este documento y registrar el motivo.

## 1. Título y subtítulo

- **Título:** Más joven que tú
- **Subtítulo:** 70 años construyendo Bizkaia
- **Slug / repo:** `mas-joven-que-tu`
- **Categoría:** Visualización de datos (categoría *a*) — *Premios al Reto de Periodismo de Datos 2026*
- **Organiza:** Open Data Bizkaia / Diputación Foral de Bizkaia
- **Norma:** Decreto Foral **73/2026**, de 23 de julio (BDNS 921443) — texto íntegro en `docs/legal/`
- **Plazo de solicitud:** **2026-07-28 → 2026-11-20 (13:00)**
- **Premios categoría (a):** 1.º 1.500 € · 2.º 750 € (presupuesto total 6.750 €)

## 2. Pregunta central

> **¿Qué parte de la Bizkaia que ves hoy apareció después que tú?**

El usuario introduce su año de nacimiento y un lugar de Bizkaia. El año se convierte
en el **estado temporal global**: gobierna mapa de edificios, estadísticas, histograma,
ortofoto mostrada, comparaciones y URLs compartibles.

## 3. Por qué este proyecto (y no otro)

- El Catastro de Bizkaia publica **año de construcción por edificio** (campo `Ano_Constr`),
  con cobertura muy alta verificada en un municipio (Leioa: 99,79 %; **no generalizable**
  hasta el reconocimiento territorial de G0).
- Bizkaia publica **nueve campañas de ortofoto histórica** (1956–2002) y geoEuskadi
  publica la serie oficial hasta **2025**, con CORS verificado.
- Existe un antecedente directo (*Bizkaiko etxeak*, Mikel Iturbe, 2016) con stack
  obsoleto y datos no publicados. Este proyecto lo cita y explica su aportación nueva.
- La combinación **dato cuantitativo + evidencia fotográfica + personalización temporal**
  es lo que diferencia esta pieza de un dashboard o de un comparador de ortofotos.

## 4. Usuario objetivo

- Persona residente en Bizkaia o con vínculo con ella (nacimiento, familia, vivienda).
- Periodista o docente que quiera una herramienta de contexto territorial.
- Jurado del concurso evaluando dinamismo, datos y representación.

No hay perfil "experto GIS". El producto debe funcionar **sin tutorial**.

## 5. Definición de éxito

1. Un usuario nuevo entiende la propuesta en **< 5 s** y obtiene un resultado
   personalizado en **< 30 s**.
2. Cada cifra mostrada es **trazable** a una fuente oficial y tiene denominador explícito.
3. La serie de ortofotos se puede recorrer con centro/zoom sincronizados y swipe.
4. La sección *Cómo lo sabemos* responde a todas las dudas metodológicas **sin contexto oral**.
5. El producto cumple los criterios del rubric de forma objetivamente verificable
   (ver `docs/COMPETITION.md`).
6. Cualquier persona nueva puede contestar las 14 preguntas de la sección 28 del encargo
   leyendo solo el repositorio.

No prometemos "ganar puntos"; documentamos el encaje con el rubric y lo verificamos.

## 6. Criterios de evaluación y cómo los atendemos

| Criterio | Peso | Cómo se atiende |
|----------|------|-----------------|
| Nivel de dinamismo | 25 % | Año como estado global sincronizado; slider + histograma + mapa + ortofoto + swipe; autoplay opcional |
| Calidad y comprensión de los datos | 25 % | Denominadores explícitos, cobertura visible, *Cómo lo sabemos*, disclaimer in-context |
| Rigor y calidad en los datos | 25 % | QA reproducible, manifests, semántica documentada, unknowns explícitos |
| Innovación en la representación | 15 % | Sincronía Catastro ↔ ortofoto histórica mediante una única variable personal |
| Diseño y usabilidad | 10 % | Mapa protagonista, mobile-first, accesibilidad WCAG 2.2 AA |

## 7. No-objetivos (explícitos)

- ❌ Reconstruir el parque histórico de edificios (los demolidos no están en Catastro).
- ❌ Medir "crecimiento" en superficie construida. Solo huella en planta (`footprint_area`).
- ❌ Derivar métricas históricas por computer vision sobre ortofotos.
- ❌ Cubrir toda Euskadi: el ámbito es Bizkaia (salvo que una fuente lo amplíe sin coste).
- ❌ Backend propio, base de datos en producción, PostGIS.
- ❌ IA / LLM en runtime.
- ❌ Cuentas, login, datos personales. Solo el año; nunca fecha completa, nombre o email.
- ❌ Reconstrucción del uso histórico del suelo a partir del planeamiento actual.
- ❌ Narrativa audiovisual o investigación periodística de campo.

## 8. Elegibilidad y encuadre legal (Decreto Foral 73/2026)

- **Elegibilidad:** personas físicas ≥ 18 años, individualmente o en equipos de **hasta 4**.
  Se participa como persona física (no como sociedad).
- **Condición de contenido (Base 1):** los proyectos deben basarse **obligatoriamente** en
  datos de **Open Data Bizkaia**; otras fuentes solo si **complementan** la información
  principal. → El Catastro y las ortofotos 1956–2002 del portal son la **base**;
  geoEuskadi (ortofotos 2004–2025, NORA) es **complemento**.
- **Documentación técnica obligatoria (Base 6):** dataset o procedencia y forma de acceso,
  proceso de trabajo y herramientas. Su ausencia limita el criterio de rigor.
- **Propiedad intelectual (Base 18):** la persona participante declara titularidad y
  legitimación sobre los contenidos, no infringe derechos de terceros y **exime a la
  Diputación de responsabilidad**. La reutilización de OSS/material de terceros exige
  licencia compatible y atribución → `docs/OSS_REUSE.md` es un requisito legal.
- **Difusión (Base 14.2):** autorización de publicación/difusión del proyecto en el portal
  Open Data Bizkaia, sin remuneración. No es cesión de titularidad ni licencia abierta.
- **Obligaciones si se premia (Base 19):** asistir al acto de entrega y **presentar
  públicamente el proyecto**.
- **No regulado:** publicación previa/inédito y mantenimiento de enlaces. No se infiere
  nada (`docs/COMPETITION.md` §3).

## 9. Encuadre ético y de privacidad

- Solo se recoge el **año** de nacimiento. Vive en la URL del cliente; al abrir o
  recargar un enlace compartido, esos parámetros viajan en la petición inicial al
  hosting — pero la app no tiene backend propio, no usa cookies ni almacena nada.
  La búsqueda de dirección envía el texto de la calle a NORA (declarado en el
  copy). (Base 21 aplicable, sin tratamiento de datos personales por nuestra parte.)
- Se respeta `prefers-reduced-motion`; la historia funciona sin animación.
- Se distingue visiblemente **datos / código / inspiración** en los créditos.

## 10. Estado

- **Fase actual:** P0 (fundación) — revisión adversarial aplicada.
- **G0:** preregistrado y con la muestra congelada (`docs/gates/G0.md`); **no ejecutado**.
- **Siguiente paso:** aprobación humana de la especificación. No se inicia G0 sin ella.
