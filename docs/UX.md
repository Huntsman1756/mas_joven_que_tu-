# UX — jerarquía, flujos, responsive, interacción

> El frontend forma parte del producto, no es una capa decorativa.
> Objetivo: experiencia editorial interactiva, no un dashboard.

## 1. Principios de UI

- **Mapa = protagonista. Texto = guía. Controles = secundarios.**
- Prohibido: panel lateral permanente de GIS, "checkbox forest", tablas masivas,
  modal inicial, tutorial de diez pasos.
- El usuario no aprende la interfaz: introduce año y lugar y ve un resultado.

## 2. Jerarquía de pantallas

```
/  Hero ─────────────────────── 2 campos + 1 CTA
   └─ /explorar  Mapa + stats + histograma + timeline
        └─ panel de edificio seleccionado (disclosure)
        └─ /tiempo   Comparador de ortofotos + swipe
        └─ /historias   Scrollytelling
             └─ /historias/[slug]
        └─ /como-lo-sabemos
```

## 3. Flujo principal (TU BIZKAIA)

```
1. Hero: [año de nacimiento]  [municipio/lugar]  [Ver mi Bizkaia]
2. Al enviar:
   - centra el mapa en el lugar elegido;
   - aplica el filtro temporal (BEFORE / AFTER / UNKNOWN);
   - muestra el titular personalizado + cobertura del dato;
   - dibuja el histograma con la línea del año elegido;
   - preselecciona la ortofoto más próxima (no la muestra aún si el usuario no la pide).
3. El usuario mueve el control temporal → TODO se actualiza de forma coherente.
4. El usuario puede abrir el comparador de ortofotos y hacer swipe.
5. Botón "Compartir esta vista" → copia la URL con year/place/view.
```

## 4. Flujo de la máquina del tiempo

```
/tiempo
 ├─ selector de campaña (o slider de campañas)
 ├─ toggle comparar (2 campañas)
 ├─ swipe arrastrable (ratón / táctil / teclado)
 ├─ pan/zoom/bearing/pitch sincronizados entre lados
 └─ pie: fuente + año nominal + rango real de vuelo
```

Al llegar desde *Tu Bizkaia*: se abre la campaña más próxima al año del usuario y se
comunica el desfase con el valor **calculado** («más próxima a {Y}: {nearest_year}»).
La cobertura se trata como **estado de dominio**: `AVAILABLE` | `NOT_COVERED` | `SERVICE_ERROR`
(`G1-STATE-MODEL.md` §3). Prohibido sustituir la campaña en silencio.

## 5. Interacciones del mapa

| Gesto | Acción |
|-------|--------|
| Click en edificio | Abre panel con año, uso, alturas, huella; si `UNKNOWN`, lo dice |
| Click en celda/municipio (zoom bajo) | Muestra agregados + cobertura |
| Hover en histograma | Resalta el intervalo y sugiere el filtro |
| Click en histograma | Fija el intervalo como filtro (sin crear ambigüedad) |
| Selección de campaña | Cambia la capa raster manteniendo la vista |

Regla: **ninguna interacción debe poder interpretarse de dos maneras**. Si una
interacción secundaria genera ambigüedad, se elimina.

## 6. Controles

- Un **único control temporal** visible en `/explorar`.
- En comparación se permiten dos años explícitos (izquierda/derecha).
- El histograma muestra el año elegido como referencia clara y persistente.
- Controles flotantes pero discretos; nunca tapan el mapa en móvil.

## 7. Responsive (mobile-first real)

- **Móvil**: mapa a pantalla casi completa con **bottom sheet** en vez de sidebar;
  targets táctiles ≥ 44 px; el scroll de página no debe quedar secuestrado por el mapa
  (el mapa captura gestos solo cuando el usuario interactúa con él de forma explícita).
- **Desktop**: mapa a ancho completo o casi; tipografía editorial; paneles flotantes.
- Probar portrait y landscape.

## 8. Accesibilidad (resumen; detalle en ACCESSIBILITY.md)

- Navegación por teclado, foco visible, labels reales, contraste AA.
- No depender solo del color (patrón/etiqueta además de color).
- `prefers-reduced-motion` respetado; la historia funciona sin animación.
- Alternativa textual resumen para las visualizaciones esenciales.

