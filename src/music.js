// Original synthesized drill-inspired instrumental: no streamed or sampled songs.
export class DrillMusic {
  constructor() {
    this.volume=.72;this.scene='street';this.muted=false;this.step=0;this.active=false;this.ducked=false;this.nodes=new Set();
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
      const t=this.nextTime,s=this.step%16,bar=Math.floor(this.step/16)%8;
      const drop=bar===7&&s>=12;
      if(this.scene==='chase'&&s%8===0)this.tone(t,bar%2?980:620,.6,.065,'sine',bar%2?620:980);
      // Half-time Chicago pocket, swung hats, syncopated kicks, and melodic 808 glides.
      const kickPatterns=[[0,3,6,11,14],[0,5,7,10,15],[0,2,6,11,13],[0,6,10,14]];
      if(!drop&&kickPatterns[bar%4].includes(s)){
        this.tone(t,165,.14,.9,'sine',43);
        const roots=[36.71,36.71,43.65,32.70,36.71,41.20,43.65,32.70],root=roots[bar];
        this.tone(t,root,s===14?.3:.48,.65,'sine',s===11?root*1.5:root);
        this.tone(t,root*2,.25,.12,'triangle',s===11?root*3:root*2);
      }
      if(!drop&&s===8){this.hiss(t,.13,.5,1100);this.hiss(t+.014,.08,.22,2300);this.tone(t,190,.075,.2,'triangle',95);}
      if(!drop&&(s%2===0||[3,7,11,15].includes(s))){const swing=s%2?.018:0;this.hiss(t+swing,.035,s%4===0?.17:.09,7200);}
      if(!drop&&((s===14&&bar%2===1)||s===7)){for(let i=1;i<=3;i++)this.hiss(t+i*.027,.02,.08-i*.012,8200);}
      if(!drop&&[0,6,10].includes(s)){
        const melody=[[293.66,349.23,440],[293.66,261.63,220],[349.23,440,523.25],[261.63,220,196]][bar%4],note=melody[[0,6,10].indexOf(s)];
        this.tone(t,note,.4,.11,'triangle');this.tone(t+.2,note*.5,.5,.045,'sine');this.tone(t+.3,note,.35,.025,'sine');
      }
      if(s===0&&bar%4===0)this.hiss(t,.22,.13,5500);
      if(drop&&s===15)this.tone(t,100,.08,.13,'sawtooth',400);
      this.step++;this.nextTime+=60/148/4;
    }
  }
}
