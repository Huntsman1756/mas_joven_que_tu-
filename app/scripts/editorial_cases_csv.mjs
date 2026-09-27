/**
 * Genera los casos editoriales descargables enlazados desde
 * «Cómo lo sabemos → Comprueba un resultado»:
 *
 *   app/static/data/editorial-cases.csv  — una fila por capítulo
 *   app/static/data/editorial-cases.md   — diccionario de columnas
 *
 * Uso: node scripts/editorial_cases_csv.mjs   (desde app/)
 *
 * Fuente única: los story briefs congelados evidence/g2/story-briefs/*.json
 * (los mismos artefactos de los que salen los textos de los capítulos).
 * No se calcula nada nuevo: valores C-05/C-08 y conteos tal cual del brief.
 * Si falta un brief o un campo esperado, el script falla — el CSV nunca se
 * escribe a medias.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url)); // app/
const REPO = join(ROOT, '..');
const BRIEFS = join(REPO, 'evidence', 'g2', 'story-briefs');
const OUT = join(ROOT, 'static', 'data');

const ORDER = ['f4036', 'c2803', 'f4233', 'f4738', 'f149']; // STORY_ORDER congelado

const COLS = [
  'story_id',
  'municipio_ancla',
  'municipios_incluidos',
  'universo_zonas_500m',
  'n_edificios_actuales',
  'n_con_ano_conocido',
  'cobertura_pct',
  'periodo_objetivo',
  'anio_referencia',
  'c05_pct_posterior_ref',
  'c08_pct_huella_posterior_ref',
  'campana_pre',
  'campana_post',
  'brief'
];

function cell(v) {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const rows = [];
for (const id of ORDER) {
  const b = JSON.parse(readFileSync(join(BRIEFS, `${id}.json`), 'utf8'));
  const o = b.observed;
  const d = b.derived;
  for (const k of ['n_total', 'n_known', 'coverage'])
    if (o[k] === undefined) throw new Error(`${id}: brief sin observed.${k}`);
  const c05 = d.c05_after_ref_year;
  const c08 = d.c08_after_ref_year;
  rows.push(
    [
      id,
      b.identity.municipality,
      b.identity.municipalities_spanned.join(' / '),
      d.signal_detail?.C?.size ?? 1, // c2803 es un continuo de 21 zonas
      o.n_total,
      o.n_known,
      o.coverage,
      `${b.identity.target_period[0]}–${b.identity.target_period[1]}`,
      c05.ref_year,
      +(c05.value * 100).toFixed(1),
      +(c08.value * 100).toFixed(1),
      b.identity.pre_campaign,
      b.identity.post_campaign,
      `evidence/g2/story-briefs/${id}.md`
    ]
      .map(cell)
      .join(';')
  );
}

const csv = [COLS.join(';'), ...rows].join('\r\n') + '\r\n';
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'editorial-cases.csv'), '\uFEFF' + csv, 'utf8');

const md = `# editorial-cases.csv — diccionario

Los cinco casos editoriales («Cinco lugares de Bizkaia»), generados desde los
briefs congelados \`evidence/g2/story-briefs/*.json\` por
\`app/scripts/editorial_cases_csv.mjs\`. Codificación UTF-8 con BOM;
separador \`;\`.

| Columna | Significado |
|---------|-------------|
| story_id | Identificador interno del capítulo (deep link \`?story=\`) |
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
`;
writeFileSync(join(OUT, 'editorial-cases.md'), md, 'utf8');
console.log('editorial-cases.csv + .md →', OUT, `(${rows.length} casos)`);
