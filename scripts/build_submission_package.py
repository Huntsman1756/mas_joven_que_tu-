"""Export the canonical editorial documents, with provenance, without publishing.

Requires reportlab==5.0.1 and pymupdf==1.28.2. PDFs and ZIP are generated outputs.
The optional synthetic narration is deliberately excluded from the submission ZIP.
"""
import argparse
import hashlib
import json
import re
import subprocess
import zipfile
from datetime import datetime, timezone
from html import escape
from pathlib import Path

import pymupdf as fitz
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--out', type=Path, default=ROOT / 'output/pdf')
parser.add_argument('--qa', type=Path, default=ROOT / 'evidence/competition-20260930/pdf')
parser.add_argument('--release-record', type=Path, help='JSON del publicador con pushed=true')
args = parser.parse_args()
DOCS = ROOT / 'docs/submission'
OUT = args.out.resolve()
QA = args.qa.resolve()
OUT.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
stamp = re.search(r'name="mjt:build" content="([^"]+)"',
                  (ROOT/'app/build/index.html').read_text(encoding='utf-8')).group(1)
release = json.loads(args.release_record.read_text(encoding='utf-8-sig')) if args.release_record else None
if release and (not release.get('pushed') or release.get('error') or release.get('source_sha') != stamp):
    raise ValueError('El registro de publicación no acredita el sello exacto de este build')
capture = json.loads((DOCS/'media/capture-provenance.json').read_text(encoding='utf-8'))
silent = json.loads((DOCS/'media/silent-provenance.json').read_text(encoding='utf-8'))
if not capture.get('pass') or capture.get('build') != stamp or silent.get('build') != stamp:
    raise ValueError('Capturas, demo y build deben compartir procedencia')
if silent.get('sha256') != hashlib.sha256((DOCS/'media/demo-silenciosa.mp4').read_bytes()).hexdigest():
    raise ValueError('La demo ha cambiado desde su registro de procedencia')
pdfmetrics.registerFont(TTFont('Body', 'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('BodyBold', 'C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFont(TTFont('Title', 'C:/Windows/Fonts/georgia.ttf'))
pdfmetrics.registerFontFamily('Body', normal='Body', bold='BodyBold', italic='Body', boldItalic='BodyBold')
INK = colors.HexColor('#182631')
ACCENT = colors.HexColor('#8c2d21')
STYLES = {
    'p': ParagraphStyle('p', fontName='Body', fontSize=9, leading=13, spaceAfter=6, textColor=INK),
    'h1': ParagraphStyle('h1', fontName='Title', fontSize=25, leading=29, spaceAfter=16, textColor=INK),
    'h2': ParagraphStyle('h2', fontName='BodyBold', fontSize=12, leading=16, spaceBefore=12, spaceAfter=6, textColor=ACCENT, keepWithNext=True),
    'h3': ParagraphStyle('h3', fontName='BodyBold', fontSize=10, leading=14, spaceBefore=8, spaceAfter=4, textColor=INK, keepWithNext=True),
    'cell': ParagraphStyle('cell', fontName='Body', fontSize=7.3, leading=10, textColor=INK, alignment=TA_LEFT),
}

def inline(s):
    s = s.replace('—', '-').replace('–', '-').replace('\u2011', '-')
    s = escape(s)
    s = re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)', r'<link href="\2" color="#8c2d21"><u>\1</u></link>', s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'`([^`]+)`', r'\1', s)
    return s

def parse_markdown(path):
    lines = path.read_text(encoding='utf-8').splitlines()
    flow, paragraph, rows = [], [], []
    code = False
    def flush():
        if paragraph:
            flow.append(Paragraph(inline(' '.join(paragraph)), STYLES['p']))
            paragraph.clear()
    def table():
        if not rows:
            return
        count = len(rows[0])
        data = [[Paragraph(inline(c), STYLES['cell']) for c in row[:count]] for row in rows]
        t = Table(data, colWidths=[(A4[0]-84)/count]*count, repeatRows=1, hAlign='LEFT')
        t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#eef1f4')),
          ('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,0),0.5,ACCENT),
          ('BOTTOMPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),7)]))
        flow.extend([t,Spacer(1,8)])
        rows.clear()
    for raw in lines:
        s = raw.strip()
        if s.startswith('>'):
            s = s.removeprefix('>').strip()
        if s.startswith('|'):
            flush()
            if re.fullmatch(r'[| :\-]+', s):
                continue
            rows.append(re.split(r'(?<!\\)\|',s.strip('|')))
            continue
        table()
        if s.startswith('```'):
            flush(); code = not code; continue
        if not s:
            flush(); continue
        if s.startswith('#'):
            flush()
            level = min(len(s)-len(s.lstrip('#')), 3)
            flow.append(Paragraph(inline(s.lstrip('# ')), STYLES[f'h{level}']))
        elif code:
            flush()
            flow.append(Paragraph(inline(s), STYLES['p']))
        elif s.startswith('- ') or re.match(r'^\d+\. ',s):
            flush()
            paragraph.append(s)
        else:
            paragraph.append(s)
    flush(); table()
    return flow

