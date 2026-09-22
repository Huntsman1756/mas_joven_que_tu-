# Fuentes candidatas — ronda G16 (estudio, no integración)

Estado: **estudiadas, no incorporadas**. Open Data Bizkaia sigue siendo la
fuente principal; nada de lo siguiente entra en el producto sin una
decisión posterior. Evidencia de consulta: `evidence/g16/`.

## 1. Fototeca histórica — geoEuskadi `WMS_FOTOTEKA`

Publicación oficial: noticia geoEuskadi «102 vuelos históricos sobre
diferentes áreas del País Vasco» (vuelos 1945–1991 con enclaves en
Bizkaia).

**Verificado en vivo (capabilities + GetFeatureInfo):**

- El servicio `WMS_FOTOTEKA` responde y expone ~133 vuelos con tres capas
  por vuelo: `*_cobertura` (huella del vuelo), `*_huellas` (polígono por
  fotograma) y `*_puntos` (fotocentro).
- Ejemplo consultado: `v1973_MUSKIZ_*` — cubre Muskiz y zona limítrofe;
  `GetFeatureInfo` sobre `huellas` devuelve atributos reales por
  fotograma: fecha de toma, fotocentro (UTM), identificador de fichero y
  ruta al visor oficial. Formatos publicados: TIFF + TFW y COG.
- El `puntos`/fotocentro permite enlazar al visor propio de geoEuskadi
  (Bisorea) con el fotograma concreto.

**Recurso → aportación → limitación → viabilidad → recomendación:**

| Recurso | Aportación | Limitación | Viabilidad | Recomendación |
|---|---|---|---|---|
| Fotogramas `*_huellas`/visor | Imágenes de 1945–1991 de zonas concretas (p. ej. Muskiz 1973) donde quizá no hay ortofoto BFA | **No son ortofotos**: fotograma aéreo sin ortorrectificar → no puede entrar en la cortina ni alinearse al mapa | Enlace por fotograma al visor oficial: viable y honesto | En una historia concreta, enlazar al visor geoEuskadi como «ver el fotograma original»; nunca como capa swipe |
| Metadatos (fecha, fichero, ruta) | Fecha de toma real — más precisa que el año nominal | Requiere consulta por punto; sin API de fotograma como imagen alineada | Media | Documentar en ficha de campaña cuando enriquezca una historia |

**No hacer:** servir los fotogramas como teselas, presentarlos como
ortofoto, ni derivar métricas históricas de ellos (contrato: evidencia
visual, no medición).

## 2. Inventario de espacios de actividades económicas de Bizkaia

Dataset Open Data Bizkaia + documento de descripción de atributos
(`CD_InventarioActividadesEconomicas_DescripcionAtributos_v1.3.pdf`).

**Estado:** ya consultado en rondas anteriores como referencia; el
producto no lo usa. No se ha re-integrado en esta ronda.

**Valor potencial:** nombrar polígonos industriales/comerciales en
historias (p. ej. «este polígono hoy es…»). **Riesgos semánticos
(respetados):** delimitación actual ≠ histórica; año de empresa ≠ año de
construcción ni de llegada al inmueble; actividad actual ≠ actividad
histórica. **Recomendación:** solo como contexto puntual en una historia
verificada; sin integración masiva ni datos de contacto.

## 3. Archivo Histórico Foral de Bizkaia (bizkaia.eus/web/archivo)

**Estado:** no se ha encontrado en esta ronda una pieza con licencia de
reutilización clara aplicable a las historias existentes. Acceso público
≠ licencia abierta (Base 18). **Recomendación:** si una historia futura
lo necesita, usar referencia/enlace al registro de archivo, no copia de
la pieza, salvo autorización expresa.
