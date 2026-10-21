"""Regenerate original placeholder voice clips using system Flite + FFmpeg.
No performer recordings, samples, or voice cloning are used.
"""
import ctypes as c, json, subprocess, tempfile
from pathlib import Path
lib=c.CDLL('libflite.so.1',mode=c.RTLD_GLOBAL);lib.flite_init()
lib.flite_text_to_wave.argtypes=[c.c_char_p,c.c_void_p];lib.flite_text_to_wave.restype=c.c_void_p
lib.cst_wave_save_riff.argtypes=[c.c_void_p,c.c_char_p]
lib.delete_wave.argtypes=[c.c_void_p]
voices=[]
for name in ['rms','kal16','awb']:
    library=c.CDLL(f'libflite_cmu_us_{name}.so.1',mode=c.RTLD_GLOBAL)
    register=getattr(library,f'register_cmu_us_{name}');register.argtypes=[c.c_char_p];register.restype=c.c_void_p
    voices.append(register(None))
kills=[['Stay down. Crew, keep moving.','That lane is clear. Who is next?','Do not fold. Watch the corner.'],['That is another bar for the booth.','He talked loud. Now the beat talks.','Crew stays up. Keep it pushing.'],['Lane is clear. I got the wheel.','He is not catching this ride.','Eyes up. We still moving.']]
taunts=['Your whole crew is washed!','Draco, that aim is trash!','Doom, nobody wants that weak verse!','Z78, you drive like you scared!','This is not your block! Get lost!']
raps=[['Static went quiet, we cleared that lane.','Vex lost the block, now we own the stage.','Blue lights behind, put the night on tape.'],['Doom in the pocket, let the kick drum burst.','Switchback fell, put his name in a verse.','New flow, beat drop, watch me switch gears.'],['One hand steering, crew riding with me.','Vex in the rear view, blue lights leave.','Z brought us home, now the whole crew eats.']]
clips=[(f'kill-{i}-{j}',text,i,False) for i,lines in enumerate(kills) for j,text in enumerate(lines)]
clips += [(f'taunt-{i}',text,1,False) for i,text in enumerate(taunts)]
clips += [(f'rap-{i}-{j}',text,i,True) for i,lines in enumerate(raps) for j,text in enumerate(lines)]
clips += [('rap-0-0-clean','We cleared that corner, we held that lane.',0,True),('rap-0-1-clean','We held that block, now we own the stage.',0,True),('rap-1-1-clean','Crew held it down, put the night in a verse.',1,True),('rap-2-1-clean','Block in the rear view, blue lights leave.',2,True)]
out=Path(__file__).resolve().parents[1]/'public/audio';out.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
    for key,text,index,rap in clips:
        wave=lib.flite_text_to_wave(text.encode(),voices[index]);wav=Path(tmp)/'line.wav'
        lib.cst_wave_save_riff(wave,str(wav).encode());lib.delete_wave(wave)
        duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(wav)]))
        tempo=max(.7,duration/(1.7 if rap else 2.3))
        filters=[]
        while tempo>2:filters.append('atempo=2');tempo/=2
        filters.extend([f'atempo={tempo}', 'highpass=f=100','equalizer=f=1800:t=q:w=1:g=3','acompressor=threshold=0.15:ratio=3:makeup=2','loudnorm=I=-15:TP=-1:LRA=7'])
        subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-af',','.join(filters),'-c:a','libvorbis','-q:a','4',str(out/(key+'.ogg'))],check=True)
        print(key,text)
(out/'lines.json').write_text(json.dumps({key:text for key,text,_,_ in clips},indent=2)+'\n')
