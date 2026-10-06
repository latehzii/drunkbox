import * as THREE from './vendor/three.js';

export function createCombatFX(scene){
 const particles=[],waves=[],trails=new Map(),transform=new THREE.Object3D();let shake=0,time=0;
 const drops=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.018),new THREE.MeshBasicMaterial({color:'#fff4d8',transparent:true,depthWrite:false}),160);drops.count=0;drops.frustumCulled=false;scene.add(drops);
 const mobile=typeof matchMedia==='function'&&matchMedia('(any-pointer: coarse)').matches,blood=[],stains=[],bloodLimit=mobile?56:96,stainLimit=mobile?24:40;
 const bloodMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),new THREE.MeshBasicMaterial({color:'#a71929'}),bloodLimit);bloodMesh.count=0;bloodMesh.frustumCulled=false;scene.add(bloodMesh);
 const stainMesh=new THREE.InstancedMesh(new THREE.CircleGeometry(1,9),new THREE.MeshBasicMaterial({color:'#721525',depthWrite:false,side:THREE.DoubleSide}),stainLimit);stainMesh.count=0;stainMesh.frustumCulled=false;scene.add(stainMesh);
 const bloodDirection=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),red=new THREE.Color();
 function splatter(position,power,direction){bloodDirection.set(direction?.x||0,direction?.y||0,direction?.z||0);if(bloodDirection.lengthSq()<.01)bloodDirection.set(0,0,1);bloodDirection.normalize();
  const count=Math.round(7+power*17);for(let i=0;i<count;i++){const spread=.65+power*.7;blood.push({position:new THREE.Vector3(position.x,position.y,position.z),velocity:bloodDirection.clone().multiplyScalar(1+power*2.3+Math.random()).add(new THREE.Vector3((Math.random()-.5)*spread,.5+Math.random()*1.3,(Math.random()-.5)*spread)),age:0,life:1.5+Math.random()*.5,size:.010+Math.random()*.012+power*.007});}while(blood.length>bloodLimit)blood.shift();
 }
 function updateBlood(dt){
  for(let i=blood.length-1;i>=0;i--){const p=blood[i];p.age+=dt;p.velocity.y-=dt*9.8;p.velocity.multiplyScalar(Math.exp(-dt*.7));p.position.addScaledVector(p.velocity,dt);if(p.position.y<=.035){if(Math.abs(p.position.x)<2.8&&Math.abs(p.position.z)<2.8){stains.push({x:p.position.x,z:p.position.z,age:0,life:12+Math.random()*8,size:p.size*(1.4+Math.random()*1.8),stretch:.6+Math.random()*.6,rotation:Math.random()*Math.PI});while(stains.length>stainLimit)stains.shift();}blood.splice(i,1);}else if(p.age>p.life)blood.splice(i,1);}
  blood.forEach((p,i)=>{transform.position.copy(p.position);transform.quaternion.setFromUnitVectors(up,bloodDirection.copy(p.velocity).normalize());transform.scale.set(p.size,p.size*(1+Math.min(1,p.velocity.length()*.08)),p.size);transform.updateMatrix();bloodMesh.setMatrixAt(i,transform.matrix);red.set(i%3?'#b32131':'#701020');bloodMesh.setColorAt(i,red);});bloodMesh.count=blood.length;bloodMesh.instanceMatrix.needsUpdate=true;if(bloodMesh.instanceColor)bloodMesh.instanceColor.needsUpdate=true;
  for(let i=stains.length-1;i>=0;i--){stains[i].age+=dt;if(stains[i].age>=stains[i].life)stains.splice(i,1);}
  stains.forEach((p,i)=>{const fade=Math.min(1,(p.life-p.age)/2);transform.position.set(p.x,.035,p.z);transform.rotation.set(-Math.PI/2,0,p.rotation);transform.scale.set(p.size*fade,p.size*p.stretch*fade,1);transform.updateMatrix();stainMesh.setMatrixAt(i,transform.matrix);});stainMesh.count=stains.length;stainMesh.instanceMatrix.needsUpdate=true;
 }
 const flash=document.querySelector('#impact-flash');
 for(let i=0;i<6;i++){const mesh=new THREE.Mesh(new THREE.RingGeometry(.085,.1,24),new THREE.MeshBasicMaterial({color:'#fff1ce',transparent:true,depthWrite:false,side:THREE.DoubleSide}));mesh.visible=false;scene.add(mesh);waves.push({mesh,age:1,life:.28});}
 return {clear(){particles.length=blood.length=stains.length=0;drops.count=bloodMesh.count=stainMesh.count=0;shake=0;for(const wave of waves)wave.mesh.visible=false;for(const trail of trails.values()){trail.points.length=0;trail.line.visible=false;}if(flash)flash.style.opacity=0;},
 hit(position,intensity,kind='hit',direction,region='head'){
   const power=Math.max(.1,Math.min(1,intensity)),blocked=kind==='block';shake=Math.min(1,shake+power*(blocked?.12:.5));
   if(flash){flash.style.opacity=Math.min(.23,power*(blocked?.045:.14));flash.style.background=blocked?'radial-gradient(ellipse,transparent 35%,#85bfff 100%)':'radial-gradient(ellipse,transparent 30%,#ff6c3f 100%)';}
   if(!blocked&&region==='head'&&power>=.22)splatter(position,power,direction);
   const amount=Math.round(5+power*13),color=blocked?'#9cd9ff':'#fff1ca';
   for(let i=0;i<amount;i++){const theta=Math.random()*Math.PI*2,radius=.5+Math.random()*2.2;particles.push({position:new THREE.Vector3(position.x,position.y,position.z),velocity:new THREE.Vector3(Math.cos(theta)*radius,Math.random()*1.8+.4,Math.sin(theta)*radius).addScaledVector(direction?new THREE.Vector3(direction.x,direction.y,direction.z):new THREE.Vector3(),.35),life:.35+Math.random()*.25,age:0,color,size:.6+power});}
   while(particles.length>160)particles.shift();const wave=waves.reduce((a,b)=>a.age>b.age?a:b);wave.age=0;wave.mesh.position.set(position.x,position.y,position.z);wave.mesh.material.color.set(color);wave.mesh.visible=true;
 },update(dt,camera,fighters,clock){time+=dt;updateBlood(dt);shake*=Math.exp(-dt*12);if(flash)flash.style.opacity=Math.max(0,Number(flash.style.opacity)-dt*.7);
   for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;if(p.age>p.life){particles.splice(i,1);continue;}p.velocity.y-=dt*4;p.position.addScaledVector(p.velocity,dt);}
   particles.forEach((p,i)=>{transform.position.copy(p.position);transform.scale.setScalar(p.size*(1-p.age/p.life));transform.updateMatrix();drops.setMatrixAt(i,transform.matrix);drops.setColorAt(i,new THREE.Color(p.color));});drops.count=particles.length;drops.instanceMatrix.needsUpdate=true;if(drops.instanceColor)drops.instanceColor.needsUpdate=true;
   for(const wave of waves){wave.age+=dt;wave.mesh.visible=wave.age<wave.life;if(wave.mesh.visible){wave.mesh.quaternion.copy(camera.quaternion);wave.mesh.scale.setScalar(1+wave.age*14);wave.mesh.material.opacity=(1-wave.age/wave.life)*.5;}}
   for(const f of fighters)for(let hand=0;hand<2;hand++){const body=f[hand===0?'gloveL':'gloveR'].b;let trail=trails.get(body.id);if(!trail){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(36),3));const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:f.color,transparent:true,opacity:.4,depthWrite:false}));line.frustumCulled=false;scene.add(line);trail={line,points:[],fade:0};trails.set(body.id,trail);}
     const age=clock-f.punch[hand],active=age>.18&&age<.5&&f.health>0;if(active){trail.points.push(new THREE.Vector3(body.position.x,body.position.y,body.position.z));if(trail.points.length>12)trail.points.shift();trail.fade=1;}else trail.fade=Math.max(0,trail.fade-dt*8);
     trail.line.visible=trail.fade>0&&trail.points.length>1;if(trail.line.visible){const array=trail.line.geometry.attributes.position.array;trail.points.forEach((p,i)=>{array[i*3]=p.x;array[i*3+1]=p.y;array[i*3+2]=p.z;});trail.line.geometry.attributes.position.needsUpdate=true;trail.line.geometry.setDrawRange(0,trail.points.length);trail.line.material.opacity=trail.fade*.32;}else trail.points.length=0;
   }
 },cameraOffset(){return {x:Math.sin(time*91)*shake*.095,y:Math.cos(time*77)*shake*.045,roll:Math.sin(time*63)*shake*.014};},get intensity(){return shake;},get bloodCount(){return blood.length;},get stainCount(){return stains.length;},get bloodCapacity(){return bloodLimit;}}
}
