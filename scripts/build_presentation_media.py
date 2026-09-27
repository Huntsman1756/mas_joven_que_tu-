"""Narrated presentation from inspected, real browser captures (not simulated UI).

Requires edge-tts==7.2.8 and local ffmpeg/ffprobe. No credentials or paid API.
Use --audio-only before captures; rerun without it to assemble.
"""
import argparse
import asyncio
import hashlib
import json
import subprocess
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/submission/media'
CONFIG = json.loads((OUT / 'scenes.json').read_text(encoding='utf-8'))


def run(args):
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-4000:])
    return result.stdout


def duration(path):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                      '-of', 'default=noprint_wrappers=1:nokey=1', str(path)]).strip())


def timestamp(seconds, comma=True):
    ms = round(seconds * 1000)
    return f'{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02}{"," if comma else "."}{ms % 1000:03}'


async def main(audio_only):
    frames = OUT / 'play-frames'
    if not audio_only and (frames / 'timing.json').exists():
        timing = json.loads((frames / 'timing.json').read_text(encoding='utf-8'))
        lines = []
        for i, frame in enumerate(timing):
            lines.append(f"file '{frame['file']}'")
            length = timing[i+1]['time']-frame['time'] if i+1 < len(timing) else 1.0
            lines.append(f'duration {length:.6f}')
        lines.append(f"file '{timing[-1]['file']}'")
        (frames / 'frames.txt').write_text('\n'.join(lines), encoding='utf-8')
        run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(frames/'frames.txt'),
             '-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-r','30','-c:v','libx264','-pix_fmt','yuv420p',str(OUT/'03-play.motion.mp4')])
    offset, cues, clips, manifest = 0.0, [], [], []
    for scene in CONFIG['scenes']:
        stem = OUT / scene['id']
        audio = stem.with_suffix('.mp3')
        boundaries = stem.with_suffix('.boundaries.jsonl')
        if not audio.exists() or not boundaries.exists():
            await edge_tts.Communicate(scene['text'], CONFIG['voice'], rate=CONFIG['rate'],
                                      boundary='WordBoundary').save(str(audio), str(boundaries))
        length = duration(audio) + 0.65
        words = [json.loads(line) for line in boundaries.read_text(encoding='utf-8').splitlines()]
        words = [w for w in words if w['type'] == 'WordBoundary']
        if not words:
            raise ValueError(f'No word timing for {scene["id"]}')
        group = []
        for i, word in enumerate(words):
            group.append(word)
            if len(' '.join(w['text'] for w in group)) >= 65 or i == len(words)-1:
                cues.append((offset + group[0]['offset']/1e7,
                             offset + (word['offset']+word['duration'])/1e7,
                             ' '.join(w['text'] for w in group)))
                group = []
        manifest.append({'id':scene['id'], 'start':offset, 'duration':length,
                         'audio_sha256':hashlib.sha256(audio.read_bytes()).hexdigest()})
        offset += length
        print(f'{scene["id"]}: {length:.2f}s', flush=True)
        if not audio_only:
            clip = stem.with_suffix('.segment.mp4')
            motion = stem.with_suffix('.motion.mp4')
            source = ['-i', str(motion)] if motion.exists() else ['-loop', '1', '-i', str(stem.with_suffix('.png'))]
            run(['ffmpeg', '-v', 'error', '-y', *source, '-i', str(audio),
                 '-vf', 'scale=1920:900:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:0:color=0xf7f8fa,setsar=1,tpad=stop_mode=clone:stop_duration=120',
                 '-af', 'apad,loudnorm=I=-16:TP=-1.5:LRA=7', '-t', str(length),
                 '-r', '30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
                 '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', '-ac', '2',
                 '-movflags', '+faststart', str(clip)])
            clips.append(clip)
    (OUT / 'demo.es.srt').write_text('\n\n'.join(f'{i+1}\n{timestamp(s)} --> {timestamp(e)}\n{t}' for i,(s,e,t) in enumerate(cues))+'\n',encoding='utf-8')
    (OUT / 'demo.es.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{timestamp(s,False)} --> {timestamp(e,False)}\n{t}' for s,e,t in cues)+'\n',encoding='utf-8')
    (OUT / 'transcript.es.md').write_text('# Transcripción — Más joven que tú\n\nVoz sintética: Microsoft Edge, Elvira (es-ES).\n\n'+'\n\n'.join(s['text'] for s in CONFIG['scenes'])+'\n',encoding='utf-8')
    (OUT / 'timing.json').write_text(json.dumps({'duration':offset,'scenes':manifest},ensure_ascii=False,indent=2),encoding='utf-8')
    if audio_only:
        return
    concat = OUT / 'segments.txt'
    concat.write_text('\n'.join(f"file '{p.name}'" for p in clips),encoding='utf-8')
    run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(concat),'-c','copy',str(OUT/'demo-master.mp4')])
    # Caption rendering happens in the reserved footer, leaving the product intact.
    subprocess.run(['ffmpeg','-v','error','-y','-i','demo-master.mp4','-vf',
        "subtitles=demo.es.srt:force_style='FontName=Segoe UI,FontSize=18,PrimaryColour=&H00312618,Outline=0,Shadow=0,MarginV=24'",
        '-c:v','libx264','-preset','fast','-crf','20','-c:a','copy','-movflags','+faststart','demo-es.mp4'],cwd=OUT,check=True)
    run(['ffmpeg','-v','error','-y','-i',str(OUT/'demo-es.mp4'),'-an','-c:v','copy',str(OUT/'demo-silenciosa.mp4')])
    print(f'DONE: {offset:.2f}s',flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--audio-only', action='store_true')
    asyncio.run(main(parser.parse_args().audio_only))
