# editorial-cases.csv — diccionario

Los cinco casos editoriales («Cinco lugares de Bizkaia»), generados desde los
briefs congelados `evidence/g2/story-briefs/*.json` por
`app/scripts/editorial_cases_csv.mjs`. Codificación UTF-8 con BOM;
separador `;`.

| Columna | Significado |
|---------|-------------|
| story_id | Identificador interno del capítulo (deep link `?story=`) |
| municipio_ancla | Municipio que resuelve la escena del capítulo |
| municipios_incluidos | Municipios que cubre el caso (c2803 cruza seis) |
| universo_zonas_500m | Número de zonas de 500 m del conjunto (c2803 = 21; el resto = 1) |
| n_edificios_actuales | Edificios actuales del conjunto (registro catastral) |
| n_con_ano_conocido | Edificios del conjunto con año de construcción conocido — denominador de C-05 |
| cobertura_pct | % del conjunto con año conocido |
| periodo_objetivo | Periodo editorial del caso |
| anio_referencia | Año de corte de los porcentajes C-05/C-08 |
| c05_pct_posterior_ref | % de edificios actuales con año conocido y posterior al año de referencia (contrato C-05, docs/DATA_SEMANTICS.md §11) |
| c08_pct_huella_posterior_ref | % de huella en planta de edificios con año conocido y geometría válida, posterior al año de referencia (contrato C-08) |
| campana_pre / campana_post | Campañas de ortofoto que enmarcan el periodo (año nominal, no fecha de vuelo) |
| brief | Ficha factual del caso (universo, derivados, limitaciones, afirmaciones seguras) |

Límites: un caso editorial describe su universo concreto (una o varias zonas
de 500 m), no un municipio entero. El parque registrado es el que existe hoy;
los edificios desaparecidos no constan. Los numeradores exactos se derivan de
los briefs cuando la cuota lo permite (p. ej. f4036: 85,7 % de 70 = 60).
