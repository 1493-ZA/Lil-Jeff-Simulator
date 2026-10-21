import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';import WebSocket from 'ws';import {createRelay} from '../server/relay.js';
const inbox=ws=>{const packets=[];ws.on('message',b=>packets.push(JSON.parse(b)));return async(type,predicate=()=>true)=>{const until=Date.now()+3000;while(Date.now()<until){const i=packets.findIndex(p=>p.type===type&&predicate(p));if(i>=0)return packets.splice(i,1)[0];await new Promise(r=>setTimeout(r,10));}throw Error(`Timed out: ${type}`);};};
test('relay preserves one authority under latency, stamps input sender, supports late join and host leave',async()=>{
 const relay=createRelay({port:0,host:'127.0.0.1',latency:60});await once(relay.server,'listening');const url=`ws://127.0.0.1:${relay.server.address().port}`;const clients=[];
 async function join(){const ws=new WebSocket(url),next=inbox(ws);clients.push(ws);await once(ws,'open');ws.send(JSON.stringify({type:'join',room:'QATEST'}));const welcome=await next('welcome');return{ws,next,welcome};}
 try{const host=await join(),guest=await join();assert.equal(host.welcome.slot,0);assert.equal(guest.welcome.slot,1);
 guest.ws.send(JSON.stringify({type:'snapshot',state:{seq:99,stage:99}}));host.ws.send(JSON.stringify({type:'snapshot',state:{seq:1,stage:2}}));assert.deepEqual((await guest.next('snapshot')).state,{seq:1,stage:2});
 guest.ws.send(JSON.stringify({type:'input',slot:0,input:{commands:['KeyE']}}));assert.equal((await host.next('input')).slot,1);
 const late=await join();assert.deepEqual((await late.next('snapshot')).state,{seq:1,stage:2});guest.ws.close();await host.next('members',m=>m.slots.length===2);host.ws.close();await late.next('ended');
 }finally{for(const ws of clients)ws.terminate();await relay.close();}
});
