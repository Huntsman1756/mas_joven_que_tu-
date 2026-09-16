# INSPIRATION — referencias internacionales

> Copiamos **aprendizajes**, no diseños ni identidad gráfica.
> Ninguna referencia se usa como evidencia factual sobre Bizkaia.

## 1. elDiario.es — «¿Cuánto ha crecido tu ciudad desde que naciste?»

- **Qué funciona:** entrada de año, búsqueda local, gráfico temporal, personalización
  inmediata, advertencias metodológicas.
- **Qué no transfiere:** su métrica de crecimiento es urbana y agregada; su alcance no
  incluye evidencia fotográfica multitemporal.
- **Qué aprendemos:** el patrón «introduce tu año → resultado local» es la puerta de
  entrada correcta; el aviso metodológico debe ir pegado a la cifra.
- **Nuestra diferencia:** Bizkaia/Euskadi, Catastro foral con `Ano_Constr` por edificio,
  y ortofotografía histórica oficial **sincronizada** con el año elegido.

## 2. Morphocode — Urban Layers

- **Qué funciona:** visualización de edad de edificios, timeline, tratamiento visible de
  `UNKNOWN`, relación mapa ↔ histograma.
- **Qué no transfiere:** es un caso de una ciudad concreta, sin ortofotos ni
  personalización por año de nacimiento.
- **Qué aprendemos:** `UNKNOWN` merece estilo y leyenda propios; el histograma debe estar
  cableado al mapa.
- **Nuestra diferencia:** dos escalas de evidencia (Catastro + ortofoto) y estado temporal
  personal.

## 3. Bert Spaan — Buildings (Países Bajos)

- **Qué funciona:** rendimiento a gran escala, timeline/play, sistema de color,
  búsqueda por dirección, generación de tiles, arquitectura SvelteKit + MapLibre + PMTiles.
- **Qué no transfiere:** **no tiene licencia** ⇒ no se copia código. Otro país, otra
  fuente, ortofotos distintas.
- **Qué aprendemos:** multiescala obligatoria, clustering de edificios recientes,
  y que el stack SvelteKit + PMTiles es viable para cientos de miles de edificios.
- **Nuestra diferencia:** sólo estudiamos arquitectura; implementación propia.

## 4. geoEuskadi — Comparador de ortofotos

- **Qué funciona:** ergonomía antes/después, transparencia de fuente, navegación temporal
  entre campañas 1956–2025.
- **Qué no transfiere:** es un comparador de imágenes; no cruza el dato de edificios ni
  personaliza por año del usuario.
- **Qué aprendemos:** nomenclatura de campañas y sus fechas; la necesidad de mostrar
  fuente y año real.
- **Nuestra diferencia:** no replicamos el comparador: lo integramos como **una capa** de
  la experiencia personalizada, sincronizada con el Catastro.

## 5. swisstopo — «Journey Through Time»

- **Qué funciona:** navegación temporal con transiciones claras, continuidad espacial.
- **Qué no transfiere:** cartografía nacional suiza y su modelo de datos.
- **Qué aprendemos:** mantener centro/zoom/bearing/pitch al cambiar de época.
- **Nuestra diferencia:** el estado temporal está anclado al año del usuario.

## 6. IGN Francia — «Remonter le Temps»

- **Qué funciona:** comparación de mapas/ortofotos antiguos con explicación de fuentes.
- **Qué no transfiere:** cobertura francesa; foco en mapas históricos más que en datos de
  edificios.
- **Qué aprendemos:** cómo declarar la procedencia y la incertidumbre de fechas.
- **Nuestra diferencia:** el cruce cuantitativo Catastro ↔ ortofoto.

## 7. Sigma Awards / «Green to Grey» y otras visualizaciones geoespaciales premiadas

- **Qué funciona:** claridad narrativa apoyada en UNA idea visual fuerte.
- **Qué no transfiere:** el tema y su escala.
- **Qué aprendemos:** restringir el producto a una idea (tu año) y no acumular widgets.

## 8. Resumen de diferenciación

| Referencia | Qué tomamos | Qué evitamos |
|------------|-------------|--------------|
| elDiario.es | Patrón de personalización + caveats | Su métrica y alcance |
| Urban Layers | `UNKNOWN` visible, mapa ↔ histograma | Diseño gráfico |
| Bert Spaan | Multiescala y arquitectura (estudio) | Código (sin licencia) |
| geoEuskadi | Ergonomía before/after | Replicar el comparador aislado |
| swisstopo / IGN | Continuidad espacial y transparencia | Cartografía no vizcaína |

**Identidad gráfica: 100 % propia.** Ninguna paleta o layout se copia de las referencias.
