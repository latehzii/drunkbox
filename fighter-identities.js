import * as THREE from './vendor/three.js';
import * as C from './vendor/cannon.js';
export const fighterIdentities=Object.freeze([
 {name:'EDDIE “TIN CAN”',full:'EDDIE MERCER',nick:'TIN CAN',voice:'EDDIE',leg:.91,chest:1.12,waist:1.23,hip:1.13,depth:1.22,arm:1.08,head:1.07,mass:1.04,skin:'#c99d7d',shorts:'#687750',hair:'#73543a',record:'0–3',tell:'ONE BIG RIGHT. ONE LONG BREATHER.'},
 {name:'LEON “TWO STEP”',full:'LEON WARD',nick:'TWO STEP',voice:'LEON',leg:1.02,chest:1.03,waist:.91,hip:.93,depth:.94,arm:.98,head:.96,mass:.99,skin:'#9e684b',shorts:'#983e58',hair:'#211a1c',record:'1–2',tell:'TWO HANDS. ONE OPENING.'},
 {name:'NICO “LATCH”',full:'NICO REYES',nick:'LATCH',voice:'NICO',leg:1.18,chest:.87,waist:.88,hip:.88,depth:.91,arm:.87,head:.94,mass:.94,skin:'#765140',shorts:'#285466',hair:'#111b22',record:'2–2',tell:'LONG LEGS. SHORT ANSWERS.'},
 {name:'OTIS “BULLFROG”',full:'OTIS BELL',nick:'BULLFROG',voice:'OTIS',leg:.94,chest:1.28,waist:1.20,hip:1.18,depth:1.24,arm:1.24,head:1.05,mass:1.20,skin:'#b77857',shorts:'#d06c32',hair:'#452a20',record:'3–3',tell:'LOW LOAD. BIG LIFT. LONG RESET.'},
 {name:'VINCE “METER”',full:'VINCE DOYLE',nick:'METER',voice:'VINCE',leg:1.07,chest:1.10,waist:.95,hip:1.02,depth:1.02,arm:1.04,head:.98,mass:1.10,skin:'#c08a69',shorts:'#674eae',hair:'#332a24',record:'4–3',tell:'JAB. CROSS. RESET. BEAT THE RHYTHM.'}
]);
const baseline=new WeakMap();
export function applyFighterIdentity(f,identity=null){
 if(!baseline.has(f))baseline.set(f,{parts:f.parts.map(p=>({p,mass:p.b.mass,inertia:p.b.inertia.clone(),invInertia:p.b.invInertia.clone(),size:[...p.size],position:p.b.position.clone(),shapes:[...p.b.shapes]})),joints:f.joints.map(j=>({j,a:j.pivotA.clone(),b:j.pivotB.clone()})),headScale:f.head.mesh.scale.clone()});
 const base=baseline.get(f),v=identity||{leg:1,chest:1,waist:1,hip:1,depth:1,arm:1,head:1,mass:1};f.proportions=v;f.legScale=v.leg;f.massScale=v.mass;f.stanceHeight=1.10+1.075*(v.leg-1);f.identity=identity;
 for(const {p,mass,inertia,invInertia,size,position,shapes} of base.parts){
  const leg=/^(thigh|shin)/.test(p.name),width=p.name==='torso'?v.chest:p.name==='hips'?v.hip:leg?v.hip:/^(upper|fore)/.test(p.name)?v.arm:1,depth=p.name==='torso'||p.name==='hips'?v.depth:width;
  p.size=size.map((n,i)=>n*(i===1&&leg?v.leg:i===0?width:i===2?depth:1));
  p.b.mass=mass*v.mass;p.b.shapes.length=p.b.shapeOffsets.length=p.b.shapeOrientations.length=0;
  p.b.addShape(!identity?shapes[0]:p.name==='head'?new C.Sphere(size[0]*v.head):p.name.startsWith('glove')?shapes[0]:new C.Box(new C.Vec3(p.size[0]/2,p.size[1]/2,p.size[2]/2)));const rotation=p.b.quaternion.clone();p.b.quaternion.set(0,0,0,1);p.b.updateMassProperties();p.b.quaternion.copy(rotation);if(!identity){p.b.inertia.copy(inertia);p.b.invInertia.copy(invInertia);p.b.updateInertiaWorld(true);}p.b.updateBoundingRadius();p.b.aabbNeedsUpdate=true;
  const initial=position.clone();if(!p.name.startsWith('foot'))initial.y=leg?.075+(position.y-.075)*v.leg:position.y+1.075*(v.leg-1);initial.x=f.x+(position.x-f.x)*(leg?v.hip:/^(upper|fore|glove)/.test(p.name)?v.chest:1);p.mesh.userData.initial=initial;
 }
 for(const {j,a,b} of base.joints){j.pivotA.copy(a);j.pivotB.copy(b);const pa=f.parts.find(p=>p.b===j.bodyA).name,pb=f.parts.find(p=>p.b===j.bodyB).name;
  j.pivotA.x*=pa==='hips'?v.hip:pa==='torso'?v.chest:1;j.pivotB.x*=pb==='hips'?v.hip:1;
  if(/^(thigh|shin)/.test(pa))j.pivotA.y*=v.leg;if(/^(thigh|shin)/.test(pb))j.pivotB.y*=v.leg;
  if(pb==='head')j.pivotB.y*=v.head;
 }
 f.head.mesh.scale.copy(base.headScale).multiplyScalar(v.head);
 if(identity){f.torso.mesh.material.color.set(v.skin);f.hips.mesh.material.color.set(v.shorts);f.gloveL.mesh.material.color.set(v.shorts);f.gloveR.mesh.material.color.set(v.shorts);}
 f.weightKg=Math.round(f.parts.reduce((sum,p)=>sum+p.b.mass,0));
}
