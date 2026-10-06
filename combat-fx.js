import * as THREE from './vendor/three.js';

export function createCombatFX(scene){
 const particles=[],waves=[],trails=new Map(),transform=new THREE.Object3D();let shake=0,time=0;
 const drops=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.018),new THREE.MeshBasicMaterial({color:'#fff4d8',transparent:true,depthWrite:false}),160);drops.count=0;drops.frustumCulled=false;scene.add(drops);
 const flash=document.querySelector('#impact-flash');
 for(let i=0;i<6;i++){const mesh=new THREE.Mesh(new THREE.RingGeometry(.085,.1,24),new THREE.MeshBasicMaterial({color:'#fff1ce',transparent:true,depthWrite:false,side:THREE.DoubleSide}));mesh.visible=false;scene.add(mesh);waves.push({mesh,age:1,life:.28});}
 return {clear(){particles.length=0;shake=0;for(const wave of waves)wave.mesh.visible=false;for(const trail of trails.values()){trail.points.length=0;trail.line.visible=false;}if(flash)flash.style.opacity=0;},
 hit(position,intensity,kind='hit',direction){
   const power=Math.max(.1,Math.min(1,intensity)),blocked=kind==='block';shake=Math.min(1,shake+power*(blocked?.12:.5));
   if(flash){flash.style.opacity=Math.min(.23,power*(blocked?.045:.14));flash.style.background=blocked?'radial-gradient(ellipse,transparent 35%,#85bfff 100%)':'radial-gradient(ellipse,transparent 30%,#ff6c3f 100%)';}
   const amount=Math.round(5+power*13),color=blocked?'#9cd9ff':'#fff1ca';
   for(let i=0;i<amount;i++){const theta=Math.random()*Math.PI*2,radius=.5+Math.random()*2.2;particles.push({position:new THREE.Vector3(position.x,position.y,position.z),velocity:new THREE.Vector3(Math.cos(theta)*radius,Math.random()*1.8+.4,Math.sin(theta)*radius).addScaledVector(direction?new THREE.Vector3(direction.x,direction.y,direction.z):new THREE.Vector3(),.35),life:.35+Math.random()*.25,age:0,color,size:.6+power});}
   while(particles.length>160)particles.shift();const wave=waves.reduce((a,b)=>a.age>b.age?a:b);wave.age=0;wave.mesh.position.set(position.x,position.y,position.z);wave.mesh.material.color.set(color);wave.mesh.visible=true;
 },update(dt,camera,fighters,clock){time+=dt;shake*=Math.exp(-dt*12);if(flash)flash.style.opacity=Math.max(0,Number(flash.style.opacity)-dt*.7);
   for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;if(p.age>p.life){particles.splice(i,1);continue;}p.velocity.y-=dt*4;p.position.addScaledVector(p.velocity,dt);}
   particles.forEach((p,i)=>{transform.position.copy(p.position);transform.scale.setScalar(p.size*(1-p.age/p.life));transform.updateMatrix();drops.setMatrixAt(i,transform.matrix);drops.setColorAt(i,new THREE.Color(p.color));});drops.count=particles.length;drops.instanceMatrix.needsUpdate=true;if(drops.instanceColor)drops.instanceColor.needsUpdate=true;
   for(const wave of waves){wave.age+=dt;wave.mesh.visible=wave.age<wave.life;if(wave.mesh.visible){wave.mesh.quaternion.copy(camera.quaternion);wave.mesh.scale.setScalar(1+wave.age*14);wave.mesh.material.opacity=(1-wave.age/wave.life)*.5;}}
   for(const f of fighters)for(let hand=0;hand<2;hand++){const body=f[hand===0?'gloveL':'gloveR'].b;let trail=trails.get(body.id);if(!trail){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(36),3));const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:f.color,transparent:true,opacity:.4,depthWrite:false}));line.frustumCulled=false;scene.add(line);trail={line,points:[],fade:0};trails.set(body.id,trail);}
     const age=clock-f.punch[hand],active=age>.18&&age<.5&&f.health>0;if(active){trail.points.push(new THREE.Vector3(body.position.x,body.position.y,body.position.z));if(trail.points.length>12)trail.points.shift();trail.fade=1;}else trail.fade=Math.max(0,trail.fade-dt*8);
     trail.line.visible=trail.fade>0&&trail.points.length>1;if(trail.line.visible){const array=trail.line.geometry.attributes.position.array;trail.points.forEach((p,i)=>{array[i*3]=p.x;array[i*3+1]=p.y;array[i*3+2]=p.z;});trail.line.geometry.attributes.position.needsUpdate=true;trail.line.geometry.setDrawRange(0,trail.points.length);trail.line.material.opacity=trail.fade*.32;}else trail.points.length=0;
   }
 },cameraOffset(){return {x:Math.sin(time*91)*shake*.095,y:Math.cos(time*77)*shake*.045,roll:Math.sin(time*63)*shake*.014};},get intensity(){return shake;}}
}
