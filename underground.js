import * as THREE from './vendor/three.js';

export function createUnderground(scene,renderer){
 const room=new THREE.Group();room.visible=false;scene.add(room);
 const materials=new Map();
 function material(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.95}));return materials.get(color);}
 function box(size,pos,color,parent=room){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material(color));m.position.set(...pos);m.receiveShadow=true;parent.add(m);return m;}
 function sign(text,small,width,height,pos,angle=0,bg='#222322',ink='#e9c797'){
  let mat=new THREE.MeshBasicMaterial({color:ink,side:THREE.DoubleSide});
  if(document.createElement){const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,1024,512);x.strokeStyle=ink;x.lineWidth=12;x.strokeRect(25,25,974,462);x.textAlign='center';x.fillStyle=ink;x.font='bold 86px Arial';x.fillText(text,512,235);x.font='26px Arial';x.fillText(small,512,320);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;mat=new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});}
  const m=new THREE.Mesh(new THREE.PlaneGeometry(width,height),mat);m.position.set(...pos);m.rotation.y=angle;room.add(m);return m;
 }
 box([20,.18,20],[0,-.7,0],'#393934');
 for(const side of [-1,1]){box([20,5.8,.3],[0,2.1,side*9.8],'#564237');box([.3,5.8,20],[side*9.8,2.1,0],'#4a4239');
  for(let y=-.4;y<4.6;y+=.28){box([19.7,.015,.018],[0,y,side*9.63],'#2c2925');box([.018,.015,19.7],[side*9.63,y,0],'#2c2925');}
  for(let x=-9;x<10;x+=1.4)for(let y=-.3;y<4.6;y+=.56)box([.015,.28,.02],[x,y,side*9.62],'#2c2925');
 }
 box([20,.15,20],[0,5.05,0],'#242824');
 for(const x of [-6,0,6]){box([.32,.32,20],[x,4.65,0],'#272e2d');if(x!==0)box([.45,5.4,.45],[x,-.65+2.7,-7],'#59584d');}
 for(const z of [-5.5,5.5]){const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,19.4,12),material('#845e43'));pipe.rotation.z=Math.PI/2;pipe.position.set(0,4.35,z);room.add(pipe);for(const x of [-7,-3,2,7])box([.05,.3,.3],[x,4.35,z],'#3c3933');}
 for(const x of [-2.5,2.5]){box([.6,.12,1.5],[x,4.48,0],'#202926');box([.46,.018,1.25],[x,4.40,0],'#fbdfb0');const light=new THREE.PointLight('#ffd19a',8,13,2);light.position.set(x,4.1,0);room.add(light);}
 sign('THE BOILER ROOM','NO CAMERAS. NO SHORTCUTS. JUST BOXING.',5,2.1,[0,2.4,-9.60]);
 sign('AMATEUR NIGHT','FIRST FIGHT / ALL HEART',2.7,1.5,[-9.60,2.2,-3],Math.PI/2,'#333b32','#a8c1a3');
 sign('EXIT','KEEP THIS DOOR CLEAR',1.25,.6,[7.5,2.6,-9.59],0,'#163b30','#b8e4c0');box([1.6,2.7,.08],[7.5,.68,-9.56],'#273a32');
 sign('MERCER','0–3 / STILL SHOWING UP',1.6,1.1,[9.60,1.5,1.8],-Math.PI/2,'#c6bc95','#282c25');
 // A close crowd of locals, not a stadium audience.
 const spectators=[];const palette=['#63766a','#806c56','#384957','#77605e','#776f54'];
 for(let i=0;i<64;i++){
  const a=i/64*Math.PI*2,r=4.55+(i%3)*.6,g=new THREE.Group();g.position.set(Math.sin(a)*r,-.6,Math.cos(a)*r);if(g.position.x>-4.5&&g.position.x<1&&g.position.z>3.3)continue;g.rotation.y=a+Math.PI;room.add(g);
  const shirt=palette[i%palette.length],skin=['#ae8061','#c29c7c','#84624e'][i%3];
  box([.34,.54,.25],[0,.91,0],shirt,g);box([.24,.29,.23],[0,1.34,0],skin,g);box([.25,.06,.24],[0,1.48,0],'#282922',g);
  for(const s of [-1,1]){box([.13,.62,.15],[s*.10,.34,0],'#2b3330',g);box([.11,.46,.12],[s*.23,.94,.03],shirt,g);box([.15,.10,.25],[s*.1,.025,.05],'#202625',g);}
  spectators.push(g);
 }
 for(const x of [-7,7]){box([1.3,.7,.9],[x,-.25,4.5],'#65533c');box([1.32,.045,.92],[x,.12,4.5],'#8b7351');}
 for(let i=0;i<7;i++)box([.08,.005,4],[i*.7-2,-.59,7],'#767265');
 const canvas=sign('THE BOILER ROOM','AMATEUR NIGHT / EARN YOUR NAME',5.8,5.8,[0,.017,0],0,'#484b3d','#c6bea1');canvas.rotation.x=-Math.PI/2;
 const oldCloth=canvas.material;canvas.material=new THREE.MeshStandardMaterial({map:oldCloth.map,color:oldCloth.map?'#ffffff':'#484b3d',roughness:1});oldCloth.dispose();canvas.receiveShadow=true;
 for(const side of [-1,1]){sign('BOILER ROOM','SATURDAY AMATEURS',3.05,.39,[0,-.27,side*3.064],side===1?0:Math.PI,'#363d30','#c8bea0');sign('BOILER ROOM','SATURDAY AMATEURS',3.05,.39,[side*3.064,-.27,0],side*Math.PI/2,'#363d30','#c8bea0');}
 // Tape repairs and old stains make this ring feel borrowed and well used.
 box([.45,.005,.11],[-1.8,.024,1.2],'#b0aa86');box([.11,.005,.43],[-1.8,.025,1.2],'#b0aa86');
 // A neighbourhood sports hall: a real ticketed card, still close to the crowd.
 const fightNight=new THREE.Group();fightNight.visible=false;scene.add(fightNight);
 const hallBox=(size,pos,color)=>box(size,pos,color,fightNight);
 function hallSign(text,small,width,height,pos,angle=0,bg='#172841',ink='#ffe4aa'){const m=sign(text,small,width,height,pos,angle,bg,ink);fightNight.add(m);return m;}
 hallBox([23,.18,25],[0,-.7,0],'#253342');
 for(const side of [-1,1]){hallBox([23,7,.25],[0,2.8,side*12],'#34475b');hallBox([.25,7,24],[side*11.4,2.8,0],'#2c3b50');for(const z of [-9,-3,3,9])hallBox([.18,6.8,.24],[side*11.2,2.7,z],'#152436');}
 hallBox([23,.14,25],[0,6.35,0],'#172332');
 hallSign('SATURDAY SCRAPS','NEIGHBOURHOOD FIGHT NIGHT / FIRST PAID CARD',6.4,1.8,[0,3.7,-11.82]);
 hallSign('FIGHT NIGHT','SMALL HALL. LOUD PEOPLE.',4.2,1.1,[-11.2,3.2,-2],Math.PI/2);
 for(const side of [-1,1]){hallBox([.12,.12,7.6],[side*3.8,4.85,0],'#647785');hallBox([7.6,.12,.12],[0,4.85,side*3.8],'#647785');for(let n=-3;n<=3;n++){hallBox([.08,.36,.08],[n,4.85,side*3.8],'#334455');hallBox([.08,.36,.08],[side*3.8,4.85,n],'#334455');}}
 for(const side of [-1,1]){for(const x of [-2.6,2.6]){hallBox([.36,.24,.32],[x,4.68,side*3.8],'#101b29');hallBox([.27,.025,.25],[x,4.53,side*3.8],'#fff3cf');}const wash=new THREE.PointLight(side<0?'#ffad78':'#81cfff',6,14,2);wash.position.set(side*4,3.5,0);fightNight.add(wash);}
 for(const x of [-2.6,2.6])for(const z of [-3.8,3.8]){const beam=new THREE.Mesh(new THREE.ConeGeometry(1.15,4.4,12,1,true),new THREE.MeshBasicMaterial({color:'#fff0c5',transparent:true,opacity:.022,depthWrite:false,side:THREE.DoubleSide}));beam.position.set(x*.72,2.33,z*.72);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(x*.28,4.4,z*.28).normalize());fightNight.add(beam);}
 // Entrance carpet, barriers and actual steps up to the ring apron.
 hallBox([1.35,.018,7.2],[-2.1,-.595,7.1],'#ba4a50');
 for(const side of [-1,1]){hallBox([.07,.9,6],[-2.1+side*.83,-.12,7.1],'#6b7b85');hallBox([.07,.055,6],[-2.1+side*.83,.32,7.1],'#b4c2c7');}
 for(let n=0;n<3;n++)hallBox([1.2,.20*(n+1),.35],[-2.1,-.6+.1*(n+1),3.65-n*.35],'#6f8490');
 for(const side of [-1,1]){hallBox([1.5,2.5,.16],[-2.1+side*1.1,.65,10.6],'#1a2030');hallBox([.10,2.4,.18],[-2.1+side*.75,.63,10.45],side<0?'#ffa563':'#62c9df');}
 hallSign('YOUR FIRST PAYDAY','THE WALK IS REAL NOW.',3.2,.7,[-2.1,2.55,10.35],Math.PI);
 const nightCanvas=hallSign('SATURDAY SCRAPS','FIGHT NIGHT / EARN YOUR KEEP',5.8,5.8,[0,.019,0]);nightCanvas.rotation.x=-Math.PI/2;
 for(const side of [-1,1]){hallSign('SATURDAY SCRAPS','LOCAL FIGHT NIGHT',3.1,.40,[0,-.26,side*3.068],side===1?0:Math.PI);hallSign('SATURDAY SCRAPS','LOCAL FIGHT NIGHT',3.1,.40,[side*3.068,-.26,0],side*Math.PI/2);}
 const seats=[];
 for(let row=0;row<4;row++)for(let i=0;i<56;i++){const a=i/56*Math.PI*2,r=4.5+row*1.1,x=Math.sin(a)*r,z=Math.cos(a)*r;if(z>3.3&&x>-3.2&&x<-.95)continue;seats.push({x,z,y:-.6+row*.22,a});}
 const instance=new THREE.Object3D(),paint=new THREE.Color();
 for(const [size,offset,type] of [[[.34,.52,.24],[0,.90,0],'shirt'],[[.24,.28,.23],[0,1.31,0],'skin'],[[.26,.07,.24],[0,1.46,0],'hair'],[[.27,.65,.19],[0,.31,0],'legs']]){const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({roughness:1}),seats.length);mesh.frustumCulled=false;for(let i=0;i<seats.length;i++){const p=seats[i];instance.position.set(p.x+offset[0],p.y+offset[1],p.z+offset[2]);instance.rotation.set(0,p.a+Math.PI,0);instance.updateMatrix();mesh.setMatrixAt(i,instance.matrix);paint.set(type==='shirt'?['#d37a59','#708e8f','#b7a76d','#6375a0','#9e6887'][i%5]:type==='skin'?['#bc9272','#916447','#d2af87'][i%3]:type==='hair'?'#302822':'#202936');mesh.setColorAt(i,paint);}fightNight.add(mesh);}
 const tierSeats=seats.filter(p=>p.y>-.59),tiers=new THREE.InstancedMesh(new THREE.BoxGeometry(1.1,.18,1.1),material('#33495d'),tierSeats.length);tierSeats.forEach((p,i)=>{instance.position.set(p.x,p.y-.10,p.z);instance.rotation.set(0,p.a,0);instance.updateMatrix();tiers.setMatrixAt(i,instance.matrix);});fightNight.add(tiers);
 let chapter=1,enabled=false;
 let elapsed=0;
 return {room,fightNight,get spectatorCount(){return chapter===5?seats.length:spectators.length;},setChapter(number){chapter=number;room.visible=enabled&&chapter!==5;fightNight.visible=enabled&&chapter===5;},setEnabled(value){enabled=value;room.visible=enabled&&chapter!==5;fightNight.visible=enabled&&chapter===5;},resize(){},update(dt){elapsed+=dt;if(room.visible)spectators.forEach((g,i)=>{g.rotation.z=Math.sin(elapsed*.7+i*2)*.012;});},render(camera,ringScene){renderer.autoClear=false;renderer.setRenderTarget(null);renderer.clear();renderer.render(ringScene,camera);}};
}
