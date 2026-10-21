// Original synthesized drill-inspired instrumental: no streamed or sampled songs.
export class DrillMusic {
  constructor() {
    this.samples=new Map();this.volume=.72;this.scene='street';this.muted=false;this.step=0;this.active=false;this.ducked=false;this.nodes=new Set();
    try { const saved=JSON.parse(localStorage.getItem('lil-jeff-music-v2'));if(Number.isFinite(saved?.volume))this.volume=Math.max(0,Math.min(1,saved.volume));this.muted=saved?.muted===true; } catch { /* Defaults work without storage. */ }
  }
  setScene(name){
    if(this.scene===name)return;this.scene=name;this.step=0;
    if(this.context){for(const node of this.nodes){try{node.stop();}catch{}}this.nodes.clear();this.nextTime=this.context.currentTime+.04;}
  }
  save() { try{localStorage.setItem('lil-jeff-music-v2',JSON.stringify({volume:this.volume,muted:this.muted}));}catch{/* Settings remain usable in memory. */} }
  setVolume(value) { this.volume=Math.max(0,Math.min(1,value));this.save();this.applyGain(); }
  toggle() { this.muted=!this.muted;this.save();this.applyGain(); }
  setDucked(value) { if(this.ducked!==value){this.ducked=value;this.applyGain();} }
  applyGain() {
    if(!this.context || !this.bus)return;
    const gain=this.active&&!this.muted&&!this.ducked?this.volume*1.25:0;
    this.bus.gain.cancelScheduledValues(this.context.currentTime);
    this.bus.gain.setTargetAtTime(gain,this.context.currentTime,.035);
  }
  start(context) {
    if(this.active)return;
    this.context=context;
    if(!this.bus){
      this.bus=context.createGain();this.bus.gain.value=0;this.compressor=context.createDynamicsCompressor();this.compressor.threshold.value=-12;this.compressor.ratio.value=4;this.compressor.attack.value=.003;this.compressor.release.value=.18;this.bus.connect(this.compressor).connect(context.destination);
      this.noise=context.createBuffer(1,context.sampleRate*.3,context.sampleRate);
      const samples=this.noise.getChannelData(0);let seed=615;
      for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=seed/2147483648-1;}
    }
    if(!this.samplesLoading)this.samplesLoading=Promise.all(['kick','snare','clap','hat','openhat','rim'].map(async name=>{try{const response=await fetch((import.meta.env?.BASE_URL||'/')+'audio/drums/'+name+'.wav');if(response.ok)this.samples.set(name,await context.decodeAudioData(await response.arrayBuffer()));}catch{/* Procedural fallback remains available. */}}));
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
  drum(name,time,level){
    const buffer=this.samples.get(name);if(!buffer){this.hiss(time,name==='hat'?.03:.1,level*.2,name==='hat'?7000:1600);return;}
    const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;gain.gain.value=level;source.connect(gain).connect(this.bus);this.track(source);source.start(time);
  }
  piano(time,note){
    this.tone(time,note,.95,.12,'sine');this.tone(time,note*2.004,.28,.055,'sine');this.tone(time,note*3.995,.12,.018,'sine');
    this.tone(time+.27,note,.6,.025,'sine');
  }
  bass(time,root,end,duration){
    const osc=this.context.createOscillator(),gain=this.context.createGain(),drive=this.context.createWaveShaper();
    const curve=new Float32Array(1024);for(let i=0;i<curve.length;i++)curve[i]=Math.tanh((i/511.5-1)*3);
    drive.curve=curve;osc.frequency.setValueAtTime(root,time);osc.frequency.exponentialRampToValueAtTime(end,time+duration*.7);
    gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(.43,time+.009);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(drive).connect(gain).connect(this.bus);this.track(osc);osc.start(time);osc.stop(time+duration+.01);
  }
  schedule() {
    if(!this.active || this.context.state!=='running')return;
    if(this.nextTime<this.context.currentTime)this.nextTime=this.context.currentTime+.02;
    while(this.nextTime<this.context.currentTime+.13) {
      const t=this.nextTime,s=this.step%16,bar=Math.floor(this.step/16)%8;
      const drop=bar===7&&s>=12;
      if(this.scene==='chase'&&s%8===0)this.tone(t,bar%2?980:620,.6,.065,'sine',bar%2?620:980);
      // Half-time Chicago pocket, swung hats, syncopated kicks, and melodic 808 glides.
      const kickPatterns=[[0,6,10,11,14],[0,3,7,10,15],[0,2,6,12,14],[0,6,9,14]];
      if(!drop&&kickPatterns[bar%4].includes(s)){
        this.drum('kick',t,.92);
        const roots=[36.71,36.71,43.65,32.70,36.71,41.20,43.65,32.70],root=roots[bar];
        this.bass(t,root,s===11&&bar%2?root*1.5:root,s===14?.24:.38);
      }
      if(!drop&&s===8){this.drum('snare',t,.64);this.drum('clap',t+.009,.46);}if(!drop&&s===15&&bar%2)this.drum('rim',t,.17);
      if(!drop&&(s%2===0||[3,7,11,15].includes(s))){const swing=s%2?.018:0;this.drum('hat',t+swing,s%4===0?.24:.13);}
      if(!drop&&((s===14&&bar%2===1)||s===7)){for(let i=1;i<=3;i++)this.drum('hat',t+i*.034,.13-i*.022);}
      if(!drop&&[0,6,10].includes(s)){
        const melody=[[293.66,349.23,440],[293.66,261.63,220],[349.23,440,523.25],[261.63,220,196]][bar%4],note=melody[[0,6,10].indexOf(s)];
        this.piano(t,note*.5);
      }
      if(!drop&&s===6)this.drum('openhat',t,.13);
      if(drop&&s===15)this.tone(t,100,.08,.13,'sawtooth',400);
      this.step++;this.nextTime+=60/148/4;
    }
  }
}
