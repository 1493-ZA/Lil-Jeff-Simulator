"""Regenerate the original fictional character voices with Kokoro (Apache-2.0).

Each crew member is an original blend of stock Kokoro voice styles, so no real
performer is sampled, imitated or cloned. Requires: pip install kokoro-onnx
soundfile numpy, the kokoro-v1.0 model + voices files (KOKORO_MODEL /
KOKORO_VOICES env vars), FFmpeg and ffprobe.
Raps are fitted to the game's beat grid; dialogue gets light room tone.
"""
import json, os, re, subprocess, tempfile
from pathlib import Path
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parents[1]
kokoro = Kokoro(os.environ.get('KOKORO_MODEL', 'kokoro-v1.0.int8.onnx'), os.environ.get('KOKORO_VOICES', 'voices-v1.0.bin'))
def blend(*pairs): return sum(w * kokoro.get_voice_style(n) for n, w in pairs)
# Original voice identities: deep and steady / young and bouncy / smooth and cool.
VOICES = {
    # pitch: formant-preserving shift that separates the three identities.
    0: dict(style=blend(('am_onyx', .55), ('am_fenrir', .45)), speed=.94, pitch=.88),   # King Draco
    1: dict(style=blend(('am_puck', .6), ('am_echo', .4)), speed=1.06, pitch=1.14),     # Lil doom
    2: dict(style=blend(('am_michael', .5), ('am_liam', .5)), speed=1.0, pitch=1.0),    # Z78
    3: dict(style=blend(('am_adam', .6), ('am_eric', .4)), speed=1.08, pitch=1.05),     # rival callouts
    4: dict(style=blend(('am_liam', .5), ('af_nicole', .5)), speed=1.0, pitch=1.0),     # clients
}
CROWD = [blend(('am_eric', 1)), blend(('am_adam', .7), ('am_puck', .3)), blend(('af_bella', 1)), blend(('am_santa', .5), ('am_echo', .5)), blend(('af_sarah', 1))]
source = (ROOT / 'src/dialogue.js').read_text()
def js_array(name):
    literal = source.split('export const ' + name + '=')[1].split(';')[0]
    return json.loads(literal.replace("'", '"'))  # Strings use curly apostrophes.
kills, taunts, street, reactions = js_array('KILL_LINES'), js_array('TAUNTS'), js_array('STREET_BARS'), js_array('CYPHER_REACTIONS')
raps = [['Static went quiet, we cleared that lane.', 'Vex lost the block, now we own the stage.', 'Blue lights behind, put the night on tape.'],
        ['Doom in the pocket, let the kick drum burst.', 'Switchback fell, put his name in a verse.', 'New flow, beat drop, watch me switch gears.'],
        ['One hand steering, crew riding with me.', 'Vex in the rear view, blue lights leave.', 'Z brought us home, now the whole crew eats.']]
STREET_BAR = .65 * 2          # Street cypher: one bar per two notes (92 BPM).
STUDIO_LINE = 60 / 148 * 24 / 3  # Studio: three lines per 24-beat turn.
clips = [(f'kill-{i}-{j}', t, i, 'talk', None) for i, lines in enumerate(kills) for j, t in enumerate(lines)]
clips += [(f'taunt-{i}', t, 3, 'shout', None) for i, t in enumerate(taunts)]
clips += [(f'rap-{i}-{j}', t, i, 'rap', STUDIO_LINE) for i, lines in enumerate(raps) for j, t in enumerate(lines)]
clips += [(k, t, i, 'rap', STUDIO_LINE) for k, t, i in [('rap-0-0-clean', 'We cleared that corner, we held that lane.', 0), ('rap-0-1-clean', 'We held that block, now we own the stage.', 0), ('rap-1-1-clean', 'Crew held it down, put the night in a verse.', 1), ('rap-2-1-clean', 'Block in the rear view, blue lights leave.', 2)]]
clips += [(f'street-{i}-{j}', t, i, 'rap', STREET_BAR) for i, lines in enumerate(street) for j, t in enumerate(lines)]
clips += [(f'react-{i}-{j}', t, i, 'shout', None) for i, lines in enumerate(reactions) for j, t in enumerate(lines)]
clips += [(f'handoff-{i}', t, 4, 'talk', None) for i, t in enumerate(['Yeah, that’s me. We good.', 'Right on time, folks.', 'Valid. Catch you round.'])]