def footer(canvas, doc):
    canvas.setFont('Body',8)
    canvas.setFillColor(INK)
    canvas.drawString(42,25,'Más joven que tú | Revisión editorial 30-09-2026')
    canvas.drawRightString(A4[0]-42,25,str(doc.page))

def export(source, name):
    target = OUT/name
    SimpleDocTemplate(str(target),pagesize=A4,rightMargin=42,leftMargin=42,
      topMargin=36,bottomMargin=42,title=source.stem,author='Proyecto Más joven que tú').build(
      parse_markdown(source),onFirstPage=footer,onLaterPages=footer)
    with fitz.open(target) as pdf:
        for i,page in enumerate(pdf):
            page.get_pixmap(matrix=fitz.Matrix(1.1,1.1)).save(QA/f'{target.stem}-{i+1}.png')
        print(f'{name}: {len(pdf)} pages')
    return target

pdfs = [export(DOCS/'TECHNICAL-MEMORY.md','memoria-tecnica.pdf'),
        export(DOCS/'EVALUATION-PACKAGE.md','resumen-evaluacion.pdf')]
files = [(p,p.name) for p in pdfs]
for name in ['TECHNICAL-MEMORY.md','EVALUATION-PACKAGE.md','SOURCES-LICENSES.md','FINAL-CHECKLIST.md']:
    files.append((DOCS/name,name))
for name in ['02-result.png','05-story.png','04-swipe.png','07-mobile-story.png','demo-silenciosa.mp4',
             'demo.es.srt','demo.es.vtt','transcript.es.md','capture-provenance.json','silent-provenance.json']:
    files.append((DOCS/'media'/name,'media/'+name))
for name in ['editorial-cases.csv','editorial-cases.md']:
    files.append((ROOT/'app/static/data'/name,'data/'+name))
for p in sorted((ROOT/'data/manifests').glob('*.yaml')):
    files.append((p,'data/manifests/'+p.name))
for p,_ in files:
    if not p.is_file():
        raise FileNotFoundError(p)
manifest = {
    'created_utc':datetime.now(timezone.utc).isoformat(), 'local_build_stamp':stamp,
    'published_source_verified': release['source_sha'] if release else None,
    'published_pages_verified': release['commit'] if release else None,
    'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
    'not_submitted':True, 'native_eu_review':'PENDING',
    'files':[{'path':name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p,name in files]
}
data=json.dumps(manifest,ensure_ascii=False,indent=2).encode('utf-8')
(OUT/'MANIFEST.json').write_bytes(data)
with zipfile.ZipFile(OUT/'paquete-entrega.zip','w',compression=zipfile.ZIP_DEFLATED) as z:
    for p,name in files:
        z.write(p,name)
    z.writestr('MANIFEST.json',data)
with zipfile.ZipFile(OUT/'paquete-entrega.zip','r') as z:
    assert z.testzip() is None
print('Package verified:',len(files),'files; narration excluded, no submission performed.')
