import * as THREE from './vendor/three.js';
import {roundHead,roundGlove} from './rounded-features.js';

// Continuous render surfaces follow the simulated/replayed parts without changing bodies.
export function createConnectedFigure(parent,f){
 const root=new THREE.Group();root.name='continuous-character-surface';parent.add(root);
 roundHead(f.head.mesh);roundGlove(f.gloveL.mesh);roundGlove(f.gloveR.mesh);
 const surfaces=[],empty=new THREE.BufferGeometry(),skin=f.torso.mesh.material,clothes=f.hips.mesh.material;
 const point=(name,x=0,y=0,z=0)=>new THREE.Vector3(x,y,z).applyQuaternion(f[name].mesh.quaternion).add(f[name].mesh.position);
 const joint=(a,ay,b,by,bz=0)=>point(a,0,ay).lerp(point(b,0,by,bz),.5);
 const mobile=typeof matchMedia==='function'&&matchMedia('(any-pointer: coarse)').matches;
 const radial=mobile?10:16,subdivisions=mobile?2:3,outline=Array.from({length:radial},(_,i)=>[Math.cos(i/radial*Math.PI*2),Math.sin(i/radial*Math.PI*2)]);
 function tube(name,rings,materials,clothingUntil=-1){
  const ringCount=(rings.length-1)*subdivisions+1,geometry=new THREE.BufferGeometry(),positions=new Float32Array(ringCount*radial*3),indices=[];
  for(let r=0;r<ringCount-1;r++)for(let i=0;i<radial;i++){const a=r*radial+i,b=r*radial+(i+1)%radial,c=(r+1)*radial+i,d=(r+1)*radial+(i+1)%radial;indices.push(a,b,c,b,d,c);}
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(indices);
  const seam=clothingUntil*subdivisions*radial*6;
  if(Array.isArray(materials)){geometry.addGroup(0,seam,0);geometry.addGroup(seam,indices.length-seam,1);}
  const mesh=new THREE.Mesh(geometry,materials);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;root.add(mesh);surfaces.push({mesh,rings,ringCount,radial,curve:new THREE.CatmullRomCurve3([],false,'centripetal'),centers:Array.from({length:ringCount},()=>new THREE.Vector3())});return mesh;
 }
 const ring=(at,width,depth=width,orientation=null)=>({at,width,depth,orientation});
 // One deforming surface runs from the neck through chest, waist and pelvis.
 // Cross sections follow both body rotations, so slips and hooks bend the waist smoothly.
 const bodyRing=(part,y,width,depth)=>ring(()=>point(part,0,y),width,depth,()=>f[part].mesh.quaternion);
 const waistband=f.hips.mesh.children.find(child=>child.geometry?.parameters?.width>.29&&child.geometry.parameters.height<.06);
 const trunk=tube('connected-trunk',[
  bodyRing('head',-.13,.135,.13),bodyRing('torso',.25,.16,.15),
  bodyRing('torso',.15,.36,.22),bodyRing('torso',-.035,.32,.215),
  bodyRing('torso',-.23,.255,.185),bodyRing('hips',.105,.275,.205),
  bodyRing('hips',.065,.285,.215),bodyRing('hips',-.025,.315,.235),
  bodyRing('hips',-.12,.275,.22),bodyRing('hips',-.18,.12,.13),bodyRing('hips',-.195,.002,.002)
 ],[skin,waistband?.material||clothes,clothes],5);
 trunk.geometry.clearGroups();const bandStart=5*subdivisions*radial*6,bandEnd=6*subdivisions*radial*6;
 trunk.geometry.addGroup(0,bandStart,0);trunk.geometry.addGroup(bandStart,bandEnd-bandStart,1);trunk.geometry.addGroup(bandEnd,trunk.geometry.index.count-bandEnd,2);
 for(const name of ['torso','hips'])f[name].mesh.geometry=empty;
 if(waistband)waistband.visible=false;
 for(const id of ['L','R']){
  const side=id==='L'?-1:1,u='upper'+id,fore='fore'+id,thigh='thigh'+id,shin='shin'+id,foot='foot'+id;
  const armRoot=()=>point('torso',side*.065,.10),shoulder=()=>point('torso',side*.17,.14),elbow=()=>joint(u,-.20,fore,.19),wrist=()=>joint(fore,-.19,'glove'+id,.065);
  // Bury the open root inside the chest/pelvis before flaring into the shoulder/thigh.
  // Shared joints keep the rest of each limb continuous through punches and slips.
  tube('connected-arm-'+id,[ring(armRoot,.13,.13),ring(shoulder,.145,.14),ring(()=>shoulder().lerp(elbow(),.22),.135,.13),ring(()=>shoulder().lerp(elbow(),.62),.115,.115),ring(elbow,.112,.11),ring(()=>elbow().lerp(wrist(),.65),.098,.098),ring(wrist,.093,.093)],f[u].mesh.material);
  tube('connected-leg-'+id,[ring(()=>point('hips',side*.055,.025),.12,.13),ring(()=>point('hips',side*.10,-.06),.16,.17),ring(()=>point(thigh,0,.17),.155,.165),ring(()=>point(thigh,0,-.10),.15,.155),ring(()=>joint(thigh,-.23,shin,.22),.112,.12),ring(()=>point(shin,0,-.08),.10,.11),ring(()=>joint(shin,-.22,foot,.065,-.065),.10,.11)],[clothes,f[shin].mesh.material],3);
  // Keep identity patches and wrist wraps; replace the disconnected base cuboids.
  for(const name of [u,fore,thigh,shin]){const part=f[name];part.mesh.geometry=empty;for(const child of part.mesh.children){if(child.material===skin||child.material===clothes)child.visible=false;}}
 }
 const direction=new THREE.Vector3(),right=new THREE.Vector3(),forward=new THREE.Vector3(),reference=new THREE.Vector3();
 function update(){
  root.visible=f.torso.mesh.visible;
  for(const {mesh,rings,ringCount,curve,centers} of surfaces){curve.points=rings.map(r=>r.at());for(let r=0;r<ringCount;r++)curve.getPoint(r/(ringCount-1),centers[r]);const position=mesh.geometry.attributes.position;
   reference.set(1,0,0).applyQuaternion(f.torso.mesh.quaternion);
   for(let r=0;r<ringCount;r++){
    const segment=Math.min(rings.length-2,Math.floor(r/subdivisions)),fraction=Math.min(1,r/subdivisions-segment),width=THREE.MathUtils.lerp(rings[segment].width,rings[segment+1].width,fraction),depth=THREE.MathUtils.lerp(rings[segment].depth,rings[segment+1].depth,fraction);
    if(rings[segment].orientation&&rings[segment+1].orientation){const rotation=rings[segment].orientation().clone().slerp(rings[segment+1].orientation(),fraction);reference.set(1,0,0).applyQuaternion(rotation);}
    direction.copy(centers[Math.min(r+1,centers.length-1)]).sub(centers[Math.max(0,r-1)]);if(direction.lengthSq()<.000001)direction.set(0,-1,0);direction.normalize();
    right.copy(reference).addScaledVector(direction,-reference.dot(direction));if(right.lengthSq()<.001)right.set(0,0,1).addScaledVector(direction,-direction.z);right.normalize();forward.crossVectors(direction,right).normalize();
    for(let i=0;i<radial;i++){const [x,z]=outline[i],p=centers[r];position.setXYZ(r*radial+i,p.x+right.x*x*width*.5+forward.x*z*depth*.5,p.y+right.y*x*width*.5+forward.y*z*depth*.5,p.z+right.z*x*width*.5+forward.z*z*depth*.5);}
   }
   position.needsUpdate=true;mesh.geometry.computeVertexNormals();
  }
 }
 update();return {root,surfaces,update};
}
