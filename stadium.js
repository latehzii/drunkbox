import * as THREE from './vendor/three.js';

function signMaterial(title,subtitle='',background='#111e31',accent='#dec192'){
 if(!document.createElement)return new THREE.MeshBasicMaterial({color:accent});
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,1024,256);ctx.fillStyle=accent;ctx.fillRect(0,0,1024,7);ctx.fillRect(0,249,1024,7);ctx.textAlign='center';ctx.font='bold 90px Arial';ctx.fillText(title,512,133);ctx.font='25px Arial';ctx.fillStyle='#bdc8d5';ctx.fillText(subtitle,512,199);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
}

export function createStadium(renderer){
 const stadium=new THREE.Scene();stadium.background=new THREE.Color('#090f1c');stadium.fog=new THREE.Fog('#101828',24,58);
 stadium.add(new THREE.HemisphereLight(0x9db2dc,0x151525,1.4));
 const wash=new THREE.DirectionalLight(0xa6bcdf,1.7);wash.position.set(0,15,4);stadium.add(wash);
 const material=color=>new THREE.MeshStandardMaterial({color,roughness:.9});
 function box(size,pos,color){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material(color));m.position.set(...pos);stadium.add(m);return m;}
 function band(radius,width,y,color,glow=false){const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,width,96,1,true),glow?new THREE.MeshBasicMaterial({color}):material(color));m.material.side=THREE.DoubleSide;m.position.y=y;stadium.add(m);return m;}
 const floor=new THREE.Mesh(new THREE.CircleGeometry(45,96),material('#1e293b'));floor.rotation.x=-Math.PI/2;floor.position.y=-.65;stadium.add(floor);
 // A continuous bowl with two tiers and aisle gaps, filled with real instanced people.
 const spectators=[];let seed=82;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const clothes=['#566c92','#5c6173','#594650','#857467','#4c726f','#a89477','#3b4962','#72583e'];
 const skins=['#c29a7b','#b27f63','#785644','#d4b092','#947057'];
 const seatMaterial=material('#263d5d'),deckMaterial=material('#29303e');
 for(let row=0;row<22;row++){
   const upper=row>=10,radius=8.5+row*.67+(upper?1.2:0),y=-.2+row*.34+(upper?.9:0);
   const terrace=new THREE.Mesh(new THREE.RingGeometry(radius-.35,radius+.35,128),deckMaterial);terrace.rotation.x=-Math.PI/2;terrace.position.y=y;stadium.add(terrace);
   const riser=new THREE.Mesh(new THREE.CylinderGeometry(radius+.35,radius+.35,.34,128,1,true),deckMaterial);riser.position.y=y-.17;stadium.add(riser);
   const count=Math.floor(Math.PI*2*radius/.5);
   for(let j=0;j<count;j++){const angle=j/count*Math.PI*2;const section=(angle/(Math.PI*2)*12)%1;if(section<.065||section>.965||random()<.035)continue;
     spectators.push({x:Math.sin(angle)*radius,z:Math.cos(angle)*radius,y,angle:angle+Math.PI,height:.36+random()*.13,clothes:clothes[Math.floor(random()*clothes.length)],skin:skins[Math.floor(random()*skins.length)]});
   }
 }
 const count=spectators.length,heads=new THREE.InstancedMesh(new THREE.BoxGeometry(.17,.21,.17),material('#c29a7b'),count);
 const bodies=new THREE.InstancedMesh(new THREE.BoxGeometry(.3,1,.2),material('#67758b'),count);
 const legs=new THREE.InstancedMesh(new THREE.BoxGeometry(.28,.17,.35),material('#313440'),count);
 const seats=new THREE.InstancedMesh(new THREE.BoxGeometry(.39,.09,.4),seatMaterial,count);
 const arms=new THREE.InstancedMesh(new THREE.BoxGeometry(.09,.28,.09),material('#66768a'),count*2);
 const transform=new THREE.Object3D(),color=new THREE.Color();
 function instance(mesh,index,p,size,angle){transform.position.set(...p);transform.rotation.set(0,angle,0);transform.scale.set(...size);transform.updateMatrix();mesh.setMatrixAt(index,transform.matrix);}
 spectators.forEach((p,i)=>{
   instance(seats,i,[p.x,p.y+.31,p.z],[1,1,1],p.angle);
   instance(legs,i,[p.x,p.y+.47,p.z],[1,1,1],p.angle);
   instance(bodies,i,[p.x,p.y+.52+p.height/2,p.z],[1,p.height,1],p.angle);bodies.setColorAt(i,color.set(p.clothes));
   instance(heads,i,[p.x,p.y+.62+p.height,p.z],[1,1,1],p.angle);heads.setColorAt(i,color.set(p.skin));
   for(let side=0;side<2;side++){const offset=(side===0?-1:1)*.19;instance(arms,i*2+side,[p.x+Math.cos(p.angle)*offset,p.y+.67,p.z-Math.sin(p.angle)*offset],[1,1,1],p.angle);arms.setColorAt(i*2+side,color.set(p.clothes));}
 });
 stadium.add(seats,legs,bodies,heads,arms);
 band(15.6,.75,3.5,'#131d30');band(15.65,.09,3.64,'#3c86b4',true);band(24,.9,8.5,'#171f32');band(24.02,.1,8.7,'#bc9362',true);
 const ribbon=band(15.58,.6,3.53,'#1d3350');ribbon.material=signMaterial('DRUNKBOX','FIGHT NIGHT  •  LIVE AT THE ARENA');if(ribbon.material.map){ribbon.material.map.wrapS=THREE.RepeatWrapping;ribbon.material.map.repeat.x=-12;}
 // Ringside floor seating, barriers and broadcast tables surround the central platform.
 for(const side of [-1,1]){
   for(let row=0;row<3;row++)for(let seat=0;seat<14;seat++){const x=-3.8+seat*.58,z=side*(5.2+row*.67);box([.38,.08,.4],[x,-.22,z],'#24384d');box([.38,.44,.07],[x,.03,z+side*.18],'#29415c');
     const skin=skins[(seat+row*3)%skins.length];box([.18,.22,.18],[x,.65,z],skin);box([.31,.39,.19],[x,.33,z],clothes[(seat+row)%clothes.length]);}
   box([8.8,.07,.07],[0,.15,side*7.5],'#65788e');for(let x=-4;x<=4;x+=2)box([.055,.75,.055],[x,-.2,side*7.5],'#53657b');
   const desk=box([2.2,.16,.65],[side*4.4,-.13,0],'#172b40');for(let z of [-.65,.65])box([.06,.5,.06],[side*4.4,-.4,z],'#465568');
   for(let offset of [-.65,.65]){const monitor=box([.32,.22,.035],[side*4.4,.12,offset],'#4a89a9');monitor.rotation.y=side*Math.PI/2;}
 }
 for(let i=0;i<4;i++){const angle=i*Math.PI/2,screen=new THREE.Mesh(new THREE.PlaneGeometry(5.4,1.65),signMaterial('FIGHT NIGHT','DRUNKBOX ARENA  /  MAIN EVENT'));screen.position.set(Math.sin(angle)*20,6.6,Math.cos(angle)*20);screen.lookAt(0,6.6,0);stadium.add(screen);
   for(const side of [-1,1]){const tower=box([.25,5,.25],[Math.sin(angle)*20+Math.cos(angle)*side*2.85,4.7,Math.cos(angle)*20-Math.sin(angle)*side*2.85],'#38475d');}
 }
 band(26,6,11,'#111a2b');band(27,.5,14.1,'#30394b');
 for(let sector=0;sector<12;sector++){const angle=sector/12*Math.PI*2;
   const entry=box([1.25,1.2,.2],[Math.sin(angle)*16,3.8,Math.cos(angle)*16],'#080e1c');entry.rotation.y=angle;
   const sectionSign=new THREE.Mesh(new THREE.PlaneGeometry(.95,.27),signMaterial(String(101+sector),'','#18263c','#a2c8e0'));sectionSign.position.set(Math.sin(angle)*15.8,4.6,Math.cos(angle)*15.8);sectionSign.lookAt(0,4.6,0);stadium.add(sectionSign);
   for(let row=0;row<22;row++){const upper=row>=10,r=8.5+row*.67+(upper?1.2:0),y=-.2+row*.34+(upper?.9:0);const step=box([.55,.08,.62],[Math.sin(angle)*r,y+.02,Math.cos(angle)*r],'#607084');step.rotation.y=angle;}
   const upright=box([.23,5,.23],[Math.sin(angle)*24.8,10,Math.cos(angle)*24.8],'#364258');
   const lamp=box([1.2,.1,.4],[Math.sin(angle)*21,11.4,Math.cos(angle)*21],'#e2e9f4');lamp.material=new THREE.MeshBasicMaterial({color:'#cadcf1'});lamp.rotation.y=angle;
 }
 // Suspended lighting rig above the ring, visible when the camera follows the action.
 for(const side of [-1,1]){box([9,.16,.16],[0,6.2,side*4.5],'#455160');box([.16,.16,9],[side*4.5,6.2,0],'#455160');for(let i=-3;i<=3;i+=2){const lamp=box([.5,.08,.26],[i,6.08,side*4.5],'#f6e6c8');lamp.material=new THREE.MeshBasicMaterial({color:'#fff1d0'});}}
 // Render the crowd independently, then soften it with a small Gaussian filter.
 const target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});
 const overlay=new THREE.Scene(),screenCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 const blur=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{background:{value:target.texture},texel:{value:new THREE.Vector2(1,1)}},vertexShader:'varying vec2 uvOut; void main(){uvOut=uv;gl_Position=vec4(position.xy,0.0,1.0);}',fragmentShader:`uniform sampler2D background;uniform vec2 texel;varying vec2 uvOut;
 void main(){vec3 c=vec3(0.0);float total=0.0;for(int x=-2;x<=2;x++){for(int y=-2;y<=2;y++){float w=exp(-float(x*x+y*y)/2.8);c+=texture2D(background,uvOut+vec2(float(x),float(y))*texel*1.15).rgb*w;total+=w;}}gl_FragColor=vec4(c/total,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 overlay.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),blur));
 return {spectatorCount:count,resize(w,h){const width=Math.max(1,Math.round(w*(typeof matchMedia==='function'&&matchMedia('(any-pointer: coarse)').matches?.35:.6))),height=Math.max(1,Math.round(h*(typeof matchMedia==='function'&&matchMedia('(any-pointer: coarse)').matches?.35:.6)));target.setSize(width,height);blur.uniforms.texel.value.set(1/width,1/height);},render(camera,ringScene){renderer.autoClear=false;renderer.setRenderTarget(target);renderer.clear();renderer.render(stadium,camera);renderer.setRenderTarget(null);renderer.clear();renderer.render(overlay,screenCamera);renderer.clearDepth();renderer.render(ringScene,camera);}};
}

export function improveRing(scene){
 const cloth=new THREE.MeshStandardMaterial({color:'#526e82',roughness:1});
 if(document.createElement){const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');
   ctx.fillStyle='#547083';ctx.fillRect(0,0,1024,1024);let seed=51;
   for(let i=0;i<9000;i++){seed=(seed*1664525+1013904223)>>>0;const x=(seed>>>16)%1024;seed=(seed*1664525+1013904223)>>>0;const y=(seed>>>16)%1024;ctx.fillStyle=i%2?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.04)';ctx.fillRect(x,y,1,1);}
   ctx.strokeStyle='#c3cfce';ctx.lineWidth=3;ctx.strokeRect(55,55,914,914);ctx.strokeStyle='rgba(220,232,229,.2)';ctx.lineWidth=1;ctx.strokeRect(250,250,524,524);
   ctx.save();ctx.translate(512,512);ctx.rotate(-Math.PI/2);ctx.textAlign='center';ctx.fillStyle='#e2e5d8';ctx.font='bold 80px Arial';ctx.fillText('DRUNKBOX',0,5);ctx.font='20px Arial';ctx.fillStyle='#bbccce';ctx.fillText('F I G H T   N I G H T',0,43);ctx.restore();
   for(const [x,y,c] of [[28,28,'#bf4d42'],[918,28,'#316b9a'],[28,918,'#bf4d42'],[918,918,'#316b9a']]){ctx.fillStyle=c;ctx.fillRect(x,y,78,78);}
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;cloth.color.set('#ffffff');cloth.map=texture;
 }
 const canvasMesh=new THREE.Mesh(new THREE.PlaneGeometry(5.8,5.8),cloth);canvasMesh.rotation.x=-Math.PI/2;canvasMesh.position.y=.012;canvasMesh.receiveShadow=true;scene.add(canvasMesh);
 const box=(size,pos,color)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,roughness:.8}));m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;};
 for(const side of [-1,1]){box([6.08,.4,.055],[0,-.27,side*3.025],'#17273b');box([.055,.4,6.08],[side*3.025,-.27,0],'#17273b');box([6.12,.055,.1],[0,-.06,side*3.02],'#a6b5c1');box([.1,.055,6.12],[side*3.02,-.06,0],'#a6b5c1');}
 const apron=signMaterial('DRUNKBOX','WORLD BOXING  •  FIGHT NIGHT','#13233a','#e2c48d');
 for(const side of [-1,1])for(const axis of ['x','z']){const panel=new THREE.Mesh(new THREE.PlaneGeometry(3,.36),apron);if(axis==='z'){panel.position.set(0,-.27,side*3.058);panel.rotation.y=side===1?0:Math.PI;}else{panel.position.set(side*3.058,-.27,0);panel.rotation.y=side*Math.PI/2;}scene.add(panel);}
 for(const x of [-2.75,2.75])for(const z of [-2.75,2.75]){
   for(const y of [.45,.8,1.15,1.5]){box([.28,.13,.14],[x,y,z],x<0?'#c35848':'#3b7aa8');}
   box([.3,.06,.3],[x,1.69,z],'#dce0d8');
   for(const y of [.8,1.15,1.5]){box([.09,.15,.32],[x,y,z],x<0?'#b7493d':'#356c96');}
   const stoolX=x*1.14,stoolZ=z*.83;box([.27,.075,.27],[stoolX,-.23,stoolZ],x<0?'#a74137':'#285c87');
   for(const dx of [-.1,.1])for(const dz of [-.1,.1])box([.027,.29,.027],[stoolX+dx,-.38,stoolZ+dz],'#465361');
 }
 for(let i=0;i<3;i++)box([.8,.14,.3],[-2,-.58+i*.14,3.45-i*.22],'#606e7c');
}


