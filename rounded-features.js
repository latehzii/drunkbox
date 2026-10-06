import * as THREE from './vendor/three.js';

export function roundHead(mesh){
 mesh.geometry=new THREE.SphereGeometry(.17,28,20).scale(.91,1.03,.90);
 mesh.traverse(child=>{
  if(child===mesh||!child.geometry)return;
  const p=child.geometry.parameters;
  if(p?.width>.26&&p.height<.12&&p.depth>.26){child.geometry=new THREE.SphereGeometry(.173,28,12,0,Math.PI*2,0,1.05).scale(.94,1.04,.94);child.position.set(0,.004,0);}
  else if(child.position.z>.14&&Math.abs(child.position.x)<.13){const x=child.position.x/.155,y=child.position.y/.175;child.position.z=.153*Math.sqrt(Math.max(.05,1-x*x-y*y))+.008;}
 });
}
export function roundGlove(mesh){
 mesh.geometry=new THREE.SphereGeometry(1,24,16).scale(.070,.074,.080);
 for(const child of mesh.children){const p=child.geometry?.parameters;if(p?.width>.09&&p.height<.07&&p.depth>.09)child.geometry=new THREE.CylinderGeometry(.051,.048,.055,20);}
}
