# ADR-006 — Sin backend por defecto

- **Estado:** aceptado
- **Fecha:** 2026-09-16

## Contexto

El producto requiere datos de Catastro y ortofotos oficiales. La opción "habitual" sería
un backend con base de datos y API. Pero las fuentes oficiales ya ofrecen servicios con
CORS verificado, y los datos derivados pueden precalcularse.

## Decisión

**No** construir backend de producción. El sitio es estático; los datos derivados se
precalculan en build (PMTiles/JSON) y las ortofotos y el geocoder se consumen de
servicios oficiales directamente desde el navegador.

## Motivos

- Menor superficie de fallo, coste y mantenimiento.
- Sin secretos, sin claves de API, sin datos personales en servidor.
- Despliegue trivial y reproducible (congelable para la entrega G5).
- Las necesidades reales (tiles, búsqueda, ortofotos) están cubiertas sin backend.

## Condición de revisión

Solo se introduciría backend si **se demuestra** que:

1. un servicio oficial no tiene CORS o no puede consumirse desde el navegador;
2. o el volumen de datos derivados no puede servirse como fichero estático;
3. o hay una necesidad funcional que ninguna alternativa estática cubre.

En ese caso se abriría un ADR nuevo con la evidencia.

## Consecuencias

- Estado e historial viven en la URL del cliente.
- La generación de tiles es un paso de build (offline).
- Los fallos de servicios externos se gestionan con degradación elegante.
