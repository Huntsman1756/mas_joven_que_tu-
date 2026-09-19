# G4-R · CONTROL-AUDIT — cada control, un propósito

## Tabla de redundancia

| Control | ¿Propósito único? | ¿En el momento justo? | ¿Etiqueta clara? | ¿Se puede fusionar/quitar? |
|---------|-------------------|----------------------|------------------|---------------------------|
| ViewSwitch MAPA·TIEMPO·FOTO | sí — el modo de escena | sí | parcial («FOTO» promete escena, da panel) | renombrar o hacerlo modo real |
| Timeline play/step/scrub/reset | sí — la mecánica temporal | siempre visible bajo el mapa | sí | — |
| Marcas de campaña en eje | sí — acceso a foto por año | descubrible | no se entiende hasta usar («campaña») | mantener como LA entrada a foto |
| «Reiniciar desde {year}» | sí | tras play | sí | — |
| OrthoControls «Ver la foto de {y}» | **no — duplica marcas + FOTO** | en sheet | sí | **MERGE → dentro de escena** |
| PhotoPanel nav campañas/compare | sí — dentro de FOTO | solo modo foto | sí | queda dentro del modo |
| HistMapControls «Ver el mapa histórico» | sí | en sheet | parcial | **MERGE → modo de escena `view=hist`** |
| «Ver datos de esta zona» | sí — equivalente teclado | sobre mapa | sí | — |
| Zoom ± | sí | sobre mapa | sí | — |
| AddressSearch «Buscar una dirección» | sí | sheet | sí | mover al tramo de acción |
| CompareYear «Añade otro año» | sí | sheet | sí («Por ejemplo el de otra persona») | mismo tramo |
| Planning «Qué significa» | sí | disclosure | sí | — |
| Context overlay botones `.geom` | sí | por edificio | «ver en el mapa» implícito | añadir aria-pressed/estado |
| Ruido D/T/N switch | sí | dentro de módulo | sí | — |
| ShareButton | sí | topbar | sí | — |
| «Cambiar año o lugar» | sí | topbar | sí | — |
| details.calc «¿Cómo se calcula?» | sí | bajo titular | sí | — |
| Cerrar/reset address | sí | en flujo | sí | + Escape (BUG-03) |

## Los tres caminos a la ortofoto — contrato recomendado

Hoy: (a) marca de campaña en el eje → propuesta, (b) OrthoControls en la
sheet, (c) ViewSwitch→FOTO. Tres formas de «ver la foto», tres estilos
de botón, tres posiciones de la página.

**Contrato recomendado (documento, sin implementar):**

```
Escena = el mapa. Modos: MAPA · TIEMPO · FOTO · 1923-25.

- Las marcas de campaña del eje son LA invitación visible:
  hover/tap muestra «foto de {año}» y activa el modo FOTO con esa
  campaña.
- En modo FOTO la escena muestra la ortofoto (o el comparador) con el
  eje de campañas como selector — la navegación entre campañas vive ahí.
- OrthoControls desaparece como sección: su función pasa a las marcas +
  el modo.
- HistMapControls desaparece como sección: «1923-25» es un cuarto modo
  del switch (o una capa del modo MAPA con su propio toggle en escena).
- El comparador de dos campañas sigue dentro de FOTO (`ortho2=`).
- Resultado: un solo camino a cada evidencia; el switch se convierte en
  el mapa de todos los modos de mirar.
```

Coste UX del merge: la propuesta contextual «la foto más próxima a tu
año es de {y}» sigue existiendo como texto de la marca — no se pierde
la personalización.

## Otras fusiones evaluadas

- `details.calc` + área: la línea de área puede vivir dentro del
  cálculo (una línea menos en L1). Evaluar.
- Contrast → lectura editorial dentro del tramo de distribución (CUT B)
  o herramienta de historias (f4036/f4738): en ambos casos deja de ser
  módulo autónomo.
- «Cambiar año o lugar»: correcto ya; Enter único (BUG-04) mejora su
  flujo.

## Conteo

Hoy: 19–25 botones + 3 inputs + 1–2 disclosures en la página de
resultado; **10 acciones en el primer viewport**.
Objetivo CUT B: **≤6 acciones en primer viewport**, ≤14 botones totales
en el estado base (los demás nacen de selecciones/opt-ins).
