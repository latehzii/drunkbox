import {roundHead,roundGlove} from './rounded-features.js';
import * as THREE from './vendor/three.js';

export function createReferee(scene){
 const root=new THREE.Group();scene.add(root);
 const shirt=new THREE.MeshStandardMaterial({color:'#eeeee8',roughness:.8}),black=new THREE.MeshStandardMaterial({color:'#172128',roughness:.8}),skin=new THREE.MeshStandardMaterial({color:'#cba58b',roughness:.75}),stripe=new THREE.MeshStandardMaterial({color:'#202b32'}),glove=new THREE.MeshStandardMaterial({color:'#93bac7'});
 function box(parent,size,position,material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...position);mesh.castShadow=true;parent.add(mesh);return mesh;}
 const body=new THREE.Group();root.add(body);body.position.y=1.16;
 const torso=box(body,[.38,.53,.25],[0,.28,0],shirt);
 for(const x of [-.15,-.075,0,.075,.15])for(const z of [-.126,.126])box(torso,[.027,.5,.004],[x,0,z],stripe);
 box(body,[.30,.22,.23],[0,-.075,0],black);box(body,[.31,.035,.24],[0,.045,0],black);
 box(torso,[.10,.045,.02],[0,.19,.14],black);box(torso,[.07,.08,.012],[-.105,.12,.14],glove);
 const head=box(body,[.28,.32,.28],[0,.72,0],skin);box(head,[.29,.065,.29],[0,.13,0],black);
 box(body,[.14,.09,.14],[0,.56,0],skin);
 for(const x of [-.06,.06]){box(head,[.025,.018,.01],[x,.04,.145],black);box(head,[.045,.012,.01],[x,.075,.145],black);}box(head,[.035,.045,.035],[0,-.005,.15],skin);
 roundHead(head);
 const legs=[],arms=[];
 for(const s of [-1,1]){
  const leg=new THREE.Group();body.add(leg);leg.position.set(s*.105,-.16,0);legs.push(leg);
  box(leg,[.14,.43,.16],[0,-.215,0],black);const knee=new THREE.Group();leg.add(knee);knee.position.y=-.43;leg.userData.knee=knee;
  box(knee,[.115,.43,.135],[0,-.215,0],black);box(knee,[.16,.12,.29],[0,-.44,.07],black);
  box(knee,[.125,.10,.14],[0,0,0],black);
  const arm=new THREE.Group();body.add(arm);arm.position.set(s*.245,.45,0);arms.push(arm);
  box(arm,[.125,.19,.15],[0,-.085,0],shirt);box(arm,[.10,.24,.11],[0,-.28,0],skin);box(arm,[.09,.31,.10],[0,-.53,.04],skin);roundGlove(box(arm,[.115,.13,.12],[0,-.73,.06],glove));arm.rotation.z=s*.08;
 }
 let stride=0,side=1,speed=0;
 function reset(){root.position.set(0,0,-1.95);root.rotation.set(0,0,0);stride=0;side=-1;speed=0;body.position.y=1.16;for(const leg of legs){leg.rotation.x=0;leg.userData.knee.rotation.x=0;}for(const arm of arms)arm.rotation.x=0;}
 reset();
 const target=new THREE.Vector3();
 function update(dt,fighters){
  const positions=fighters.map(f=>new THREE.Vector3(f.hips.b.position.x,0,f.hips.b.position.z));
  const center=positions[0].clone().add(positions[1]).multiplyScalar(.5),line=positions[1].clone().sub(positions[0]);if(line.lengthSq()<.01)line.set(1,0,0);line.normalize();
  const normal=new THREE.Vector3(-line.z,0,line.x);
  const threats=positions.map((p,i)=>p.clone().add(new THREE.Vector3(fighters[i].hips.b.velocity.x,0,fighters[i].hips.b.velocity.z).multiplyScalar(.4)));
  let best=-Infinity;
  for(let i=0;i<16;i++){
   const angle=i*Math.PI/8,candidate=center.clone().addScaledVector(normal,Math.cos(angle)*1.95).addScaledVector(line,Math.sin(angle)*1.95);
   candidate.x=THREE.MathUtils.clamp(candidate.x,-2.35,2.35);candidate.z=THREE.MathUtils.clamp(candidate.z,-2.35,2.35);
   const clearance=Math.min(...threats.map(p=>p.distanceTo(candidate))),across=Math.cos(angle);
   // Prefer a side-on view, away from the line of punches, and keep the same side.
   const score=Math.min(clearance,1.65)*3+Math.abs(across)*.8+(Math.sign(across)===side?.25:0)-candidate.distanceTo(root.position)*.32;
   if(score>best){best=score;target.copy(candidate);}
  }
  const to=target.clone().sub(root.position);to.y=0;const distance=to.length();if(distance>.01)to.normalize();
  const motion=to.multiplyScalar(Math.min(distance*3,1.6));
  for(const threat of threats){const away=root.position.clone().sub(threat);away.y=0;const d=away.length();if(d<1.5){if(d<.01)away.copy(normal);else away.divideScalar(d);motion.addScaledVector(away,(1.5-d)*5);}}
  if(motion.length()>2.5)motion.setLength(2.5);
  root.position.addScaledVector(motion,dt);root.position.x=THREE.MathUtils.clamp(root.position.x,-2.35,2.35);root.position.z=THREE.MathUtils.clamp(root.position.z,-2.35,2.35);
  side=Math.sign(root.position.clone().sub(center).dot(normal))||side;
  const yaw=Math.atan2(center.x-root.position.x,center.z-root.position.z);root.rotation.y+=Math.atan2(Math.sin(yaw-root.rotation.y),Math.cos(yaw-root.rotation.y))*Math.min(1,dt*8);
  speed=THREE.MathUtils.lerp(speed,motion.length(),1-Math.exp(-dt*12));stride+=dt*speed*9;
  const amount=Math.min(1,speed/1.2);body.position.y=1.16+Math.abs(Math.sin(stride))*.022*amount;
  legs.forEach((leg,i)=>{const step=Math.sin(stride+i*Math.PI);leg.rotation.x=step*.36*amount;leg.userData.knee.rotation.x=Math.max(0,-step)*.40*amount;arms[i].rotation.x=-step*.12*amount;});
 }
 // Include local joints and the root in the same pose recording as the fighters.
 const replayParts=[root,body,...legs,...legs.map(l=>l.userData.knee),...arms].map(mesh=>({mesh,b:{get position(){return mesh.position;},get quaternion(){return mesh.quaternion;}}}));
 return {root,update,reset,replayParts};
}
