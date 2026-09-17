# PRODUCT — journeys, features y modelo de estado

> Documento canónico de producto. Se actualiza **junto con** `docs/UX_COPY.md`.

## 1. Modelo de estado (la pieza congelada)

Existe **un único estado temporal** visible: `year` (año elegido por el usuario).
Todo lo demás deriva de él.

```ts
type AppState = {
  year: number | null;        // año de nacimiento elegido. null = sin elegir
  place: Place | null;        // municipio o lugar de Bizkaia
  view: { lat: number; lon: number; zoom: number; bearing: number; pitch: number };
  mode: 'explore' | 'time-travel' | 'stories' | 'about';
  layer: 'buildings' | 'ortho';
  compare: { enabled: boolean; left: OrthoCampaign | null; right: OrthoCampaign | null };
};
```

Reglas de coherencia (invariantes):

1. Cambiar `year` **debe** actualizar simultáneamente: edificios, métricas,
   histograma, copy y ortofoto sugerida. Nunca dos sliders temporales contradictorios
   en la misma pantalla.
2. En modo comparación **sí** existen dos años (izquierdo/derecho), porque representa
   una comparación explícita.
3. `compare.left` y `compare.right` comparten `view` (centro, zoom, bearing, pitch).
4. `year` se serializa en URL. `place` se serializa como slug. No se serializa nada personal.
5. Si el usuario no elige año, no se inventa uno: se muestra el hero.

## 2. Estados explícitos del dato

| Estado | Significado | Representación |
|--------|-------------|----------------|
| `OBSERVED` | Valor tomado directamente de la fuente | Se muestra tal cual |
| `DERIVED` | Calculado por nosotros a partir de observados | Se muestra con *¿Cómo se calcula?* |
| `UNKNOWN` | Fuente sin dato (p. ej. `Ano_Constr = 0` o vacío) | Estilo propio; nunca 0, nunca 1900 |
| `NOT_APPLICABLE` | La pregunta no aplica a esa entidad | No se muestra |

## 3. Áreas del producto

```
/                      Hero — TU BIZKAIA
/explorar?...          Mapa + estadísticas + timeline
/tiempo?...            VIAJA EN EL TIEMPO (ortofotos + swipe)
/historias             HISTORIAS DEL CAMBIO (scrollytelling)
/historias/[slug]      Capítulo
/como-lo-sabemos       CÓMO LO SABEMOS  (primera clase, no pie de página)
/privacidad            Solo el año; nada se envía
```

### 3.1 TU BIZKAIA (`/`, `/explorar`)

- Hero con: título, pregunta, **[año de nacimiento]**, **[busca un municipio o lugar]**,
  CTA **Ver mi Bizkaia**.
- Resultado: titular personalizado + mapa + estadística principal + cobertura del dato +
  distribución por décadas + control temporal.
- Nunca pide nombre, email, fecha completa ni cuenta.

Titular (estructura, no cifra):

> «Eres de **1987**. En **Leioa**, **X de cada 100** edificios actuales con año conocido
> se terminaron después de que nacieras.»

Y debajo, no en letra pequeña:

> «Esto no significa que antes no hubiese construcción. El Catastro describe los edificios
> que existen actualmente.»

### 3.2 VIAJA EN EL TIEMPO (`/tiempo`)

- Selección de campaña; comparación de dos campañas; swipe antes/después.
- Autoplay opcional (solo si es técnicamente sólido y respeta reduced-motion).
- Centro, zoom, bearing y pitch **idénticos** en ambos lados.
- Siempre visible: **fuente y fecha real de vuelo**.
- Al elegir año, se preselecciona la ortofoto temporalmente más próxima y se comunica:
  «La fotografía oficial más próxima a {Y} disponible es la de {nearest_year}»
  (valores **calculados**, contrato `C-11`; con `Y = 1987` el resultado es **1990**,
  ver `DATA_SEMANTICS.md` `M-11`).
- Carga progresiva (ADR-011): tras el opt-in se pinta primero un preview local de
  **la misma campaña oficial** a baja resolución, y las teselas oficiales de alta
  resolución lo refinan encima en cuanto llegan. Nunca se muestra otra fecha ni
  una imagen sintética; si el servicio oficial falla, el copy de error sigue
  siendo el real.

