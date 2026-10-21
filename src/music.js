// Original synthesized drill-inspired instrumental: no streamed or sampled songs.
export class DrillMusic {
  constructor() {
    this.volume=.2;this.muted=false;this.step=0;this.active=false;this.ducked=false;this.nodes=new Set();
    try { const saved=JSON.parse(localStorage.getItem('lil-jeff-music-v1'));if(Number.isFinite(saved?.volume))this.volume=Math.max(0,Math.min(1,saved.volume));this.muted=saved?.muted===true; } catch { /* Defaults work without storage. */ }
  }
  save() { try{localStorage.setItem('lil-jeff-music-v1',JSON.stringify({volume:this.volume,muted:this.muted}));}catch{/* Settings remain usable in memory. */} }
  setVolume(value) { this.volume=Math.max(0,Math.min(1,value));this.save();this.applyGain(); }
  toggle() { this.muted=!this.muted;this.save();this.applyGain(); }
  setDucked(value) { if(this.ducked!==value){this.ducked=value;this.applyGain();} }
  applyGain() {
    if(!this.context || !this.bus)return;
    const gain=this.active&&!this.muted&&!this.ducked?this.volume*.55:0;
    this.bus.gain.cancelScheduledValues(this.context.currentTime);
    this.bus.gain.setTargetAtTime(gain,this.context.currentTime,.035);
  }
  start(context) {
    if(this.active)return;
    this.context=context;
    if(!this.bus){
      this.bus=context.createGain();this.bus.gain.value=0;this.bus.connect(context.destination);
      this.noise=context.createBuffer(1,context.sampleRate*.3,context.sampleRate);
      const samples=this.noise.getChannelData(0);let seed=615;
      for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=seed/2147483648-1;}
    }
    this.active=true;this.nextTime=context.currentTime+.04;this.applyGain();
    this.timer=setInterval(()=>this.schedule(),25);this.schedule();
  }
  stop() {
    this.active=false;clearInterval(this.timer);this.applyGain();
    for(const node of this.nodes){try{node.stop();}catch{/* Already ended. */}}
    this.nodes.clear();
  }
  track(node) { this.nodes.add(node);node.onended=()=>this.nodes.delete(node); }
  tone(time,freq,duration,level,type='sine',end=freq) {
    const c=this.context,osc=c.createOscillator(),gain=c.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,time);osc.frequency.exponentialRampToValueAtTime(end,time+duration*.8);
    gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(level,time+.009);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(gain).connect(this.bus);this.track(osc);osc.start(time);osc.stop(time+duration+.01);
  }
  hiss(time,duration,level,frequency) {
    const c=this.context,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
    source.buffer=this.noise;filter.type='highpass';filter.frequency.value=frequency;
    gain.gain.setValueAtTime(level,time);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    source.connect(filter).connect(gain).connect(this.bus);this.track(source);source.start(time);source.stop(time+duration);
  }
  schedule() {
    if(!this.active || this.context.state!=='running')return;
    if(this.nextTime<this.context.currentTime)this.nextTime=this.context.currentTime+.02;
    while(this.nextTime<this.context.currentTime+.13) {
      const t=this.nextTime,s=this.step%16,bar=Math.floor(this.step/16)%4;
      if([0,6,10,14].includes(s)) {
        this.tone(t,125,.12,.7,'sine',40);
        this.tone(t,s===10?58:43.65,.42,.4,'sine',s===10?43.65:38.89);
      }
      if(s===8){this.hiss(t,.12,.3,1300);this.tone(t,180,.08,.16,'triangle',90);}
      if(s%2===0 || s===15)this.hiss(t,.035,s%4===0?.13:.08,6500);
      if(s===15 && bar%2===1){this.hiss(t+.035,.025,.06,7500);this.hiss(t+.07,.025,.05,7500);}
      if([0,5,10].includes(s)) {
        const melody=[[293.66,220,349.23],[261.63,220,329.63],[293.66,349.23,440],[261.63,207.65,293.66]][bar];
        const note=melody[[0,5,10].indexOf(s)];
        this.tone(t,note,.28,.12,'triangle');this.tone(t+.21,note,.25,.035,'sine');
      }
      this.step++;this.nextTime+=60/140/4;
    }
  }
}
