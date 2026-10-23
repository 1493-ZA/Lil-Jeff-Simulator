import {Peer} from 'peerjs';
// Code-based co-op without a self-hosted relay. The host's browser plays the
// relay's role: it owns the room, assigns player slots and forwards nothing but
// its own snapshots. Players connect peer-to-peer (WebRTC data channels); the
// public PeerJS broker only introduces them using the room code.
// PeerLink mimics the small WebSocket surface CoopSession already uses, so the
// host-authoritative game protocol is unchanged.
export const CODE_ALPHABET='23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const makeRoomCode=(random=Math.random)=>Array.from({length:6},()=>CODE_ALPHABET[Math.floor(random()*CODE_ALPHABET.length)]).join('');
export const normalizeCode=text=>String(text||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
const peerId=code=>`lil-jeff-sim-${code}`;
// ?peer=host:port (or VITE_PEER_SERVER) points at a self-hosted PeerJS broker.
function brokerOptions(){
 const custom=new URLSearchParams(location.search).get('peer')||import.meta.env?.VITE_PEER_SERVER;
 if(!custom)return{debug:0};
 const [host,port]=custom.split(':');return{host,port:Number(port)||443,path:'/',secure:location.protocol==='https:'&&host!=='localhost'&&host!=='127.0.0.1',debug:0};
}
export class PeerLink{
 constructor({host,code}){
  this.readyState=0;this.bufferedAmount=0;this.isHost=host;this.code=code;this.guests=new Map();
  this.peer=host?new Peer(peerId(code),brokerOptions()):new Peer(brokerOptions());
  this.peer.on('error',error=>this.fail(error));
  this.peer.on('open',()=>{
   if(host){this.readyState=1;this.onopen?.();return;}
   const connection=this.peer.connect(peerId(code),{reliable:true});this.host=connection;
   connection.on('open',()=>{this.readyState=1;this.onopen?.();});
   connection.on('data',data=>this.emit(data));
   connection.on('close',()=>this.close());
   connection.on('error',error=>this.fail(error));
  });
  if(host)this.peer.on('connection',connection=>this.accept(connection));
 }
 emit(data){if(typeof data!=='string'||data.length>256000)return;this.onmessage?.({data});}
 fail(error){
  const type=error?.type||'';
  const message=type==='peer-unavailable'?'No game found with that code. Check the code with the host.':type==='unavailable-id'?'That room code is taken. Press HOST GAME again.':type==='browser-incompatible'?'This browser does not support online play.':type==='network'||type==='server-error'||type==='socket-error'?'Could not reach the online matchmaking service. Check your internet connection.':'Connection problem. Try again.';
  this.onmessage?.({data:JSON.stringify({type:'error',message,code:type})});this.close();
 }
 // Host: seat a guest in the first free slot (1 or 2) and keep the roster in sync.
 accept(connection){
  connection.on('open',()=>{
   const slot=[1,2].find(i=>![...this.guests.values()].includes(i));
   if(slot===undefined){connection.send(JSON.stringify({type:'error',message:'Room is full (three players).'}));setTimeout(()=>connection.close(),200);return;}
   this.guests.set(connection,slot);connection.count=0;connection.epoch=Date.now();
   connection.send(JSON.stringify({type:'welcome',room:this.code,slot}));
   if(this.snapshot)connection.send(JSON.stringify({type:'snapshot',state:this.snapshot}));
   this.roster();
  });
  connection.on('data',data=>{
   if(typeof data!=='string'||data.length>128*1024)return;
   if(Date.now()-connection.epoch>1000){connection.epoch=Date.now();connection.count=0;}if(++connection.count>100){connection.close();return;}
   let packet;try{packet=JSON.parse(data);}catch{return;}
   const slot=this.guests.get(connection);if(slot===undefined||packet.type!=='input')return;
   // Sender identity is stamped by the host, never trusted from the packet.
   this.emit(JSON.stringify({type:'input',slot,input:packet.input}));
  });
  connection.on('close',()=>{if(this.guests.delete(connection))this.roster();});
 }
 roster(){const slots=[0,...this.guests.values()].sort();const message=JSON.stringify({type:'members',slots});this.emit(message);for(const c of this.guests.keys())if(c.open)c.send(message);}
 send(text){
  let packet;try{packet=JSON.parse(text);}catch{return;}
  if(this.isHost){
   if(packet.type==='join'){this.emit(JSON.stringify({type:'welcome',room:this.code,slot:0}));this.roster();return;}
   if(packet.type==='snapshot'){this.snapshot=packet.state;for(const c of this.guests.keys())if(c.open&&(c.dataChannel?.bufferedAmount||0)<256000)c.send(text);}
   return;
  }
  if(packet.type==='input'&&this.host?.open)this.host.send(text);
 }
 close(){
  if(this.readyState===3)return;const wasOpen=this.readyState===1;this.readyState=3;
  if(this.isHost)for(const c of this.guests.keys()){try{c.send(JSON.stringify({type:'ended'}));c.close();}catch{}}
  try{this.peer.destroy();}catch{}
  if(wasOpen||this.onclose)this.onclose?.();
 }
}