### 3.3 HISTORIAS DEL CAMBIO (`/historias`)

- Scrollytelling breve. El orden y la selección salen de un método **dato-primero**:
  grid/hex → suma de huella de edificios actuales por década → delta temporal →
  candidatos → revisión con ortofotos → selección editorial.
- Diversidad buscada: urbana, industrial, residencial, costa/infraestructura, inesperado.
- Candidatos a *estudiar* (no elegidos de antemano): Abandoibarra, Zierbena/puerto,
  Zamudio/Txorierri, Galindo/Barakaldo/Sestao.
- Cada capítulo responde: qué vemos · cuándo cambia · qué dato lo sustenta · **qué no sabemos**.

### 3.4 CÓMO LO SABEMOS (`/como-lo-sabemos`)

Sección de primera clase. Responde en lenguaje humano: qué es el Catastro, qué mide
`Ano_Constr`, qué es "edificio actual", por qué hay años desconocidos, qué es una ortofoto,
por qué la campaña nominal puede diferir del vuelo real, qué métricas calculamos y cuáles no,
fuentes, licencias, código y fecha del snapshot. Enlaza a metodología técnica.

## 4. Features (alcance)

| ID | Feature | Fase |
|----|---------|------|
| F-01 | Selección de año + lugar, sin cuenta | G1 |
| F-02 | Mapa de edificios por estado temporal (`≤ year`, `> year`, `UNKNOWN`) | G1 |
| F-03 | Estadística principal personalizada con denominador explícito | G1 |
| F-04 | Indicador de cobertura del dato (`known` / `unknown` / %) | G1 |
| F-05 | Histograma sincronizado con línea del año elegido | G1 |
| F-06 | Control temporal único | G1 |
| F-07 | Serie de ortofotos con selección de campaña | G2 |
| F-08 | Swipe antes/después (maplibre-gl-swipe) | G2 |
| F-09 | Fuente + fecha real de vuelo siempre visible | G2 |
| F-10 | URL compartible con `year`, `place`, `view` | G1 |
| F-11 | Scrollytelling con capítulos dato-fundados | G3 |
| F-12 | *Cómo lo sabemos* + disclosures *¿Cómo se calcula?* | G1/G3 |
| F-13 | Agregados multiescala (municipio / celda / edificio) | G1 |
| F-14 | Accesibilidad AA + alternativa textual | G4 |

## 5. Multiescala del mapa (rendimiento)

Dominios de escala exclusivos (M1): `[7, 9)` municipio · `[9, 13.5)` celda · `[13.5, ~]` edificio.

- Zoom bajo → agregados por **municipio** (nunca miles de polígonos a la vez).
- Zoom medio → celdas de 500 m con cuota de construidos después del año (C-05)
  y contorno del **municipio seleccionado** (GeoJSON ligero).
- Zoom urbano → edificios individuales con `≤ year` / `> year` / `UNKNOWN`.
- `UNKNOWN` tiene estilo propio y leyenda propia.
- Las fuentes PMTiles se instancian solo dentro de su dominio de zoom (el
  índice no se descarga fuera de rango).

## 6. Estados vacíos / error (contrato de copy)

- Sin año → hero, sin mapa de resultado; nunca un mapa vacío sin explicación.
- `UNKNOWN` en un edificio → «El Catastro no indica un año de construcción para este edificio.»
- Ortofoto no cubierta por esa campaña → «La campaña de {Y} no cubre este lugar.» +
  alternativas verificadas. Estado de dominio `NOT_COVERED`, distinto de `SERVICE_ERROR`
  (ver `G1-STATE-MODEL.md` §3).
- Ortofoto no disponible por servicio → «La ortofoto oficial no está disponible
  temporalmente. El resto de la visualización sigue funcionando.»
- Servicio caído → «La ortofoto oficial no está disponible temporalmente. El resto de la
  visualización sigue funcionando.»
- Cobertura baja → «En este municipio falta el año de construcción en una parte relevante
  del parque actual. Consulta cómo afecta al cálculo.»

Sin spinners infinitos: todo fallo tiene mensaje.
