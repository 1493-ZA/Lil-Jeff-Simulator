import * as THREE from 'three';
import {createContact,exchange,updateContact} from './contacts.js';
export const ALLEY_STOPS=[[12,-40],[12,-47],[30,-47]];
export function alleyInteract(game){
 const a=game.claim.alley??={step:0,guards:[],choice:null};const pos=game.player.group.position,stop=ALLEY_STOPS[Math.min(a.step,2)];
 if(Math.hypot(pos.x-stop[0],pos.z-stop[1])>3)return false;
 if(a.step===0){a.step=1;game.toast('Z78: Got the sealed case. Cut through the next gap. Client’s round the back.');return true;}
 if(a.step===1){a.step=2;const client=createContact(game,30,-47,3,'MOSS / NIGHT COURIER');game.alleyClient=client;game.claimProps.push(client.group);for(const [x,z]of [[5,-40],[5,-49]]){const e=game.spawnEnemy(x,z);e.alleyGuard=true;a.guards.push(e);}game.toast('Z78: Opps just pulled up. Clear this lane, then meet Moss behind the buildings.');return true;}
 if(a.guards.some(e=>e.health>0)){game.toast('Clear the two alley rivals before returning the package.');return true;}
 exchange(game,game.alleyClient);game.claim.exitTagged=true;game.awardXP(2,40);game.toast('Moss: Case checks out. We good. Z78: Bet. Crew, bring it up. +40 STREET CRED.');return true;
}
export function alleyInstruction(game){const a=game.claim.alley;const step=a?.step||0;return [`Switch to Z78 → East alley package marker → ${game.input.label('interact')} inspect.`,`Z78 → Meet the contact farther south in the east alley → ${game.input.label('interact')} handoff.`,`Z78 → Clear the two rivals → Through the building gap → Meet Moss behind the flats → ${game.input.label('interact')} deliver.`][step];}
