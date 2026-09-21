"""Read-only source comparison. Missing/changed source fails, never silently skips."""
import argparse
import csv
import hashlib
import io
import json
import re
from collections import defaultdict
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]


def verify(raw):
    manifest = (ROOT / 'data/manifests/eustat.callejero.nora.yaml').read_text(encoding='utf-8')
    expected = re.search(r'^sha256: ([a-f0-9]{64})$', manifest, re.M).group(1)
    if hashlib.sha256(raw).hexdigest() != expected:
        raise ValueError('SOURCE_CHANGED: SHA distinto del snapshot; requiere reconciliación, no actualización silenciosa')
    municipalities = json.loads((ROOT / 'app/static/data/municipalities.json').read_text(encoding='utf-8'))['municipalities']
    codes = {f"{m['cod']:03d}" for m in municipalities}
    source = defaultdict(dict)
    excluded = defaultdict(int)
    for row in csv.DictReader(io.StringIO(raw.decode('utf-8-sig')), delimiter=';'):
        code = row['Udalerri-kodea/Código Municipio'].strip()
        if code not in codes:
            excluded[code] += 1
            continue
        sid = row['Kalea-gakoa/Clave_Calle'].strip()
        names = [row[f'Izen hedatua_{lang}/Nombre extendido_{lang}'].strip() for lang in ('es', 'eu')]
        if not sid or any(not name or '\ufffd' in name for name in names):
            raise ValueError(f'INVALID_SOURCE: {code}/{sid}')
        entry = source[code].setdefault(sid, {'names': names, 'n': 0, 'bis': False})
        if entry['names'] != names:
            raise ValueError(f'CONFLICTING_NAMES: {code}/{sid}')
        entry['n'] += 1
        entry['bis'] |= bool(row['Bis/Bis'].strip())
    directory = ROOT / 'app/static/data/streets'
    if {p.stem for p in directory.glob('*.json')} != {m['slug'] for m in municipalities}:
        raise ValueError('FILE_COVERAGE_MISMATCH')
    total = 0
    for mun in municipalities:
        payload = json.loads((directory / (mun['slug'] + '.json')).read_text(encoding='utf-8'))
        rows = payload['streets']
        expected_rows = source[f"{mun['cod']:03d}"]
        if not rows or payload['mun'] != mun['name']:
            raise ValueError(f'EMPTY_OR_WRONG_MUNICIPALITY: {mun["slug"]}')
        actual = {r['i']: r for r in rows}
        if len(actual) != len(rows) or actual.keys() != expected_rows.keys():
            raise ValueError(f'IDS_MISMATCH: {mun["slug"]}')
        for sid, row in actual.items():
            ref = expected_rows[sid]
            if [row['e'], row['u']] != ref['names'] or row['n'] != ref['n'] or row['bis'] != ref['bis']:
                raise ValueError(f'STREET_MISMATCH: {mun["slug"]}/{sid}')
        total += len(rows)
    return {'status': 'PASS', 'municipalities': len(municipalities), 'streets': total,
            'excluded_portal_rows': dict(excluded), 'scope': 'pinned portal CSV, not all roads or live NORA'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--live', action='store_true', help='Read publisher CSV instead of local snapshot; no writes')
    args = parser.parse_args()
    if args.live:
        manifest = (ROOT / 'data/manifests/eustat.callejero.nora.yaml').read_text(encoding='utf-8')
        url = re.search(r'^download_url: (https://\S+)$', manifest, re.M).group(1)
        with urlopen(url, timeout=45) as response:
            raw = response.read(50_000_001)
        if len(raw) > 50_000_000:
            raise ValueError('SOURCE_TOO_LARGE')
    else:
        raw = (ROOT / 'data/raw/callejero/48_Atariak_Portales.csv').read_bytes()
    print(json.dumps(verify(raw), ensure_ascii=False))
