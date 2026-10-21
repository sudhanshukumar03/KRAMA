"""Encode the actual, synthetic KRAMA browser journey captured by capture.spec.ts.

No screenshot animation or invented product UI. Requires FFmpeg with libx264/libvpx.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
AUDIT = ROOT / 'test-results/workflow-film'
DEST = ROOT / 'apps/web/public/landing/film'
DURATIONS = [7, 7, 6]
FPS = 24

def run(args):
    result = subprocess.run([str(arg) for arg in args], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-5000:])
    return result

def encode(ffmpeg, theme, device):
    manifest = json.loads((AUDIT / f'{device}-{theme}.json').read_text())
    size = '1280:720' if device == 'desktop' else '720:960'
    args = [ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-threads', '2']
    filters = []
    for index, (clip, seconds) in enumerate(zip(manifest['clips'], DURATIONS)):
        length = clip['end'] - clip['start']
        args += ['-ss', str(clip['start']), '-t', str(length), '-i', clip['path']]
        filters.append(f'[{index}:v]setpts=(PTS-STARTPTS)*{seconds/length},fps={FPS},scale={size}:flags=lanczos,setsar=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=1,trim=duration={seconds}[v{index}]')
    filters.append('[v0][v1][v2]concat=n=3:v=1:a=0[out]')
    shape = 'landscape' if device == 'desktop' else 'portrait'
    suffix = '-light' if theme == 'light' else ''
    stem = DEST / f'krama-intro-{shape}{suffix}'
    base = args + ['-filter_complex_threads', '1', '-filter_complex', ';'.join(filters), '-map', '[out]', '-an', '-t', '20']
    run(base + ['-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-profile:v', 'baseline', '-level', '3.1', '-movflags', '+faststart', '-threads', '2', str(stem) + '.mp4'])
    # Transcode the same final edit, so the fallback has identical chapter timing.
    run([ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-i', str(stem) + '.mp4', '-an', '-c:v', 'libvpx', '-crf', '10', '-b:v', '1400k', '-threads', '2', str(stem) + '.webm'])
    run([ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-ss', '0.1', '-i', str(stem) + '.mp4', '-frames:v', '1', '-q:v', '2', str(stem) + '-poster.jpg'])
    # Contact sheet is an audit artifact, not a product illustration.
    run([ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-i', str(stem) + '.mp4', '-vf', 'fps=1/3,scale=384:-1,tile=3x3', '-frames:v', '1', str(AUDIT / f'contact-{device}-{theme}.jpg')])
    return { 'theme': theme, 'device': device, 'duration': 20, 'chapters': DURATIONS, 'files': {Path(str(stem) + ext).name: hashlib.sha256(Path(str(stem) + ext).read_bytes()).hexdigest() for ext in ['.mp4', '.webm', '-poster.jpg']} }

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--theme', choices=['light', 'dark', 'both'], default='both')
    parser.add_argument('--ffmpeg', type=Path, default=Path('ffmpeg'))
    args = parser.parse_args()
    DEST.mkdir(parents=True, exist_ok=True)
    results = []
    for theme in ['light', 'dark'] if args.theme == 'both' else [args.theme]:
        for device in ['desktop', 'mobile']:
            results.append(encode(args.ffmpeg, theme, device))
            print(f'Encoded {device} {theme}: 20 seconds of actual product actions.', flush=True)
    (AUDIT / 'encoded-manifest.json').write_text(json.dumps(results, indent=2), encoding='utf8')
