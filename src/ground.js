import * as THREE from 'three';
// Walkable surface heights. The street plane is y=0; raised slabs such as
// sidewalks and the Commerce Row passage are registered as rectangles so every
// actor (player, crew, rivals, civilians, bodies) samples the same surface.
export const SURFACES=[
 {minX:-15,maxX:-9,minZ:-81,maxZ:25,y:.1},{minX:9,maxX:15,minZ:-81,maxZ:25,y:.1},
 {minX:15,maxX:44,minZ:-34,maxZ:-28,y:.02},
 {minX:44,maxX:47,minZ:-79,maxZ:21,y:.08},{minX:65,maxX:68,minZ:-79,maxZ:21,y:.08},
];
export function groundHeight(x,z){
 let y=0;for(const s of SURFACES)if(x>=s.minX&&x<=s.maxX&&z>=s.minZ&&z<=s.maxZ&&s.y>y)y=s.y;
 return y;
}
// Feet are placed on the sampled surface; never below it, never by a fixed guess.
export function plantOnGround(actor,dt=null){
 const pos=actor.group.position,floor=groundHeight(pos.x,pos.z);
 pos.y=dt===null?floor:Math.max(floor,THREE.MathUtils.damp(pos.y,floor,18,dt));
 return floor;
}
