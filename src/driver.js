import { DRIVE_ROUTE } from './mission.js';
// Z78's autonomous driver for Mission 1. It runs whenever Z78 is not the
// player-controlled character, independent of camera, active character or
// gunner seat, and keeps circling the block until the mission ends.
// The loop passes the three route gates, then laps the street in both lanes,
// clear of the parked cars at x=±7, and wraps back through the gate positions.
export const DRIVE_LOOP=[...DRIVE_ROUTE,[-3.5,-66],[-3.5,-40],[-3.5,-10],[-4.2,9],[-2.5,15.5],[2.5,15.5],[4.5,9],[3.5,-8],[3.5,-35]];
const ahead=(car,dist)=>({x:car.group.position.x-Math.sin(car.yaw)*dist,z:car.group.position.z-Math.cos(car.yaw)*dist});
// World-axis half extents of the 2.6 × 4.2 car body at a given heading.
export function carExtents(yaw){const c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw));return{x:c*1.3+s*2.1,z:s*1.3+c*2.1};}
export function laneBlocked(game,point,yaw=0){
 const e=carExtents(yaw);
 return Math.abs(point.x)>7.1||point.z<-77.4||point.z>18.6||game.colliders.some(box=>box.max.y>.3&&box.min.y<1.6&&point.x+e.x>box.min.x&&point.x-e.x<box.max.x&&point.z+e.z>box.min.z&&point.z-e.z<box.max.z);
}
function clearance(game,car,direction,distance){
 for(let d=1;d<=distance;d+=.75)if(laneBlocked(game,ahead(car,d*direction),car.yaw))return d-1;
 return distance;
}
// Pick up the route where it makes sense after the player hands back the wheel.
export function resumeRoute(game){
 const car=game.car,ai=car.ai;
 if(car.gate<DRIVE_ROUTE.length){ai.target=car.gate;return;}
 const p=car.group.position,fx=-Math.sin(car.yaw),fz=-Math.cos(car.yaw);let best=0,score=Infinity;
 for(let i=0;i<DRIVE_LOOP.length;i++){const [x,z]=DRIVE_LOOP[i],dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);const s=d+((dx*fx+dz*fz)<0?25:0);if(d>3&&s<score){score=s;best=i;}}
 ai.target=best;
}
export function autoDrive(game,dt){
 const car=game.car;
 if(!car.ai){car.ai={target:0,mode:'forward',modeTime:0,stuck:0};resumeRoute(game);}
 const ai=car.ai,p=car.group.position;
 if(car.gate<DRIVE_ROUTE.length&&ai.target>car.gate)ai.target=car.gate;
 let [tx,tz]=DRIVE_LOOP[ai.target];
 const distance=Math.hypot(tx-p.x,tz-p.z);
 // Unpassed gates are counted by updateDriving; every other point advances on proximity.
 const gatePending=car.gate<DRIVE_ROUTE.length&&ai.target<DRIVE_ROUTE.length;
 if(gatePending?car.gate>ai.target:distance<3.2){ai.target=(ai.target+1)%DRIVE_LOOP.length;[tx,tz]=DRIVE_LOOP[ai.target];}
 let desired=Math.atan2(-(tx-p.x),-(tz-p.z));
 // Steer around parked cars and kerbs: prefer the heading closest to the
 // route that still has room ahead.
 const along=(yaw,d)=>({x:p.x-Math.sin(yaw)*d,z:p.z-Math.cos(yaw)*d});
 const room=yaw=>{for(let d=1;d<=6;d+=.75)if(laneBlocked(game,along(yaw,d),yaw))return d-1;return 6;};
 if(room(desired)<Math.min(6,distance)){let best=desired,score=-Infinity;for(const offset of [0,.35,-.35,.7,-.7,1.05,-1.05]){const yaw=desired+offset,r=room(yaw),value=r-Math.abs(offset)*2.2;if(value>score){score=value;best=yaw;}}desired=best;}
 const turn=Math.atan2(Math.sin(desired-car.yaw),Math.cos(desired-car.yaw));
 ai.modeTime+=dt;
 // Stuck detection by real progress, so bouncing off a kerb also counts.
 ai.check??={x:p.x,z:p.z,time:0};ai.check.time+=dt;
 if(ai.check.time>1.2){ai.stuck=Math.hypot(p.x-ai.check.x,p.z-ai.check.z)<.6?1:0;ai.check={x:p.x,z:p.z,time:0};}
 if(ai.bumped){ai.bumped=false;ai.stuck=1;}
 if(ai.mode==='forward'){
  const room=clearance(game,car,1,5);
  if(ai.stuck||Math.abs(turn)>1.9&&room<4.5||room<1.2&&Math.abs(turn)>.5){ai.mode='reverse';ai.modeTime=0;ai.stuck=0;}
 }else{
  const back=clearance(game,car,-1,3);
  if(ai.modeTime>.9&&(Math.abs(turn)<.9||back<1.2)||ai.modeTime>3.5||ai.stuck&&ai.modeTime>.3){ai.mode='forward';ai.modeTime=0;ai.stuck=0;}
 }
 if(ai.mode==='reverse')return{backward:car.speed>-2.7,right:turn>.05,left:turn<-.05,brake:car.speed>1.5};
 const corner=Math.abs(turn),target=corner>.9?3.6:corner>.45?5.5:8.5;
 return{forward:car.speed<target,left:turn>.05,right:turn<-.05,brake:car.speed>target+1.2};
}
