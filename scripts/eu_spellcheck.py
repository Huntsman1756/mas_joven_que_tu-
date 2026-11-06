"""Control ortográfico del copy en euskera (app/src/lib/i18n/eu.ts) con Xuxen.

Xuxen (Elhuyar + IXA/UPV-EHU) es el corrector de referencia del euskera. No se
redistribuye: se descarga de xuxen.eus a .tmp/ y se verifica su SHA-256. Su
licencia figura como LGPL-3.0 en el ZIP y como GPL en otras fichas (docs/EU_QA.md).

Uso (desde la raíz):
    pip install spylls==0.1.7
    python -I scripts/eu_spellcheck.py            # sale 1 si hay palabras nuevas sin reconocer

Certifica que cada palabra existe en el diccionario o en la lista blanca
(scripts/eu_spellcheck_allow.txt, con motivo). No certifica gramática, registro
ni naturalidad: eso exige revisión nativa.
"""
import hashlib
import io
import json
import re
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EU_TS = ROOT / 'app/src/lib/i18n/eu.ts'
ALLOW = ROOT / 'scripts/eu_spellcheck_allow.txt'
CACHE = ROOT / '.tmp/xuxen-5.4.10'
XUXEN_URL = 'https://www.xuxen.eus/static/hunspell/xuxen_5.4.10_hunspell.zip'
XUXEN_SHA256 = '5a82e3e37b2a48fb0b1ddfeb995524d89838b5fbe2729ac833235fa10968b415'

BS = chr(92)
STR = "'((?:[^'" + BS + BS + BS + "n]|" + BS + BS + ".)*)'"
PAIR = re.compile(BS + 's*' + STR + BS + 's*:' + BS + 's*((?:' + STR + BS + 's*' + BS + '+?' + BS + 's*)+)' + BS + 's*,?', re.S)
PLACEHOLDER = re.compile(BS + '{[a-zA-Z_]+' + BS + '}')
WORD = re.compile("[^" + BS + "W" + BS + "d_]+(?:['’" + BS + "-][^" + BS + "W" + BS + "d_]+)*")
URLISH = re.compile(BS + 'S+' + BS + '.(?:eus|es|org|com|net|html?|json|csv|pmtiles|py)' + BS + 'S*')


def dictionary():
    aff = CACHE / 'eu_ES.aff'
    if not aff.exists():
        data = urllib.request.urlopen(XUXEN_URL, timeout=60).read()
        got = hashlib.sha256(data).hexdigest()
        if got != XUXEN_SHA256:
            raise SystemExit(f'Xuxen: SHA-256 inesperado {got}')
        CACHE.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            for name in z.namelist():
                base = Path(name).name
                if base in ('eu_ES.aff', 'eu_ES.dic', 'LICENSE.txt'):
                    (CACHE / base).write_bytes(z.read(name))
    from spylls.hunspell import Dictionary
    return Dictionary.from_files(str(CACHE / 'eu_ES'))


def strings():
    src = EU_TS.read_text(encoding='utf-8')
    body = src[src.index('export const eu'):]
    body = body[body.index('{') + 1:]
    body = re.sub('/' + BS + '*.*?' + BS + '*/', '', body, flags=re.S)
    body = re.sub('(?m)^' + BS + 's*//.*$', '', body)
    out = {}
    for m in PAIR.finditer(body):
        vals = re.findall(STR, m.group(2))
        out[m.group(1)] = ''.join(v.replace(BS + "'", "'") for v in vals)
    return out


def main():
    allow = {line.split('#')[0].strip() for line in ALLOW.read_text(encoding='utf-8').splitlines()}
    allow.discard('')
    dic = dictionary()
    known = lambda w: dic.lookup(w) or dic.lookup(w.lower())
    texts = strings()
    tokens, unknown = 0, {}
    for key, text in texts.items():
        clean = URLISH.sub(' ', PLACEHOLDER.sub(' ', text))
        for m in WORD.finditer(clean):
            tok = m.group(0).replace('’', "'")
            tokens += 1
            if known(tok) or tok in allow:
                continue
            parts = [p for p in re.split("['" + BS + "-]", tok) if p]
            if len(parts) > 1 and all(known(p) or p in allow for p in parts):
                continue
            unknown.setdefault(tok, []).append(key)
    print(json.dumps({'keys': len(texts), 'tokens': tokens, 'unknown': unknown}, ensure_ascii=False, indent=1))
    sys.exit(1 if unknown else 0)


if __name__ == '__main__':
    main()
