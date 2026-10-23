import * as THREE from 'three';
import {createContact,exchange} from './contacts.js';
// Pickup, alley passage and Moss's handoff spot behind the flats.
export const ALLEY_STOPS=[[12,-40],[12,-47],[30,-47]];
// Flow: pick up the case → Moss is already waiting and becomes the objective
// → rivals hit the alley → clear them → hand off. No extra "meet" press.
export function alleyInteract(game){
 const a=game.claim.alley??={step:0,guards:[],choice:null};const pos=game.player.group.position,stop=ALLEY_STOPS[a.step===0?0:2];
 if(Math.hypot(pos.x-stop[0],pos.z-stop[1])>3)return false;
 if(a.step===0){
  a.step=2;
  if(!game.alleyClient?.group.parent){const client=createContact(game,30,-47,3,'MOSS / NIGHT COURIER');game.alleyClient=client;game.claimProps.push(client.group);}
  for(const [x,z]of [[5,-40],[5,-49]]){const e=game.spawnEnemy(x,z);e.alleyGuard=true;a.guards.push(e);}
  game.toast('Z78: Got the case. Opps pulled up—clear the lane, then Moss is round the back.');return true;
 }
 if(a.guards.some(e=>e.health>0)){game.toast('Clear the two alley rivals before the handoff.');return true;}
 exchange(game,game.alleyClient);game.claim.exitTagged=true;game.awardXP(2,40);game.toast('Moss: Case checks out. We good. Z78: Bet. Crew, bring it up. +40 STREET CRED.');return true;
}
export function alleyInstruction(game){const a=game.claim.alley;const step=a?.step||0;const guards=a?.guards.filter(e=>e.health>0).length||0;
 return step===0?'Z78: pick up the case in the east alley.':guards?`Clear the alley rivals (${guards} left).`:'Z78: meet Moss behind the flats.';}