def speak(text, voice, speed):
    samples, rate = kokoro.create(text.replace('’', "'"), voice=voice, speed=speed, lang='en-us')
    return samples.astype(np.float32), rate
def trim(samples, rate, threshold=.012):
    loud = np.where(np.abs(samples) > threshold)[0]
    return samples[max(0, loud[0] - int(.02 * rate)):loud[-1] + int(.06 * rate)] if len(loud) else samples
def ffmpeg(src, dst, filters):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-af', ','.join(filters), '-c:a', 'libvorbis', '-q:a', '5', str(dst)], check=True)
def tempo_chain(factor):
    out = []
    while factor > 2: out.append('atempo=2'); factor /= 2
    while factor < .5: out.append('atempo=0.5'); factor /= .5
    return out + [f'atempo={factor:.4f}']

out = ROOT / 'public/audio'; out.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    for key, text, who, style, slot in clips:
        v = VOICES[who]
        # Raps are performed a touch faster with punchier phrasing.
        speed = v['speed'] * (1.12 if style == 'rap' else 1.04 if style == 'shout' else 1)
        samples, rate = speak(text if style != 'shout' else text.replace('.', '!'), v['style'], speed)
        samples = trim(samples, rate)
        wav = tmp / 'line.wav'
        if style == 'rap':
            # Double-tracked lead: a second take with a slightly different blend sits underneath.
            double, _ = speak(text, v['style'] * .92 + VOICES[(who + 1) % 3]['style'] * .08, speed * 1.01)
            double = trim(double, rate)
            n = max(len(samples), len(double) + int(.018 * rate))
            mix = np.zeros(n, np.float32); mix[:len(samples)] += samples; mix[int(.018 * rate):int(.018 * rate) + len(double)] += double * .38
            samples = mix
        sf.write(wav, samples, rate)
        filters = [f"rubberband=pitch={v['pitch']}:formant=preserved"] if v['pitch'] != 1 else []
        if slot:
            duration = len(samples) / rate
            # Fit long lines into their bar; short lines keep natural timing.
            if duration > slot * .96: filters += tempo_chain(duration / (slot * .96))
        filters += ['highpass=f=90', 'equalizer=f=3200:t=q:w=1.2:g=2.5', 'equalizer=f=250:t=q:w=1:g=-2']
        if style == 'rap': filters += ['acompressor=threshold=0.08:ratio=4:attack=4:release=60:makeup=2.5', 'asoftclip=type=tanh', 'aecho=0.8:0.55:42|74:0.18|0.1']
        elif style == 'shout': filters += ['acompressor=threshold=0.1:ratio=3.5:makeup=2', 'aecho=0.8:0.6:30:0.14']
        else: filters += ['acompressor=threshold=0.12:ratio=2.5:makeup=1.6', 'aecho=0.8:0.5:24:0.1']
        filters += ['loudnorm=I=-15:TP=-1.2:LRA=8']
        ffmpeg(wav, out / f'{key}.ogg', filters)
        print(key, text)
    # Crowd reactions: several distinct voices layered with small offsets.
    for key, lines in [('crowd-cheer', ['Ayy!', "Let's go!", 'Yeah!', 'Ohh!', 'Okay!']), ('crowd-aww', ['Ohh!', 'Run it back!', 'Aww!', 'Next time!', 'Come on!'])]:
        layers = []
        for i, line in enumerate(lines):
            s, rate = speak(line, CROWD[i % len(CROWD)], 1.05 + i * .03); layers.append((trim(s, rate), int(i * .11 * rate)))
        n = max(len(s) + off for s, off in layers); mix = np.zeros(n, np.float32)
        for s, off in layers: mix[off:off + len(s)] += s * .55
        sf.write(tmp / 'crowd.wav', mix, rate)
        ffmpeg(tmp / 'crowd.wav', out / f'{key}.ogg', ['highpass=f=140', 'aecho=0.8:0.7:60|110:0.3|0.2', 'acompressor=threshold=0.1:ratio=3:makeup=2', 'loudnorm=I=-17:TP=-1.5'])
        print(key)
(out / 'lines.json').write_text(json.dumps({k: t for k, t, *_ in clips}, indent=2, ensure_ascii=False) + '\n')
