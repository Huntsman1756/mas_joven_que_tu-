# Genera hojas de revision humana por historia desde el copy real de es.ts
import io, os, sys

src = io.open('app/src/lib/i18n/es.ts', encoding='utf8').read()


def get(key):
    i = src.find("'%s':" % key)
    if i < 0:
        return '?'
    k = i + len(key) + 3
    while src[k] != "'":
        k += 1
    out = []
    k += 1
    while True:
        c = src[k]
        if c == '\\':
            out.append(src[k:k + 2])
            k += 2
            continue
        if c == "'":
            nxt = src[k + 1:].lstrip()
            if nxt.startswith("'") and not nxt.startswith("',"):
                k = src.find("'", k + 1) + 1
                continue
            break
        out.append(c)
        k += 1
    return ''.join(out)


META = {
    'c2803': ('Margen izquierda', '1969', 'map'),
    'f4036': ('Mungia', '1979', 'map'),
    'f4233': ('Muskiz', '1979', 'time'),
    'f4738': ('Santurtzi', '1999', 'map'),
    'f149': ('Abanto-Zierbena', '2009', 'map'),
}
os.makedirs('evidence/g4/human-review', exist_ok=True)
for s, (lugar, year, mode) in META.items():
    tpl = """# Hoja de revision - `%s` (%s, %s)

> Estado: **PENDING_HUMAN** - Capturas: `story-%s-w390.png`, `story-%s-w1440.png`
> Escena del capitulo: modo `%s`, ano de referencia %s.

## Copy renderizado

**Kicker:** Capitulo n de 5 - %s

**Titulo:** %s

**Que vemos:** %s

**El dato:** %s

**Que sabemos y que no sabemos:** %s

## Checklist

- [ ] Se entiende el caso en <30 s?
- [ ] El dato sostiene el titulo sin sobredecir?
- [ ] Honestidad factual (nada no constatado)?
- [ ] Acciones claras y jerarquia correcta en 390 px?
- [ ] Sin sensacion de sobrecarga?

## Notas del revisor

_(pendiente)_
""" % (
        s, lugar, year, s, s, mode, year,
        get('story.%s.label' % s),
        get('story.%s.title' % s),
        get('story.%s.see' % s),
        get('story.%s.data' % s),
        get('story.%s.know' % s),
    )
    io.open('evidence/g4/human-review/story-%s.md' % s, 'w', encoding='utf8').write(tpl)
    print('story-%s.md' % s)
