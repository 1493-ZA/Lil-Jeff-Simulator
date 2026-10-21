"""Original synthesized percussion, no third-party recordings or samples."""
from pathlib import Path
import numpy as np
import wave
out=Path(__file__).resolve().parents[1]/'public/audio/drums';out.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(817);rate=44100
for name,duration in [('kick',.32),('snare',.22),('clap',.24),('hat',.075),('openhat',.28),('rim',.12)]:
 t=np.arange(int(rate*duration))/rate;noise=rng.normal(0,.3,t.size);high=np.concatenate(([0],np.diff(noise)))
 if name=='kick':
  freq=45+125*np.exp(-t*62);signal=np.tanh(2.4*np.sin(2*np.pi*np.cumsum(freq)/rate))*np.exp(-t*14)+high*np.exp(-t*180)*.5
 elif name=='snare':signal=high*np.exp(-t*24)+.4*np.sin(2*np.pi*185*t)*np.exp(-t*33)
 elif name=='clap':
  envelope=sum(np.where(t>=on,np.exp(-np.maximum(0,t-on)*decay),0)*level for on,decay,level in [(0,150,.5),(.012,150,.6),(.024,28,.7)])
  signal=high*envelope
 elif name in ['hat','openhat']:
  metal=sum(np.sin(2*np.pi*f*t) for f in [6187,7213,9059,11027])/5
  signal=(high*.65+metal*.2)*np.exp(-t*(85 if name=='hat' else 17))
 else:signal=(np.sin(2*np.pi*1850*t)*.5+high*.15)*np.exp(-t*80)
 signal=signal/(np.max(np.abs(signal))+.0001)*.9
 with wave.open(str(out/(name+'.wav')),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes((signal*32767).astype('<i2').tobytes())