## 9. Estados vacíos y de error

Cada estado tiene copy real en `UX_COPY.md`. Regla: **nunca** spinner infinito.

## 10. Rendimiento percibido

- El mapa debe ser usable antes de que carguen todos los detalles.
- Progresión de zoom: agregados primero, edificios cuando el zoom los justifica.
- En G0 el rendimiento se **caracteriza** (no decide el gate); los **presupuestos numéricos
  se preregistran para G1** (`docs/gates/G0.md` §1).

---

# G1 — «Tu Bizkaia» (especificación de experiencia)

> Fuente de verdad de detalle: `docs/design/G1-TU-BIZKAIA.md`, `G1-STATE-MODEL.md`,
> `G1-FRONTEND-ARCHITECTURE.md`, `G1-PERFORMANCE-BUDGETS.md`.

## 11. Enfoque elegido

**Personal-first.** Año + lugar → respuesta visual inmediata. Se descarta el arranque por
relato (riesgo de leerse como narrativa, excluida por la Base 1) y el arranque por explorador
de mapa (retrasa el «aha» y se parece al GIS institucional que el charter rechaza).
Comparación completa: `docs/design/G1-APPROACHES.md`.

## 12. Estructura de la pantalla de resultado (editorial, no panel de GIS)

```
cabecera compacta: marca · chip “1987 · Leioa” · Compartir
──────────────────────────────────────────────
titular (1.ª persona) + cifra
denominador + cobertura          ← inseparables de la cifra
¿Cómo se calcula?                ← nivel 3 de divulgación
──────────────────────────────────────────────
MAPA a sangre (banda propia) + leyenda flotante
──────────────────────────────────────────────
UNA distribución por décadas con el marcador TU AÑO
──────────────────────────────────────────────
teaser de ortofoto (opt-in)  ·  fuentes y licencias
```

- **Prohibido** el panel lateral permanente de GIS y la colección de widgets.
- El mapa ocupa **una banda propia a sangre**; nunca compite con 3 gráficos.
- En móvil la distribución y el detalle de edificio van en **hoja inferior** (bottom sheet),
  no en paneles laterales.

## 13. Regla del universo estadístico (invariante de UX)

> **`viewport ≠ universo estadístico`.**

- Titular y distribución usan **siempre el municipio** seleccionado.
- **El zoom no cambia la cifra.** El titular sigue diciendo «En Leioa…».
- Buscar una calle o un portal mueve la **cámara**, no el universo.
- Cambiar de unidad exige **elegir otro municipio**.
- Las cifras de celda son **secundarias** y se etiquetan como de celda.

Detalle y justificación: `docs/design/G1-TU-BIZKAIA.md` §4. Es una defensa deliberada contra
una visualización atractiva pero estadísticamente ambigua.

## 14. Multiescala

Definición **única y total** de la escala (fuente: `docs/design/G1-TU-BIZKAIA.md` §6.2).
Ningún valor real de zoom queda sin representación.

| Dominio | Nivel | Capa |
|---------|-------|------|
| `z < 9` | Bizkaia | municipios |
| `9 ≤ z < 13,5` | celdas 500 m | celdas |
| `z ≥ 13,5` | edificio | edificios |

Conmutación **discreta** en el umbral: los dominios son mutuamente excluyentes, así que nunca
hay dos capas temporales simultáneas ni un intervalo sin capa.

El encuadre inicial del resultado es **municipal (z 11–12)** y se sirve con **celdas**: la
primera respuesta no descarga 14.000 polígonos.

## 15. Héroe sin mapa

El hero **no monta MapLibre**. El gancho es la pregunta personal, y el motor de mapa se carga
solo cuando hay un resultado que mostrar. Es una decisión de jerarquía y de presupuesto
(`G1-PERFORMANCE-BUDGETS.md` §4.1).

## 16. Ortofoto como contexto, no como producto

En G1 la ortofoto es **opt-in** y su cobertura es un **estado de dominio**
(`AVAILABLE` / `NOT_COVERED` / `SERVICE_ERROR`). La máquina del tiempo completa es G2.
