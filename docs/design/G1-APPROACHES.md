# G1 — Comparación de enfoques de experiencia

> Fase de diseño. **No implementación.** Base: `be26508` (G0_PASS), rama `g1-design`.
> Los tres enfoques se evalúan contra el rubric oficial (§`COMPETITION.md`), no por gusto.

## 0. Criterio de decisión

El rubric de la categoría *Visualización de datos* es: **dinamismo 25 % · comprensión 25 % ·
rigor 25 % · innovación 15 % · diseño y usabilidad 10 %**. Además, la Base 1 del decreto
**excluye** los trabajos cuyo eje principal sea la narración periodística. Eso descarta de
raíz cualquier enfoque cuya entrada sea el relato.

## 1. Los tres enfoques

### A. PERSONAL-FIRST (año + lugar → respuesta → mapa → distribución → explicación)

```
[año de nacimiento] [lugar de Bizkaia]  →  CTA
        ↓
titular personalizado + cobertura
        ↓
mapa (protagonista)
        ↓
una única distribución por décadas
        ↓
cómo se calcula / metodología
```

### B. STORY-FIRST (relato inicial → ejemplos → personalización)

```
explicación editorial  →  casos ilustrativos  →  “ahora introduce tu año”
```

### C. EXPLORER-FIRST (mapa general → exploración → año)

```
mapa de Bizkaia  →  el usuario explora  →  después introduce año y lugar
```

## 2. Comparación

| Dimensión | A · Personal-first | B · Story-first | C · Explorer-first |
|-----------|--------------------|-----------------|--------------------|
| Tiempo hasta el «aha» | **1 interacción** | 3–5 pantallas | indefinido (depende del usuario) |
| Dinamismo (25 %) | **alto**: un único año gobierna mapa, cifras y distribución | bajo: el año aparece tarde | medio: la exploración no es la métrica personal |
| Comprensión (25 %) | alto si el copy declara denominador; riesgo de cifra sin contexto | alto para el método, bajo para la cifra personal | bajo: mapa sin marco temporal que interpretar |
| Rigor (25 %) | **alto**: la cifra canónica es el centro | alto | bajo: invita a leer áreas sin universo declarado |
| Innovación (15 %) | **alto**: el año personal como estado global | bajo: formato conocido | bajo: patrón GIS habitual |
| Diseño/usabilidad (10 %) | **alto**: formulario + resultado, mobile-first natural | medio: más scroll y jerarquía | bajo en móvil: explorer a pantalla completa |
| Encaje con la Base 1 | **correcto** (visualización) | ⚠️ riesgo de leerse como narrativa | correcto pero débil |
| Test de 5 segundos | **supera** (se entiende qué introducir y qué se obtiene) | no supera (no se sabe qué hacer) | no supera (no hay nada que introducir) |
| Carga cognitiva inicial | baja | media-alta | alta |
| Bounce probable | bajo | medio-alto | alto |

## 3. Decisión

**Se adopta A (PERSONAL-FIRST).**

Motivos, en orden de peso:

1. **Es el único enfoque cuyo eje principal es la explotación visual del dato**, que es la
   definición literal de la categoría. B se aproxima al eje narrativo excluido.
2. **Maximiza el dinamismo** —el criterio de mayor peso— porque el año del usuario pasa a ser
   la variable que mueve mapa, cifras y distribución a la vez.
3. **Aprovecha la única aportación diferencial verificada del proyecto** (año personal como
   estado global sincronizado, `PROJECT_CHARTER.md` §6).
4. Es el enfoque con menor riesgo en móvil, que es el 10 % del rubric y donde se pierde más
   fácilmente.
5. Convierte el rigor en ventaja visible: la cobertura y el denominador se muestran *junto*
   a la cifra, no en una página aparte.

**Cuánto se toma de los otros dos:**

- De **C** se conserva la exploración *después* de la respuesta: una vez el usuario tiene su
  año, puede alejar el mapa y recorrer Bizkaia. Nunca *antes*.
- De **B** se conserva el contenido explicativo, pero reubicado en el *progressive
  disclosure* («¿Cómo se calcula?» → `Cómo lo sabemos`) y, más adelante, en las historias de G3.

**Lo que se descarta explícitamente:** mapa inicial sin año, relato como puerta de entrada,
y cualquier ejemplo de «así creció Bizkaia» como argumento de apertura.

## 4. Consecuencias de la decisión

- El **hero no carga MapLibre**: el gancho es la pregunta personal, no el mapa.
  (Decisión de rendimiento coherente, ver `G1-PERFORMANCE-BUDGETS.md`.)
- El **año debe poder introducirse sin cuenta y sin fecha completa**, y debe aceptar
  cualquier año plausible —no solo años de nacimiento— para no excluir a quien no quiera
  dar el suyo.
- El estado temporal es **único**: no hay dos controles temporales en pantalla.
- La **ortofoto es opt-in** (teaser de G2), no se carga sola: mantiene ligero el primer
  resultado y evita convertir G1 en la máquina del tiempo.
