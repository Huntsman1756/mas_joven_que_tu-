# Paquete de evaluación — «Más joven que tú»

## Actualización: paquete visual producido

La propuesta de capturas inferior queda sustituida, para revisión editorial local,
por [media/index.html](media/index.html): portada, resultado, comparación, capítulo,
trazabilidad y móvil actualizados. Incluye demo narrada y silenciosa de 76 segundos.
No sustituye el requisito de recapturar/validar sobre el release congelado.
Procedencia, derechos y límites: [media/README.md](media/README.md).


> Documento compacto para quien evalúa (Base 10). **Candidato FASE B.3 +
> etapa editorial** (2026-09-28). Los campos con `⧗` se completan en el
> congelado definitivo (`docs/remediation/red-team-2026/RELEASE.md`).

## Qué es

Una pieza web estática de periodismo de datos: la persona indica su año de
nacimiento y su municipio de Bizkaia, y la pieza responde **qué parte de los
edificios que hoy existen allí se terminó después de ese año**, con
ortofotos oficiales de cada época como evidencia visual.

## El hallazgo

En una zona de 500 m de Mungia hay 70 edificios actuales con año conocido:
el 85,7 % se terminó después de 1979, pero solo ocupan el 1,9 % de la
huella en planta del conjunto — contar edificios y medir territorio
responden a preguntas distintas. Es el capítulo `f4036`, accesible sin
formulario desde la portada («O ver un ejemplo»).

## Tres enlaces directos (candidato local / URL pública `⧗`)

| Enlace | Ruta |
|--------|------|
| Ejemplo sin formulario (capítulo Mungia) | `/?story=f4036` |
| Hallazgo (panel de resultado) | `/?year=1979&place=mungia` |
| Método y trazabilidad | `/como-lo-sabemos` |

## Cuatro capturas (de `evidence/`; retomar sobre el build congelado ⧗)

| Función | Propuesta actual | Nota |
|---------|------------------|------|
| Resultado | `red-team-2026/golden-getxo-1952-es.png` | golden del candidato |
| Contraste (hallazgo) | `red-team-2026/golden-mungia-1979-es.png` | el panel con «Un hallazgo» |
| Antes/después | `g4/browser/g4-b-photo.png` | modo Fotos aéreas con dúo |
| Móvil | `red-team-2026/golden-eu-320-karrantza.png` | layout EU a 320 px |

⧗ La portada cambió en la etapa editorial (nuevo subtítulo y «Ver un
ejemplo»): las capturas del hero deben regenerarse sobre el build final.

## Identidad del candidato

- Fecha del conjunto de datos (snapshot): **2026** (año de corte del
  catálogo en `app/static/data/catalog.json`).
- SHA publicado / build stamp: `⧗` — se escribe como `<meta
  name="mjt:build">` al hacer `npm run build` tras el commit congelado.
- URL pública: `⧗ https://huntsman1756.github.io/mas_joven_que_tu-/`
  (no publicar sin autorización — procedimiento en `RELEASE.md`).

## Documentación técnica (Base 6)

- `TECHNICAL-MEMORY.md` — procedencia/acceso, proceso, herramientas,
  reproducibilidad, incertidumbre declarada.
- `SOURCES-LICENSES.md` — licencias de datos (CC BY 4.0) y del código (MIT).
- `docs/submission/DEMO-SCRIPT.md` — guion de la demo de 60–90 s
  (grabación pendiente del candidato congelado).
- Casos editoriales descargables: `data/editorial-cases.csv` +
  `editorial-cases.md` (generados desde `evidence/g2/story-briefs/`).
