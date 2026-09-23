# Fixtures PMTiles para CI

Los `.pmtiles` de `app/static/data/` son artefactos del pipeline y **no se
versionan** (ver `.gitignore` y `evidence/g0/04-tiles/RETENTION.md`). En el
runner de CI el build sale sin ellos y las capas vectoriales (`cells-fill`,
edificios) no pueden renderizar: la suite e2e necesita datos reales.

Estos fixtures son **bytes del pipeline real**, copiados sin modificar el
2026-09-23 desde `app/static/data/`:

| archivo | sha256 |
| --- | --- |
| `data/cells.pmtiles` | `ca11def7881728d53a1ed35612213ba3efd1c4a89401f39861975273da4fdf64` |
| `data/municipalities.pmtiles` | `595df4c66998532a774e902a556ac1ebf626c575088cdc5da8ab7eb366409565` |
| `data/buildings/020.pmtiles` (Bilbao) | `ff3eabbe55848f6177223150bacf319ee4e32b2b3c619b950366f9e5817ade0b` |
| `data/buildings/044.pmtiles` (Getxo) | `ee15d66566f6bcac6fee72ccad7f5c401797114745fb97c7635bfef102b20716` |
| `data/buildings/054.pmtiles` (Leioa) | `4c87b0269902d03c75a73fa4ac9c00a93adb8cfa82e2fb37f2404ab757938d7b` |

Los tres municipios son los únicos que ejercita la suite estable
(`place=bilbao|getxo|leioa`).

## Cómo se sirven

`scripts/fixtures.mjs` → `installPmtilesFixtures(page)` intercepta
`/data/**.pmtiles`:

- si el archivo existe en `app/build/data/` → `route.fallback()` al servidor
  real (localmente se ejercita el artefacto fresco; una regresión de pipeline
  no queda enmascarada);
- si no existe → sirve este fixture con soporte HTTP `Range` (206), igual que
  producción;
- si no hay fixture → 404 (mismo estado que «dato no disponible»).

## Regeneración

Tras regenerar los tiles (`scripts/g1_build_tiles.sh`), copiar de nuevo los
archivos y actualizar la tabla de sha256:

```powershell
cd app
cp static/data/cells.pmtiles static/data/municipalities.pmtiles scripts/fixtures/data/
cp static/data/buildings/020.pmtiles static/data/buildings/044.pmtiles `
   static/data/buildings/054.pmtiles scripts/fixtures/data/buildings/
```

Si la suite pasa a ejercitar otros municipios, añadir su `buildings/<cod>.pmtiles`
(el `cod` figura en `static/data/municipalities.json`).
