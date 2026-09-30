"""Montaje sin audio ni llamadas a servicios de voz, con capturas verificadas."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/submission/media'
TEMP = ROOT / '.tmp/submission-media'
TEMP.mkdir(parents=True, exist_ok=True)
provenance = json.loads((OUT / 'capture-provenance.json').read_text(encoding='utf-8'))
assert provenance.get('pass'), 'La captura debe terminar correctamente'
timing = json.loads((OUT / 'timing.json').read_text(encoding='utf-8'))


def run(args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *args], cwd=OUT, check=True)


frames = OUT / 'play-frames-build'
recording = json.loads((frames / 'timing.json').read_text(encoding='utf-8'))
lines = []
for i, frame in enumerate(recording):
    lines.append(f"file '{frame['file']}'")
    length = recording[i + 1]['time'] - frame['time'] if i + 1 < len(recording) else 1
    lines.append(f'duration {length:.6f}')
lines.append(f"file '{recording[-1]['file']}'")
(frames / 'frames-current.txt').write_text('\n'.join(lines), encoding='utf-8')
run(['-f', 'concat', '-safe', '0', '-i', 'play-frames-build/frames-current.txt',
     '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '03-play.motion.mp4'])
clips = []
for scene in timing['scenes']:
    stem = scene['id']
    clip = (TEMP / f'{stem}.silent.segment.mp4').as_posix()
    source = ['-i', '03-play.motion.mp4'] if stem == '03-play' else ['-loop', '1', '-i', f'{stem}.png']
    run([*source, '-vf', 'scale=1920:900:force_original_aspect_ratio=decrease,'
         'pad=1920:1080:(ow-iw)/2:0:color=0xf7f8fa,setsar=1,tpad=stop_mode=clone:stop_duration=120',
         '-t', str(scene['duration']), '-r', '30', '-c:v', 'libx264', '-preset', 'fast',
         '-crf', '20', '-pix_fmt', 'yuv420p', '-an', clip])
    clips.append(clip)
(TEMP / 'silent-segments.txt').write_text('\n'.join(f"file '{p}'" for p in clips), encoding='utf-8')
master = str(TEMP / 'silent-master.mp4')
run(['-f', 'concat', '-safe', '0', '-i', str(TEMP/'silent-segments.txt'), '-c', 'copy', master])
run(['-i', master, '-vf',
     "subtitles=demo.es.srt:force_style='FontName=Segoe UI,FontSize=18,PrimaryColour=&H00312618,Outline=0,Shadow=0,MarginV=24'",
     '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-an', '-movflags', '+faststart',
     'demo-silenciosa.mp4'])
target = OUT / 'demo-silenciosa.mp4'
(OUT / 'silent-provenance.json').write_text(json.dumps({
    'build': provenance['build'], 'capture_utc': provenance['utc'],
    'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
    'audio': False, 'duration_seconds': timing['duration'],
    'subtitles': 'Guion y subtítulos originales conservados; capturas actuales',
    'limits': 'Montaje editorial con pausas; no representa latencias reales'
}, ensure_ascii=False, indent=2), encoding='utf-8')
print('Demo silenciosa regenerada con capturas actuales.')
