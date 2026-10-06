import {createMultiplayer} from './multiplayer.js';
import {createTouchControls} from './touch-controls.js';
import {updateSlipCounter,consumeCounter} from './slip-counter.js';
import {createConnectedFigure} from './connected-figure.js';
import {createBasementAudio} from './basement-audio.js';
import * as THREE from './vendor/three.js';
import * as C from './vendor/cannon.js';
import {createStadium,improveRing} from './stadium.js';
import {createImpactIndicators} from './impacts.js';
import {createCombatFX} from './combat-fx.js';
import {createMatchFlow} from './match-flow.js';
import {createReferee} from './referee.js';
import {createUnderground} from './underground.js';
import {createStory} from './story.js';
import {createCinematics} from './cinematics.js';


const scene=new THREE.Scene();scene.background=null;scene.fog=new THREE.Fog('#11191f',15,35);
const mobileDevice=typeof matchMedia==='function'&&matchMedia('(any-pointer: coarse)').matches;
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,mobileDevice?1:2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;document.body.appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.1,60);camera.position.set(4.8,3.3,6.4);camera.lookAt(0,1.05,0);
const stadiumArena=createStadium(renderer);let arena=stadiumArena;arena.resize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
scene.add(new THREE.HemisphereLight(0xd5e5ff,0x504436,1.25));const light=new THREE.DirectionalLight(0xffe2b8,2.2);light.position.set(3,8,4);light.castShadow=true;light.shadow.mapSize.set(mobileDevice?512:2048,mobileDevice?512:2048);light.shadow.bias=-.0003;light.shadow.normalBias=.02;light.shadow.camera.left=-7;light.shadow.camera.right=7;light.shadow.camera.top=7;light.shadow.camera.bottom=-7;scene.add(light);
const world=new C.World({gravity:new C.Vec3(0,-9.81,0)});world.solver.iterations=24;world.allowSleep=false;world.defaultContactMaterial.friction=.65;world.defaultContactMaterial.restitution=.03;
const mat=(color,roughness=.8)=>new THREE.MeshStandardMaterial({color,roughness});
function visibleBox(size,pos,material){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.position.set(...pos);m.receiveShadow=true;m.castShadow=true;scene.add(m);return m;}
function solid(size,pos,color){visibleBox(size,pos,mat(color));const b=new C.Body({mass:0,shape:new C.Box(new C.Vec3(...size.map(v=>v/2))),position:new C.Vec3(...pos)});b.material=new C.Material({friction:.65});world.addBody(b);return b;}
solid([5.8,.3,5.8],[0,-.15,0],'#627984');visibleBox([6,.28,6],[0,-.39,0],mat('#1c2938'));
world.addBody(new C.Body({mass:0,shape:new C.Box(new C.Vec3(100,.1,100)),position:new C.Vec3(0,-.65,0)}));
const lineMat=mat('#c6c6bb');
for(const x of [-2.75,2.75])for(const z of [-2.75,2.75]){
 solid([.12,1.65,.12],[x,.825,z],'#b7b8ac');
 visibleBox([.27,.85,.27],[x,1.05,z],mat(x<0?'#b74838':'#3d749e'));
}
for(const [y,color] of [[.45,'#efeee4'],[.8,'#3a628c'],[1.15,'#efeee4'],[1.5,'#b94e42']])for(const side of [-1,1]){
 for(const axis of ['x','z']){const position=axis==='x'?[0,y,side*2.75]:[side*2.75,y,0];const size=axis==='x'?[5.5,.045,.045]:[.045,.045,5.5];
   // Cylindrical ropes have matching static collision volumes.
   const body=new C.Body({mass:0,shape:new C.Box(new C.Vec3(...size.map(n=>n/2))),position:new C.Vec3(...position)});world.addBody(body);
   const rope=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,5.5,12),mat(color,.55));rope.position.set(...position);rope.rotation[axis==='x'?'z':'x']=Math.PI/2;rope.castShadow=true;scene.add(rope);
 }
}
const ring=new THREE.Mesh(new THREE.RingGeometry(.78,.795,64),lineMat);ring.rotation.x=-Math.PI/2;ring.position.y=.006;scene.add(ring);
for(const side of [-1,1]){visibleBox([5.1,.005,.012],[0,.005,side*2.5],lineMat);visibleBox([.012,.005,5.1],[side*2.5,.005,0],lineMat);}
for(const x of [-2.75,2.75])for(const z of [-2.75,2.75]){const spot=new THREE.SpotLight(0xfff1dd,10,14,Math.PI/4,.7,1.4);spot.position.set(x,5,z);spot.target.position.set(0,0,0);scene.add(spot,spot.target);}
improveRing(scene);
const fightAudio=createBasementAudio();
const keys=new Set();let ai=true,debug=false,clock=0,hitFlash=0,hitPause=0;const fighters=[];const jointDots=[];
const impactIndicators=createImpactIndicators(),contactIndicators=new Map();const combatFX=createCombatFX(scene);
const PHYSICS_STEP=1/120;
const PHYSICS=Object.freeze({balance:1.2,power:1,walkSpeed:1.05,stepTime:.3,stepLift:.11,stanceWidth:.22});
let pendingAttack=null,multiplayer=null,remoteAttack=null,guestSnapshot=null,previousAI=true,lastGuardTap=-Infinity,lastGuardClock=-Infinity;
const balance=()=>PHYSICS.balance,power=()=>PHYSICS.power;
const v=(x=0,y=0,z=0)=>new C.Vec3(x,y,z);
function makeFighter(x,color,skin,yaw){
 const f={parts:[],joints:[],health:100,yaw,x,z:0,punch:[-10,-10],punchYaw:[yaw,yaw],punchPower:[1,1],punchKind:['hook','hook'],cool:[0,0],hit:new Map(),down:0,phase:0,color,guard:0,dodge:0,slipTracks:[],counterUntil:0,counterEarned:Infinity,slips:0,blocks:0,stagger:0,recoilPitch:0,recoilRoll:0,bodyTurn:0,move:v()};
 function part(name,mass,size,pos,material,sphere=false){const b=new C.Body({mass,position:v(x+pos[0],pos[1],pos[2]),linearDamping:.12,angularDamping:.45});b.addShape(sphere?new C.Sphere(size[0]):new C.Box(v(...size.map(n=>n/2))));if(name.startsWith('foot'))b.material=new C.Material({friction:1.2});world.addBody(b);const mesh=new THREE.Mesh(sphere?new THREE.SphereGeometry(size[0],20,16):new THREE.BoxGeometry(...size),material);mesh.castShadow=true;scene.add(mesh);const p={name,b,mesh,size};f.parts.push(p);f[name]=p;return p;}
 const flesh=mat(skin,.66),shorts=mat(color),gloves=mat(color,.34),boots=mat('#252b30');
 part('hips',8,[.30,.24,.22],[0,1.15,0],shorts);part('torso',17,[.30,.52,.19],[0,1.53,0],flesh);part('head',4,[.17],[0,1.96,0],flesh,true);
 function detail(parent,size,pos,material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...pos);mesh.castShadow=true;parent.add(mesh);return mesh;}
 f.head.mesh.geometry.dispose();f.head.mesh.geometry=new THREE.BoxGeometry(.29,.33,.29);
 detail(f.head.mesh,[.045,.055,.05],[0,-.005,.158],flesh);
 for(const side of [-1,1]){detail(f.head.mesh,[.022,.015,.006],[side*.062,.038,.148],mat('#24201c'));detail(f.head.mesh,[.043,.012,.018],[side*.062,.067,.15],mat('#453323'));detail(f.head.mesh,[.022,.055,.035],[side*.15,0,0],flesh);}
 detail(f.head.mesh,[.3,.085,.3],[0,.132,0],mat('#29221c'));
 for(const s of [-1,1]){const id=s<0?'L':'R';part('thigh'+id,5,[.125,.46,.14],[s*.095,.80,0],shorts);part('shin'+id,3,[.095,.44,.105],[s*.095,.37,0],flesh);part('foot'+id,1.5,[.145,.13,.3],[s*.095,.075,.065],boots);part('upper'+id,2,[.105,.4,.105],[s*.255,1.46,.015],flesh);part('fore'+id,1.5,[.09,.38,.09],[s*.255,1.07,.04],flesh);part('glove'+id,.65,[.073],[s*.255,.815,.055],gloves,true);}
 for(const p of f.parts){if(p.name.startsWith('glove')){p.mesh.geometry.dispose();p.mesh.geometry=new THREE.BoxGeometry(.125,.13,.145);detail(p.mesh,[.105,.055,.105],[0,.06,0],mat('#eee4cf'));}
   if(p.name.startsWith('upper')||p.name.startsWith('fore')||p.name.startsWith('shin'))detail(p.mesh,[p.size[0]*.94,.065,p.size[2]*.94],[0,p.size[1]/2-.01,0],flesh);
 }
 detail(f.hips.mesh,[.305,.045,.225],[0,.105,0],mat('#e5dbc7'));
 for(const id of ['L','R']){detail(f['thigh'+id].mesh,[.15,.23,.16],[0,.105,0],shorts);detail(f['thigh'+id].mesh,[.105,.06,.115],[0,-.215,0],flesh);detail(f['foot'+id].mesh,[.145,.025,.3],[0,-.064,0],mat('#c0b9a9'));}
 function joint(a,b,pa,pb,angle=.5){const arm=b.startsWith('upper')||b.startsWith('fore');const j=new C.ConeTwistConstraint(f[a].b,f[b].b,{pivotA:v(...pa),pivotB:v(...pb),axisA:v(0,-1,0),axisB:v(0,-1,0),angle,twistAngle:arm?2.4:.65,maxForce:2e5,collideConnected:false});world.addConstraint(j);f.joints.push(j);const dot=new THREE.Mesh(new THREE.SphereGeometry(.035,8,8),mat('#8bffcf'));dot.visible=debug;scene.add(dot);jointDots.push({dot,j});}
 joint('torso','hips',[0,-.26,0],[0,.12,0],.95);f.joints[0].twistAngle=.85;joint('torso','head',[0,.26,0],[0,-.17,0],.75);
 for(const s of [-1,1]){const id=s<0?'L':'R';joint('hips','thigh'+id,[s*.095,-.12,0],[0,.23,0],.65);joint('thigh'+id,'shin'+id,[0,-.23,0],[0,.22,0],.8);joint('shin'+id,'foot'+id,[0,-.22,0],[0,.065,-.065],.35);joint('torso','upper'+id,[s*.20,.14,0],[0,.2,0],2.5);joint('upper'+id,'fore'+id,[0,-.2,0],[0,.19,0],2.4);joint('fore'+id,'glove'+id,[0,-.19,0],[0,.065,0],.4);}
 for(const p of f.parts){p.b.addEventListener('collide',e=>{const other=fighters.find(g=>g!==f&&g.parts.some(q=>q.b===e.body&&q.name.startsWith('glove')));if(!other)return;const vital=['head','torso'].includes(p.name),arm=/^(glove|fore|upper)/.test(p.name);if(!vital&&!(arm&&f.guard>.5))return;const hand=e.body===other.gloveL.b?0:1,age=clock-other.punch[hand];if(age<.12||age>.62)return;const speed=Math.abs(e.contact.getImpactVelocityAlongNormal());if(speed<1.2)return;const key=e.body.id+':'+other.punch[hand];if(f.hit.has(key))return;f.hit.set(key,clock);const frontal=(other.torso.b.position.x-f.torso.b.position.x)*Math.sin(f.yaw)+(other.torso.b.position.z-f.torso.b.position.z)*Math.cos(f.yaw)>0;const covered=[f.gloveL.b,f.gloveR.b].filter(g=>g.position.distanceTo(f.head.b.position)<.43).length;const blocked=frontal&&f.guard>.65&&((arm)||p.name==='head'&&covered===2);if(blocked){f.blocks++;const damage=vital?Math.min(f.health,(speed-.8)*.45*(other.damageScale??1)):0;f.health=Math.max(0,f.health-damage);f.counterUntil=0;impactIndicators.add(p.b.position,damage,speed,'block');fightAudio.impact(f.voice||'OPPONENT',speed,true,soundPan(f));combatFX.hit(p.b.position,Math.min(1,speed/13),'block',e.body.velocity);hitFlash=.08;hitPause=.012;document.querySelector('#message').textContent='BLOCKED · GUARD HOLDS';}else if(vital){f.stagger=Math.min(1,f.stagger+speed*.12);const incoming=e.body.velocity.clone();incoming.normalize();const forward=incoming.x*Math.sin(f.yaw)+incoming.z*Math.cos(f.yaw),sideways=incoming.x*Math.cos(f.yaw)-incoming.z*Math.sin(f.yaw);f.recoilPitch=-forward*.18;f.recoilRoll=-sideways*.18;f.torso.b.applyImpulse(incoming.scale(Math.min(4.2,speed*.62)),v(0,.2,0));const counter=consumeCounter(other,hand,clock);f.counterUntil=0;const damage=Math.min(f.health,(speed-.8)*(p.name==='head'?3:1.8)*(other.damageScale??1)*counter);f.health=Math.max(0,f.health-damage);fightAudio.impact(f.voice||'OPPONENT',speed,false,soundPan(f),p.name);if(f.health===0)fightAudio.knockout(f.voice||'OPPONENT',soundPan(f));impactIndicators.add(p.b.position,damage,speed);combatFX.hit(p.b.position,Math.min(1,Math.max(damage/24,speed/13)),'hit',e.body.velocity);hitFlash=.08+Math.min(.12,speed*.009);hitPause=.020+Math.min(.040,speed*.003);document.querySelector('#message').textContent=counter>1?'COUNTER! · +50% DAMAGE':p.name==='head'?'BOOM! · HEAD SHOT':'BOOM! · BODY SHOT';}});}
 f.gait={feet:[f.footL.b.position.clone(),f.footR.b.position.clone()],swing:-1,next:0,elapsed:0,from:null,to:null,steps:0};
 for(const hand of [0,1]){const glove=f[hand===0?'gloveL':'gloveR'].b;glove.addEventListener('collide',e=>{const age=clock-f.punch[hand];if(age<.18||age>.62||f.parts.some(p=>p.b===e.body))return;const opponent=fighters.find(g=>g!==f&&g.parts.some(p=>p.b===e.body));const struck=opponent?.parts.find(p=>p.b===e.body);if(struck&&(['head','torso'].includes(struck.name)||opponent.guard>.5))return;const speed=Math.abs(e.contact.getImpactVelocityAlongNormal());if(speed<1.5)return;const key=glove.id+':'+f.punch[hand]+':'+(opponent?'fighter'+opponent.x:e.body.id);if(contactIndicators.has(key))return;contactIndicators.set(key,clock);if(contactIndicators.size>96)contactIndicators.delete(contactIndicators.keys().next().value);fightAudio.impact(f.voice||'OPPONENT',speed,true,soundPan(f));impactIndicators.add(glove.position,0,speed,'contact');combatFX.hit(glove.position,Math.min(.55,speed/18),'block',glove.velocity);});}fighters.push(f);return f;
}
const player=makeFighter(-1.1,'#cf9b58','#bc927a',Math.PI/2),enemy=makeFighter(1.1,'#658da4','#957561',-Math.PI/2);
const referee=createReferee(scene);
const underground=createUnderground(scene,renderer);
const story=createStory({scene,player,enemy,light,underground,audio:fightAudio,onArena(active){arena=active?underground:stadiumArena;}});
const connectedFigures=fighters.map(f=>createConnectedFigure(scene,f));
const cinematics=createCinematics(scene,player,enemy,referee,fightAudio);
const cameraFocus=new THREE.Vector3(0,1.05,0),cameraBase=new THREE.Vector3(4.8,3.3,6.4);
function followCamera(dt){
 const a=(multiplayer?.guest?enemy:player).hips.b.position,b=(multiplayer?.guest?player:enemy).hips.b.position,distance=Math.hypot(a.x-b.x,a.z-b.z);
 const target=new THREE.Vector3(a.x*.65+b.x*.35,1.12,a.z*.65+b.z*.35);
 cameraFocus.lerp(target,1-Math.exp(-dt*5));
 const zoom=Math.max(.7,Math.min(1.15,.7+Math.max(0,distance-1.2)*.1));
 const framing=Math.max(1,.9/camera.aspect);const desired=cameraFocus.clone().add(new THREE.Vector3(4.8*zoom*framing,2.6*zoom*framing,6.4*zoom*framing));
 cameraBase.lerp(desired,1-Math.exp(-dt*4));camera.position.copy(cameraBase);
 const kick=combatFX.cameraOffset();camera.position.x+=kick.x;camera.position.y+=kick.y;camera.lookAt(cameraFocus);camera.rotateZ(kick.roll);
}
function quaternion(x,y,z){const q=new C.Quaternion();q.setFromEuler(x,y,z,'YXZ');return q;}
function armOrientation(direction,heading){
 // Keep a consistent roll reference instead of the ambiguous shortest rotation
 // from a downward arm to an upward forearm.
 const y=new THREE.Vector3(-direction.x,-direction.y,-direction.z).normalize();
 const z=new THREE.Vector3(Math.sin(heading),0,Math.cos(heading));z.addScaledVector(y,-z.dot(y));
 if(z.lengthSq()<.01){z.set(Math.cos(heading),0,-Math.sin(heading));z.addScaledVector(y,-z.dot(y));}
 z.normalize();const x=new THREE.Vector3().crossVectors(y,z).normalize();z.crossVectors(x,y);
 const q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));return new C.Quaternion(q.x,q.y,q.z,q.w);
}
function servo(body,target,strength,max){const inv=body.quaternion.conjugate();const error=target.mult(inv);if(error.w<0){error.x*=-1;error.y*=-1;error.z*=-1;}const torque=v(error.x*strength-body.angularVelocity.x*strength*.075,error.y*strength-body.angularVelocity.y*strength*.075,error.z*strength-body.angularVelocity.z*strength*.075);const len=torque.length();if(len>max)torque.scale(max/len,torque);body.torque.vadd(torque,body.torque);}
function soundPan(f){const dx=f.hips.b.position.x-cameraFocus.x,dz=f.hips.b.position.z-cameraFocus.z;return Math.max(-.7,Math.min(.7,(dx*.8-dz*.6)*.18));}
function punch(f,i,force=1,kind='hook'){if(clock<f.cool[i]||clock<f.down||f.health<=0||clock-f.punch[1-i]<.52)return false;f.punch[i]=clock;f.punchYaw[i]=f.yaw;f.punchPower[i]=force;f.punchKind[i]=kind;f.cool[i]=clock+.82;fightAudio.swing(f.voice||'OPPONENT',i,force,soundPan(f));return true;}
function pushFight(f){
 const opponent=f===player?enemy:player;if(matchFlow.phase!=='playing'||((story.active||multiplayer?.active)&&clock<3)||f.health<=0||opponent.health<=0||clock<(f.pushCooldown||0)||clock<(opponent.pushCooldown||0))return false;
 const a=f.hips.b.position,b=opponent.hips.b.position,dx=b.x-a.x,dz=b.z-a.z,distance=Math.hypot(dx,dz);if(distance>.9||Math.abs(a.y-b.y)>.45)return false;
 const direction=distance>.02?v(dx/distance,0,dz/distance):v(Math.sin(f.yaw),0,Math.cos(f.yaw));
 for(const [boxer,sign] of [[f,-1],[opponent,1]]){boxer.pushDirection=direction.scale(sign);boxer.pushUntil=clock+.26;boxer.pushStart=clock;boxer.pushCooldown=clock+1.4;boxer.punch=[-10,-10];boxer.cool=[clock+.4,clock+.4];for(const p of boxer.parts)p.b.applyImpulse(v(direction.x*sign*1.8*p.b.mass,.24*p.b.mass,direction.z*sign*1.8*p.b.mass));}
 pendingAttack=remoteAttack=null;document.querySelector('#message').textContent='PUSH OFF · FIND YOUR RANGE';return true;
}
function guardTap(){const now=performance.now();if(now-lastGuardTap<330&&clock-lastGuardClock<.33){lastGuardTap=lastGuardClock=-Infinity;if(multiplayer?.guest)multiplayer.push();else pushFight(player);}else{lastGuardTap=now;lastGuardClock=clock;}}
function requestAttack(hand,force=1,touchKind=null){if(matchFlow.phase!=='playing'||(story.active||multiplayer?.active)&&clock<3)return;const kind=touchKind||(keys.has('KeyG')?'uppercut':keys.has('KeyF')?'hook':'straight');if(multiplayer?.guest){multiplayer.punch(hand,kind);return;}if(!punch(player,hand,force,kind))pendingAttack={hand,force,kind,expires:clock+.3};else pendingAttack=null;}
function footwork(f,dt,moveX,moveZ){
 const heading=f.yaw+f.bodyTurn*.8,gait=f.gait,hips=f.hips.b,speed=Math.hypot(moveX,moveZ),sin=Math.sin(heading),cos=Math.cos(heading);
 const home=i=>{const side=i===0?-1:1;return v(hips.position.x+side*PHYSICS.stanceWidth*cos+sin*(i===0?.1:-.1),.075,hips.position.z-side*PHYSICS.stanceWidth*sin+cos*(i===0?.1:-.1));};
 if(gait.swing<0){let chosen=gait.next;const drift=gait.feet.map((p,i)=>{const h=home(i);return Math.hypot(p.x-h.x,p.z-h.z);});
   if(speed>.1||Math.max(...drift)>.22&&clock-Math.max(...f.punch)>.6){if(speed<=.1)chosen=drift[0]>drift[1]?0:1;gait.swing=chosen;gait.elapsed=0;gait.from=gait.feet[chosen].clone();gait.to=home(chosen);gait.to.x+=moveX*.27;gait.to.z+=moveZ*.27;}
 }
 if(gait.swing>=0){gait.elapsed+=dt;const t=Math.min(1,gait.elapsed/PHYSICS.stepTime),smooth=t*t*(3-2*t);
   if(t<.65){const landing=home(gait.swing);landing.x+=moveX*.27;landing.z+=moveZ*.27;gait.to.lerp(landing,1-Math.exp(-dt*12),gait.to);}
   gait.from.lerp(gait.to,smooth,gait.feet[gait.swing]);gait.feet[gait.swing].y=.075+Math.sin(Math.PI*t)*PHYSICS.stepLift;
   if(t>=1){gait.feet[gait.swing].y=.075;gait.next=1-gait.swing;gait.swing=-1;gait.steps++;fightAudio.step(f.voice||'OPPONENT',soundPan(f));}
 }
 let support=0;
 for(let i=0;i<2;i++){const id=i===0?'L':'R',foot=f['foot'+id].b,goal=gait.feet[i],swing=gait.swing===i;
   const error=goal.vsub(foot.position),force=v(error.x*(swing?850:2600)-foot.velocity.x*(swing?38:110),error.y*(swing?1100:650)-foot.velocity.y*40,error.z*(swing?850:2600)-foot.velocity.z*(swing?38:110));
   const length=force.length();if(length>700)force.scale(700/length,force);foot.applyForce(force);
   if(!swing&&foot.position.y<.18)support++;
   // Bend both leg segments toward the raised ankle, with knees facing forward.
 const hip=hips.pointToWorldFrame(v(i===0?-.095:.095,-.12,0));const ankle=goal.vadd(v(-sin*.065,.065,-cos*.065));const axis=ankle.vsub(hip);const distance=Math.min(.895,Math.max(.15,axis.length()));axis.normalize();
 const along=(.46*.46-.44*.44+distance*distance)/(2*distance),mid=hip.vadd(axis.scale(along));let pole=v(sin,0,cos);pole= pole.vsub(axis.scale(pole.dot(axis)));pole.normalize();const knee=mid.vadd(pole.scale(Math.sqrt(Math.max(0,.46*.46-along*along))));
   const upper=knee.vsub(hip),lower=ankle.vsub(knee);upper.normalize();lower.normalize();
   const yawPose=quaternion(0,heading,0),uq=new C.Quaternion().setFromVectors(v(0,-1,0),upper).mult(yawPose),lq=new C.Quaternion().setFromVectors(v(0,-1,0),lower).mult(yawPose);
   servo(f['thigh'+id].b,uq,180,85);servo(f['shin'+id].b,lq,165,75);servo(foot,quaternion(swing?-.15*Math.sin(gait.elapsed/PHYSICS.stepTime*Math.PI):0,heading+f.bodyTurn*(i===0?.28:.18),0),f.bodyTurn?110:85,f.bodyTurn?52:40);
 }
 return support;
}
function control(f,dt,moveX,moveZ,guard,lean,dodgeInput=0){
 const hips=f.hips.b,torso=f.torso.b;const up=torso.quaternion.vmult(v(0,1,0));if(f.health<=0)f.down=clock+2.5;const active=clock>f.down&&f.health>0;
 if(!active)return;if(clock<(f.pushUntil||0)){moveX=f.pushDirection.x*2.2/PHYSICS.walkSpeed;moveZ=f.pushDirection.z*2.2/PHYSICS.walkSpeed;}f.guard+=(Number(guard)-f.guard)*Math.min(1,dt*18);f.dodge+=(dodgeInput-f.dodge)*(1-Math.exp(-dt*24));f.stagger=Math.max(0,f.stagger-dt*1.65);f.phase+=dt*Math.hypot(moveX,moveZ)*9;
 const sway=Math.sin(clock*17)*f.stagger*.055,firmness=1-f.stagger*.65;
 let twist=0,commit=0,hipTwist=0,loaded=0,dip=0,hookFollow=0,hookSide=0;for(let i=0;i<2;i++){const age=clock-f.punch[i];if(age>=0&&age<.82){const side=i===0?1:-1;if(f.punchKind[i]==='uppercut')dip=Math.max(dip,age<.18?Math.sin(age/.18*Math.PI/2)*.065:age<.46?.065*(1-(age-.18)/.28):0);let turn;
   if(age<.18)turn=-.55*Math.sin(age/.18*Math.PI/2);
   else if(age<.46){const t=(age-.18)/.28;turn=-.55+1.8*(t*t*(3-2*t));}
   else if(age<.6)turn=1.25;
   else{const t=(age-.6)/.22;turn=1.25*(1-t*t*(3-2*t));}
   turn*=f.punchKind[i]==='straight'?.48:f.punchKind[i]==='uppercut'?.64:1;twist+=side*turn;hipTwist+=side*(age<.18?turn*1.10:age<.46?Math.min(1.28,turn+.18):turn*.86);loaded+=side*Math.sin(Math.min(1,age/.46)*Math.PI)*.045;commit=Math.max(commit,age>.18&&age<.46?Math.sin((age-.18)/.28*Math.PI):0);
 }}
 // A hook carries the weight diagonally down after contact, then recovers slowly.
 for(let i=0;i<2;i++){
  const age=clock-f.punch[i];if(f.punchKind[i]!=='hook'||age<.46||age>=1.32||f.punch[1-i]>f.punch[i])continue;
  const smooth=t=>t*t*(3-2*t),follow=age<.68?smooth((age-.46)/.22):age<.86?1:1-smooth((age-.86)/.46);
  hookFollow=Math.max(hookFollow,follow);hookSide+=(i===0?1:-1)*follow;
 }
 if(f.telegraph)twist+=(f.telegraph.hand===0?-1:1)*.23;
 f.bodyTurn=twist;
 const pitch=(lean?.28:.05)+f.guard*.12+commit*.13+hookFollow*.34;
 const dodgeRoll=-f.dodge*.86+hookSide*.20;
 const target=quaternion(pitch+sway+f.recoilPitch*f.stagger,f.yaw+twist,sway*.6-twist*.08+f.recoilRoll*f.stagger+dodgeRoll);servo(torso,target,(f.dodge?820:650)*balance()*firmness,f.dodge?360:290);servo(hips,quaternion(.025,f.yaw+hipTwist,-twist*.035+f.dodge*.06),(twist?740:480)*balance()*firmness,twist?310:220);servo(f.head.b,quaternion(pitch+f.guard*.48+commit*.16+f.recoilPitch*f.stagger,f.yaw+twist*.94,dodgeRoll*.8),95*firmness,45);
 const response=1-Math.exp(-dt*(Math.hypot(moveX,moveZ)>.1?15:24));f.move.x+=(moveX-f.move.x)*response;f.move.z+=(moveZ-f.move.z)*response;moveX=f.move.x;moveZ=f.move.z;
 const support=footwork(f,dt,moveX,moveZ);const bob=f.gait.swing<0?0:Math.sin(f.gait.elapsed/PHYSICS.stepTime*Math.PI)*.025;
 const lift=280+(1.10+bob-dip-hookFollow*.065-commit*.035-Math.abs(f.dodge)*.10-hips.position.y)*1500-hips.velocity.y*145;hips.applyForce(v(0,Math.min(950,Math.max(-100,lift))*balance(),0));
 const speedScale=(1-hookFollow*.18)*(1-Math.abs(f.dodge)*.18)*(1-f.guard*.24)*(1-commit*.35)*(1-f.stagger*.3);const walking=v((moveX*PHYSICS.walkSpeed*speedScale-hips.velocity.x)*360,0,(moveZ*PHYSICS.walkSpeed*speedScale-hips.velocity.z)*360);if(support){hips.applyForce(walking.scale(.45));torso.applyForce(walking.scale(.55));}
 // Keep the centre of mass over the step corridor, rather than dragging the hips away from the feet.
 const feet=f.gait.feet,baseX=(feet[0].x+feet[1].x)/2,baseZ=(feet[0].z+feet[1].z)/2;
 const offset=v(baseX+moveX*.13+Math.cos(f.yaw)*loaded+Math.sin(f.yaw)*commit*.045-hips.position.x,0,baseZ+moveZ*.13-Math.sin(f.yaw)*loaded+Math.cos(f.yaw)*commit*.045-hips.position.z),excess=Math.max(0,offset.length()-.16);
 if(excess>0){offset.normalize();hips.applyForce(offset.scale(Math.min(220,excess*900)*firmness));}
 if(Math.hypot(moveX,moveZ)<.1)hips.applyForce(v(-hips.velocity.x*160,0,-hips.velocity.z*160));if(support&&commit){const transfer=v(Math.sin(f.yaw)*85*commit,0,Math.cos(f.yaw)*85*commit);torso.applyForce(transfer);hips.applyForce(transfer.scale(-.25));}
 for(let i=0;i<2;i++){const id=i===0?'L':'R',s=i===0?-1:1;
 const age=clock-f.punch[i],swing=age>=0&&age<.82,kind=f.punchKind[i];
 // Drive the glove through a broad horizontal arc using forces, never teleporting it.
 let localX=s*.205,localZ=.19,height=.015,heading=f.yaw+twist;
 if(swing&&kind==='hook'){heading=f.punchYaw[i]+twist*.24;let angle,radius;
   if(age<.18){const t=age/.18;angle=.25-t*.55;radius=.46+t*.25;}
   else if(age<.46){const t=(age-.18)/.28;angle=-.3+t*2.35;radius=.80;}
   else if(age<.6){angle=2.05;radius=.73;}
   else{const t=(age-.6)/.22;angle=2.05+(.78-2.05)*t;radius=.73+(.36-.73)*t;}
   localX=s*Math.cos(angle)*radius;localZ=Math.sin(angle)*radius;height=age<.18?.015+(.30-.015)*(Math.min(1,age/.12)):age<.6?.30:.30*(1-(age-.6)/.22);
 }
 // Straight: shoulder-led extension. Uppercut: load low and drive up under the chin.
 if(swing&&kind!=='hook'){
  heading=f.punchYaw[i]+twist*.16;
  const smooth=t=>t*t*(3-2*t),strike=smooth(Math.max(0,Math.min(1,(age-.18)/.24))),recover=smooth(Math.max(0,Math.min(1,(age-.52)/.30)));
  if(kind==='straight'){
   const load=Math.min(1,age/.18);localX=s*(.205-.12*strike)*(1-recover)+s*.205*recover;
   localZ=(.19-.055*load+.69*strike)*(1-recover)+.19*recover;
   height=(.015+.265*load)*(1-recover)+.015*recover;
  }else{
   const load=smooth(Math.min(1,age/.18));localX=s*(.205-.065*strike);
   localZ=(.19+.065*load+.32*strike)*(1-recover)+.19*recover;
   height=(.015-.29*load+.80*strike)*(1-recover)+.015*recover;
  }
 }
 const sin=Math.sin(heading),cos=Math.cos(heading),hand=f['glove'+id].b;
 const goal=v(torso.position.x+localX*cos+localZ*sin,torso.position.y+height,torso.position.z-localX*sin+localZ*cos);
 if(!swing&&clock-(f.pushStart??-10)<.22){goal.copy(torso.pointToWorldFrame(v(s*.19,.08,.42)));}
 const otherAge=clock-f.punch[1-i],cover=Math.max(f.guard,otherAge>=0&&otherAge<.68?.92:0);
 if(!swing&&cover>0){const protectedPoint=f.head.b.pointToWorldFrame(v(s*.195,.22,.19));goal.lerp(protectedPoint,cover,goal);}
 if(!swing&&f.telegraph?.hand===i){const cue=f.head.b.pointToWorldFrame(v(s*(.24+Math.sin((clock-f.telegraph.start)*16)*.025),.03,.12));goal.copy(cue);}
 const shoulder=torso.pointToWorldFrame(v(s*.20,.14,0));
 const reach=goal.vsub(shoulder),distance=Math.max(.10,Math.min(swing&&kind==='hook'&&age>.16&&age<.6?.72:.765,reach.length()));reach.normalize();goal.copy(shoulder.vadd(reach.scale(distance)));
 // Solve the elbow from both real bone lengths, with its bend toward the ribs.
 const guide=torso.pointToWorldFrame(v(s*.29,-.24,.12)).vsub(shoulder);
 const pole=guide.vsub(reach.scale(guide.dot(reach)));if(pole.length()<.01)pole.copy(v(0,-1,0));pole.normalize();
 const along=(.4*.4-.38*.38+distance*distance)/(2*distance),bend=Math.sqrt(Math.max(0,.4*.4-along*along));
 // At contact the elbow and fist share a horizontal plane, while the arm remains bent.
 if(swing&&kind==='hook'&&age>.025&&age<.62&&bend>.025){
  const vertical=v(0,1,0).vsub(reach.scale(reach.y)),verticalLength=vertical.length();
  if(verticalLength>.05){vertical.normalize();const level=Math.max(-.98,Math.min(.98,(goal.y-shoulder.y-along*reach.y)/(bend*verticalLength)));let horizontal=reach.cross(v(0,1,0));horizontal.normalize();const outward=torso.quaternion.vmult(v(s,0,0));if(horizontal.dot(outward)<0)horizontal.scale(-1,horizontal);const raised=vertical.scale(level).vadd(horizontal.scale(Math.sqrt(1-level*level)));const blend=Math.min(1,(age-.025)/.055, (.62-age)/.04);pole.lerp(raised,blend,pole);pole.normalize();}
 }
 const elbow=shoulder.vadd(reach.scale(along)).vadd(pole.scale(bend));
 
 if(swing&&kind==='hook'&&age>.04&&age<.6){const upperBody=f['upper'+id].b,lever=upperBody.quaternion.vmult(v(0,-.2,0)),actualElbow=upperBody.position.vadd(lever),rise=Math.max(-30,Math.min(90,(elbow.y-actualElbow.y)*650-(upperBody.velocity.y-torso.velocity.y)*10));upperBody.applyForce(v(0,rise,0),lever);torso.applyForce(v(0,-rise*.18,0));}
 const delta=goal.vsub(hand.position),relative=hand.velocity.vsub(torso.velocity);
 const drive=delta.scale(swing?780*power()*f.punchPower[i]:guard?620:560).vsub(relative.scale(swing?17:24));const magnitude=drive.length();const forceLimit=swing?480:420;if(magnitude>forceLimit)drive.scale(forceLimit/magnitude,drive);
 hand.applyForce(drive);torso.applyForce(drive.scale(-.18));
 const upper=elbow.vsub(shoulder),fore=goal.vsub(elbow);upper.normalize();fore.normalize();
 servo(f['upper'+id].b,armOrientation(upper,heading),swing?155:52,swing?110:30);servo(f['fore'+id].b,armOrientation(fore,heading),swing?100:45,swing?65:27);servo(hand,armOrientation(fore,heading),12,8);
 }
}
function reset(){lastGuardTap=lastGuardClock=-Infinity;remoteAttack=null;guestSnapshot=null;touchControls.reset();referee.reset();clock=0;acc=0;for(const j of jointDots)j.dot.visible=debug;pendingAttack=null;combatFX.clear();impactIndicators.clear();contactIndicators.clear();hitPause=0;hitFlash=0;keys.clear();for(const f of fighters){const dx=f===player?-1.1:1.1;for(const p of f.parts){const initial=p.mesh.userData.initial;if(initial){p.b.position.copy(initial);p.b.position.x+=dx-f.x;}p.b.velocity.setZero();p.b.angularVelocity.setZero();p.b.quaternion.set(0,0,0,1);p.mesh.position.copy(p.b.position);p.mesh.quaternion.copy(p.b.quaternion);}f.health=100;f.pushCooldown=0;f.pushUntil=0;f.pushStart=-10;f.guard=0;f.dodge=0;f.slipTracks=[];f.counterUntil=0;f.counterEarned=Infinity;f.slips=0;f.blocks=0;f.stagger=0;f.recoilPitch=0;f.recoilRoll=0;f.bodyTurn=0;f.move.setZero();f.hit.clear();f.down=0;f.yaw=f===player?Math.PI/2:-Math.PI/2;f.punch=[-10,-10];f.punchPower=[1,1];f.punchKind=['hook','hook'];f.cool=[0,0];f.gait={feet:[f.footL.b.position.clone(),f.footR.b.position.clone()],swing:-1,next:0,elapsed:0,from:null,to:null,steps:0};}story.reset();document.querySelector('#message').textContent=story.active?(story.chapter===3?'THE BOILER ROOM / LATCH':story.chapter===2?'THE BOILER ROOM / TWO STEP':'THE BOILER ROOM / FIRST FIGHT'):'FREE SPARRING';}
for(const f of fighters)for(const p of f.parts){p.mesh.userData.initial=p.b.position.clone();p.mesh.position.copy(p.b.position);}
const matchFlow=createMatchFlow(fighters,camera,reset,referee.replayParts,story,cinematics,()=>multiplayer?.guest?enemy:player);
const touchControls=createTouchControls((hand,kind)=>requestAttack(hand,1,kind),guardTap);
multiplayer=createMultiplayer({onStart(){previousAI=ai;story.select('sparring');matchFlow.start();ai=false;document.querySelector('#opponent-name').textContent='FRIEND';document.querySelector('#fight-tag').textContent='MULTIPLAYER / '+document.querySelector('#party-code').textContent;document.querySelector('#message').textContent='FRIEND FIGHT';},onLeave(){ai=previousAI;matchFlow.home();document.querySelector('#menu-button').onclick=()=>matchFlow.home();document.querySelector('#return-menu').onclick=()=>matchFlow.home();},onPush(){pushFight(enemy);},onPunch(hand,kind){if(matchFlow.phase==='playing'&&clock>=3)remoteAttack={hand,kind,expires:clock+.3};}});
const syncedParts=[...fighters.flatMap(f=>f.parts),...referee.replayParts];
function localInput(f){
 let side=(keys.has('KeyA')?1:0)-(keys.has('KeyD')?1:0),forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),n=Math.max(1,Math.hypot(side,forward));side/=n;forward/=n;
 let x=forward*Math.sin(f.yaw)+side*Math.cos(f.yaw),z=forward*Math.cos(f.yaw)-side*Math.sin(f.yaw);const touch=touchControls.state;
 if(touch.x||touch.y){const dx=cameraFocus.x-camera.position.x,dz=cameraFocus.z-camera.position.z,length=Math.hypot(dx,dz)||1;x=(touch.y*dx-touch.x*dz)/length;z=(touch.y*dz+touch.x*dx)/length;}
 if(clock<3&&(story.active||multiplayer?.active))x=z=0;
 return {x,z,guard:keys.has('Space')||touch.guard,slip:Math.max(-1,Math.min(1,(keys.has('KeyE')?1:0)-(keys.has('KeyQ')?1:0)+touch.slip))};
}
function publishFight(){if(!multiplayer?.active||multiplayer.guest||multiplayer.canSendState===false)return;multiplayer.sendState({clock,phase:matchFlow.phase,message:document.querySelector('#message').textContent,poses:syncedParts.map(p=>[p.b.position.x,p.b.position.y,p.b.position.z,p.b.quaternion.x,p.b.quaternion.y,p.b.quaternion.z,p.b.quaternion.w]),fighters:fighters.map(f=>({health:f.health,yaw:f.yaw,punch:f.punch,punchKind:f.punchKind,dodge:f.dodge}))});}
function receiveFight(dt){
 const state=multiplayer.snapshot;if(state&&state!==guestSnapshot&&state.poses.length===syncedParts.length){guestSnapshot=state;clock=state.clock;
  syncedParts.forEach((p,i)=>{const pose=state.poses[i];p.b.position.set(...pose.slice(0,3));p.b.quaternion.set(...pose.slice(3));});
  fighters.forEach((f,i)=>{const previous=f.health;Object.assign(f,state.fighters[i]);if(f.health<previous){const damage=previous-f.health;impactIndicators.add(f.head.b.position,damage,Math.max(2,damage/3));fightAudio.impact(f.voice||'OPPONENT',Math.max(2,damage/3),false,soundPan(f));combatFX.hit(f.head.b.position,Math.min(1,damage/24),'hit',v());}});
  document.querySelector('#message').textContent=state.message;document.querySelector('#phealth').value=enemy.health;document.querySelector('#ehealth').value=player.health;matchFlow.record(clock);
 }
 const alpha=1-Math.exp(-dt*28);for(const p of syncedParts){p.mesh.position.lerp(p.b.position,alpha);p.networkRotation??=new THREE.Quaternion();p.networkRotation.set(p.b.quaternion.x,p.b.quaternion.y,p.b.quaternion.z,p.b.quaternion.w);p.mesh.quaternion.slerp(p.networkRotation,alpha);}
 followCamera(dt);combatFX.update(dt,camera,fighters,clock);impactIndicators.update(dt,camera);renderArena();
}
addEventListener('keydown',e=>{if(matchFlow.phase!=='playing'){if(e.code==='Escape'&&matchFlow.phase==='replay')matchFlow.finish();return;}if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='Space')guardTap();if(e.code==='ArrowLeft'||e.code==='ArrowRight')requestAttack(e.code==='ArrowLeft'?0:1);if(e.code==='KeyR'&&!multiplayer.active)matchFlow.start();});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();lastGuardTap=lastGuardClock=-Infinity;pendingAttack=null;});renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());renderer.domElement.addEventListener('pointerdown',e=>{if(matchFlow.phase!=='playing'||![0,2].includes(e.button)||e.pointerType==='touch')return;e.preventDefault();requestAttack(e.button===0?0:1);});document.querySelector('#reset').onclick=()=>{if(!multiplayer.active)matchFlow.start();};document.querySelector('#ai').onclick=e=>{ai=!ai;e.target.textContent='Opponent: '+(ai?'on':'off');};document.querySelector('#debug').onclick=()=>{debug=!debug;for(const j of jointDots)j.dot.visible=debug;};
function renderArena(){document.body.classList?.toggle('network-match',!!multiplayer?.active);publishFight();if(multiplayer?.active){const countdown=document.querySelector('#story-countdown');countdown.hidden=clock>=3||matchFlow.phase!=='playing';countdown.textContent=Math.ceil(3-clock);if(matchFlow.phase==='result'){document.querySelector('#rematch').onclick=()=>multiplayer.showRematch();document.querySelector('#rematch').textContent='RETURN TO PARTY';}document.querySelector('#menu-button').onclick=()=>multiplayer.leave();document.querySelector('#return-menu').onclick=()=>multiplayer.leave();}touchControls.setActive(matchFlow.phase==='playing');for(const figure of connectedFigures)figure.update();cinematics.updateAppearance();arena.render(camera,scene);}
let last=performance.now(),acc=0;function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;if(multiplayer?.active){if(multiplayer.guest)multiplayer.sendInput(localInput(enemy));if(multiplayer.paused){document.querySelector('#message').textContent='CONNECTION INTERRUPTED · RECONNECTING';renderArena();return;}if(multiplayer.guest&&['playing','knockout'].includes(matchFlow.phase)){receiveFight(dt);return;}}story.tick(dt,clock,matchFlow.phase);if(['menu','intro','outro','replay','result'].includes(matchFlow.phase)){matchFlow.update(dt);renderArena();return;}if(matchFlow.phase==='knockout'){keys.clear();pendingAttack=null;}hitFlash=Math.max(0,hitFlash-dt);if(hitPause>0){hitPause-=dt;followCamera(dt);combatFX.update(dt,camera,fighters,clock);impactIndicators.update(dt,camera);renderArena();return;}acc+=dt;while(acc>=PHYSICS_STEP){const step=PHYSICS_STEP;clock+=step;if(pendingAttack){if(clock>pendingAttack.expires)pendingAttack=null;else if(punch(player,pendingAttack.hand,pendingAttack.force,pendingAttack.kind))pendingAttack=null;}if(remoteAttack){if(clock>remoteAttack.expires)remoteAttack=null;else if(punch(enemy,remoteAttack.hand,1,remoteAttack.kind))remoteAttack=null;}
 const facing=Math.atan2(enemy.hips.b.position.x-player.hips.b.position.x,enemy.hips.b.position.z-player.hips.b.position.z);if(clock-Math.max(...player.punch)>.82)player.yaw+=Math.atan2(Math.sin(facing-player.yaw),Math.cos(facing-player.yaw))*Math.min(1,step*6);
 const input=localInput(player);control(player,step,input.x,input.z,input.guard,keys.has('ShiftLeft')||keys.has('ShiftRight'),input.slip);
 const dx=player.hips.b.position.x-enemy.hips.b.position.x,dz=player.hips.b.position.z-enemy.hips.b.position.z,dist=Math.hypot(dx,dz);let speed=0,enemyGuard=false,enemySide=0;
 if(!multiplayer?.active&&matchFlow.phase==='playing'&&(ai||story.active)){enemy.yaw=Math.atan2(dx,dz);if(story.active){const action=story.updateAI(clock,dist,punch);speed=action.speed;enemyGuard=action.guard;enemySide=action.side||0;}else{if(dist<1.65&&Math.sin(clock*4.1)>.88)punch(enemy,Math.sin(clock*2)>0?0:1);speed=dist>1.05?.65:dist<.7?-.4:0;enemyGuard=Math.sin(clock*1.7)>.5;}}
 if(multiplayer?.active){enemy.yaw=Math.atan2(dx,dz);const remote=performance.now()-multiplayer.remote.at<500?multiplayer.remote:{x:0,z:0,guard:false,slip:0};control(enemy,step,clock<3?0:remote.x,clock<3?0:remote.z,remote.guard,false,remote.slip);}else control(enemy,step,dx/Math.max(dist,.01)*speed+Math.cos(enemy.yaw)*enemySide,dz/Math.max(dist,.01)*speed-Math.sin(enemy.yaw)*enemySide,enemyGuard,false);world.step(step);if(matchFlow.phase==='playing'){for(const f of fighters){if(updateSlipCounter(f,f===player?enemy:player,clock)&&f===player)document.querySelector('#message').textContent='CLEAN SLIP · COUNTER NOW!';}}referee.update(step,fighters);acc-=step;matchFlow.record(clock);if(matchFlow.phase==='replay'){combatFX.clear();impactIndicators.clear();for(const j of jointDots)j.dot.visible=false;acc=0;break;}}
 for(const f of fighters){for(const p of f.parts){p.mesh.position.copy(p.b.position);p.mesh.quaternion.copy(p.b.quaternion);}if(f.health===0)document.querySelector('#message').textContent=(f===player?'YOU':'OPPONENT')+' KNOCKED OUT';}for(const {dot,j} of jointDots){dot.position.copy(j.bodyA.pointToWorldFrame(j.pivotA));}document.querySelector('#phealth').value=player.health;document.querySelector('#ehealth').value=enemy.health;document.querySelector('#message').style.color=hitFlash>0?'#fff4c0':'#c7b28e';followCamera(dt);combatFX.update(dt,camera,fighters,clock);impactIndicators.update(dt,camera);renderArena();}
requestAnimationFrame(animate);addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);arena.resize(innerWidth,innerHeight);});

























