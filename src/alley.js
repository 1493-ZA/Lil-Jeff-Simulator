import * as THREE from 'three';
export const ALLEY_STOPS=[[12,-40],[12,-46],[6,-44]];
export function alleyInteract(game){
 const a=game.claim.alley??={step:0,guards:[],choice:null};const pos=game.player.group.position,stop=ALLEY_STOPS[Math.min(a.step,2)];
 if(Math.hypot(pos.x-stop[0],pos.z-stop[1])>3)return false;
 if(a.step===0){a.step=1;game.toast('Z78: Package ain’t here. Meet the contact farther down the east alley. Stay ready.');return true;}
 if(a.step===1){a.step=2;for(const [x,z]of [[5,-40],[5,-49]]){const e=game.spawnEnemy(x,z);e.alleyGuard=true;a.guards.push(e);}game.toast('Z78: That handoff was a setup. Clear the two rivals, then bring the package back to the purple marker.');return true;}
 if(a.guards.some(e=>e.health>0)){game.toast('Clear the two alley rivals before returning the package.');return true;}
 game.claim.exitTagged=true;game.awardXP(2,40);game.toast('Z78: Package back. Side lane ours. Bring the crew up.');return true;
}
export function alleyInstruction(game){const a=game.claim.alley;const step=a?.step||0;return [`Switch to Z78 → East alley package marker → ${game.input.label('interact')} inspect.`,`Z78 → Meet the contact farther south in the east alley → ${game.input.label('interact')} handoff.`,`Z78 → Clear the two rivals → Return to the purple marker → ${game.input.label('interact')} deliver.`][step];}
