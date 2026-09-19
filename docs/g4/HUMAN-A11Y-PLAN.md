# G4-R · HUMAN-A11Y-PLAN — más allá de axe

Axe da 0 violaciones en los gates. Esto cubre lo que axe no ve.
**Nada de lo siguiente se marca PASS** — son guiones para prueba humana.

## Revisión estática ya realizada (lectura de código + sondas)

| Área | Hallazgo |
|------|----------|
| Jerarquía de encabezados | `h1` único ✓; `h2` dist.title + planning; `h3` en address/contrast — secuencia aparentemente correcta pero saltos h2→h3 en sheet sin h2 de sección para la mayoría de módulos (los módulos G3-D usan `<p class="q">` como título visual — **no son encabezados**: lector de pantalla no puede navegar por ellos) |
| Landmarks | `main` ✓, sections con `aria-label` ✓, footer; el `.sheet` no es landmark — el contenido principal de profundidad no tiene región |
| Skip link | existe ✓ |
| Focus order | DOM order = visual order ✓ |
| Focus restoration | BUG-03: Escape no cierra disclosures ni restaura foco |
| Combobox | PlaceSearch usa `role=combobox` + `aria-activedescendant` ✓; Enter-sin-selección no compromete (BUG-04) — para teclado exige ArrowDown+Enter, aceptable si el listbox está anunciado |
| Anuncios dinámicos | `role=status/alert` en loading/errores ✓; **¿los cambios de resultado tras seleccionar edificio se anuncian?** — el contenido aparece ~2 viewports abajo sin aviso (riesgo real de descubribilidad SR) |
| Mapa | canvas con alternativa textual en tooltips/CellDetail — equivalente no completo pero existente; el mapa no es operable por teclado (decisión razonable: la estadística está disponible por texto) |
| Targets | 44px en móvil verificado en gates ✓ |
| Reduced motion | cubierto en gates ✓ |
| 400% zoom | cubierto en gates ✓ |

## Hallazgos estáticos para corregir en G4

1. **Títulos de módulo como `<p>` con clase**: `context.title`,
   `planning.title`, invites… deberían ser `h2/h3` para navegación SR.
2. **Sin `aria-live` en la aparición de profundidad**: al resolver un
   edificio, BuildingCard/planning/contexto aparecen abajo — un SR no
   sabe que llegaron. Candidato: `aria-live=polite` en un resumen o
   foco movido a la ficha.
3. **La overlay opt-in no anuncia su estado** (activa/inactiva) —
   `aria-pressed` en los botones `.geom` (verificar si existe).
4. **Timeline**: los botones ± año tienen etiqueta ✓; el scrub es
   `role=slider`? — verificar; las marcas de campaña son botones ✓ pero
   su significado («llevar a la foto de ese año») puede no anunciarse.
5. **CellDetail seleccionado por tap** — equivalente de teclado:
   «Ver datos de esta zona» existe ✓ pero selecciona el centro del
   mapa, no la celda elegida — la selección arbitraria no tiene
   equivalente de teclado.
6. **PlaceSearch**: `aria-expanded` se sincroniza ✓; el caso «una sola
   candidata» debería seleccionarse con Enter (BUG-04).
7. **Errores**: `role=alert` ✓ en boot/metrics/ortho — verificar que el
   retry recupera foco.

## Guiones de prueba humana (para ejecutar cuando corresponda)

### NVDA + Firefox/Chrome (Windows — ejecutable aquí post-reboot)

```
G1 arranque:  NVDA+F (browse) → leer la página de intro
  → ¿se entiende qué pedir? ¿los labels año/lugar se anuncian?
G2 flujo:     teclear año → Tab → place → ArrowDown+Enter → Tab → Enter
  → ¿llega a result? ¿se anuncia el cambio de fase?
G3 resultado: H (por encabezados) → recorrer
  → ¿aparecen los módulos como encabezados? (hoy NO — hallazgo 1)
G4 mapa:      Tab hasta «Ver datos de esta zona» → Enter
  → ¿se anuncia el detalle? ¿se puede cerrar?
G5 tiempo:    Tab a Reproducir → Enter → ¿el estado playing se anuncia?
  → Space en scrub → ¿role=slider con valor?
G6 edificio:  Tab hasta «Buscar una dirección» → completar flujo
  → ¿la ficha resultante se anuncia o hay que descubrirla?
G7 overlays:  Tab a botón geom → Enter → ¿se anuncia activado?
```

### VoiceOver + Safari/iOS (si hay equipo — si no, documentar como gap)

```
V1 rotor encabezados → misma verificación de jerarquía
V2 gesto de exploración sobre el mapa → ¿qué anuncia el canvas?
V3 completar MI EDIFICIO en touch → ¿los listboxes son operables?
```

### Checklist objetivo por guion

- [ ] Todos los módulos alcanzables por encabezados
- [ ] Cada acción opt-in anuncia su estado resultante
- [ ] Ningún contenido nuevo aparece sin señal (aria-live o foco)
- [ ] Escape cierra disclosures y devuelve foco al invocador
- [ ] El mapa no es requisito: toda estadística existe en texto
- [ ] CTA labels autocontenidos fuera de contexto
