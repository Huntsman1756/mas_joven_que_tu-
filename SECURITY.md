# Política de seguridad

## Alcance

Este proyecto es un **sitio estático** sin backend propio (ADR-006): no maneja
cuentas, credenciales ni datos personales, y no ejecuta código del usuario. La
superficie de riesgo relevante es:

- el pipeline de datos (`pipeline/`, `scripts/`), que descarga y procesa
  fuentes públicas oficiales;
- el servidor estático de verificación (`app/scripts/static-server.mjs`), pensado
  para uso **local** (comprobación de HTTP Range para PMTiles);
- las dependencias de `app/` y `pipeline/`.

## Reportar una vulnerabilidad

**No abras un issue público.** Contacta con el mantenedor por los medios privados
del repositorio (GitHub: *Security → Report a vulnerability*, si está habilitado,
o un mensaje directo al propietario).

Incluye: qué encontraste, cómo reproducirlo y el impacto que esperas. Se
responderá con la mejor diligencia posible; ten en cuenta que es un proyecto de
un concurso mantenido por una persona.

## Notas

- No hay secretos en el repositorio por diseño; si encuentras alguno, repórtalo
  por la vía privada indicada.
- Las fuentes de datos son servicios públicos oficiales (Open Data Bizkaia,
  geoEuskadi). El pipeline **exige** verificación TLS; un fallo de certificado
  aborta la descarga. Solo existe un downgrade opt-in (`MJT_ALLOW_INSECURE_TLS=1`,
  limitado a una allowlist de hosts oficiales), que imprime un aviso visible y
  registra `tls_verified: false` en la evidencia (`pipeline/net.py`).
