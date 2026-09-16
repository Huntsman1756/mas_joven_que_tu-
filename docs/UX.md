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
comunica el desfase («más próxima a 1987: 1983»).

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
