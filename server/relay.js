import http from 'node:http';
import {WebSocketServer,WebSocket} from 'ws';
import {randomBytes} from 'node:crypto';
export function createRelay({port=Number(process.env.PORT)||8787,host='0.0.0.0',latency=Number(process.env.TEST_LATENCY_MS)||0}={}){
 const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/plain'});res.end('Lil Jeff Simulator co-op relay\n');});
 const wss=new WebSocketServer({server,maxPayload:128*1024}),rooms=new Map();
 const send=(ws,data)=>{const body=JSON.stringify(data);if(latency)setTimeout(()=>{if(ws.readyState===WebSocket.OPEN)ws.send(body);},latency);else if(ws.readyState===WebSocket.OPEN)ws.send(body);};
 wss.on('connection',ws=>{
  ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.joined=null;ws.count=0;ws.epoch=Date.now();
  ws.on('message',buffer=>{
   if(Date.now()-ws.epoch>1000){ws.epoch=Date.now();ws.count=0;}if(++ws.count>100){ws.close(1008,'Rate limit');return;}
   let data;try{data=JSON.parse(buffer);}catch{return;}
   if(!ws.joined){
    if(data.type!=='join')return;const code=String(data.room||randomBytes(3).toString('hex')).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);if(!code)return;
    let room=rooms.get(code);if(!room){room={members:new Map(),snapshot:null};rooms.set(code,room);}
    const slot=[0,1,2].find(i=>!room.members.has(i));if(slot===undefined){send(ws,{type:'error',message:'Room is full (three players).'});ws.close();return;}
    room.members.set(slot,ws);ws.joined={code,slot};send(ws,{type:'welcome',room:code,slot});
    if(slot&&room.snapshot)send(ws,{type:'snapshot',state:room.snapshot});
    for(const peer of room.members.values())send(peer,{type:'members',slots:[...room.members.keys()]});return;
   }
   const {code,slot}=ws.joined,room=rooms.get(code);if(!room)return;
   if(data.type==='snapshot'&&slot===0){room.snapshot=data.state;for(const [id,peer]of room.members)if(id!==0)send(peer,{type:'snapshot',state:data.state});}
   if(data.type==='input'&&slot!==0)send(room.members.get(0),{type:'input',slot,input:data.input});
  });
  ws.on('close',()=>{if(!ws.joined)return;const {code,slot}=ws.joined,room=rooms.get(code);if(!room)return;room.members.delete(slot);
   if(slot===0){for(const peer of room.members.values()){if(peer.readyState===WebSocket.OPEN)peer.send(JSON.stringify({type:'ended'}));peer.close(1001,'Host left');}rooms.delete(code);}
   else for(const peer of room.members.values())send(peer,{type:'members',slots:[...room.members.keys()]});
  });
 });
 const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},15000);heartbeat.unref();
 server.on('close',()=>clearInterval(heartbeat));server.listen(port,host);
 return {server,wss,rooms,close:()=>new Promise(resolve=>{for(const ws of wss.clients)ws.terminate();wss.close(()=>server.close(resolve));})};
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href){const r=createRelay();r.server.on('listening',()=>console.log(`Co-op relay listening on ${r.server.address().port}`));}
