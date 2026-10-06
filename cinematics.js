import {fighterIdentities} from './fighter-identities.js';
import {createConnectedFigure} from './connected-figure.js';
import * as THREE from './vendor/three.js';

// Authored story poses affect render meshes only. Match physics stays untouched.
export function createCinematics(scene,player,enemy,referee,audio=null){
 const $=s=>document.querySelector(s),up=new THREE.Vector3(0,1,0),down=new THREE.Vector3(0,-1,0);
 let time=0,mode='intro',active=false,lastShot=-1,chapter=1,lastLine='';
 const vec=(x,y,z)=>new THREE.Vector3(x,y,z),mix=(a,b,t)=>a.clone().lerp(b,THREE.MathUtils.smoothstep(t,0,1));
 const props=new THREE.Group();props.visible=false;scene.add(props);
 const fill=new THREE.DirectionalLight('#f3d8b1',.85);fill.position.set(-1,4,5);props.add(fill);
 props.add(new THREE.HemisphereLight('#e5dcc1','#334537',.7));
 const material=c=>new THREE.MeshStandardMaterial({color:c,roughness:.85});
 function box(parent,size,pos,color){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material(color));m.position.set(...pos);m.castShadow=true;parent.add(m);return m;}
 // Mara has a tracksuit, cap, ponytail and a towel over one shoulder.
 const coach={parts:[]};for(const [name,size,color] of [['hips',[.32,.24,.24],'#29382f'],['torso',[.38,.52,.25],'#465749'],['head',[.28,.32,.28],'#bc9579'],['upperL',[.11,.4,.12],'#465749'],['upperR',[.11,.4,.12],'#465749'],['foreL',[.10,.38,.11],'#465749'],['foreR',[.10,.38,.11],'#465749'],['gloveL',[.10,.13,.11],'#bc9579'],['gloveR',[.10,.13,.11],'#bc9579'],['thighL',[.14,.46,.16],'#29382f'],['thighR',[.14,.46,.16],'#29382f'],['shinL',[.12,.44,.14],'#29382f'],['shinR',[.12,.44,.14],'#29382f'],['footL',[.16,.13,.3],'#151f20'],['footR',[.16,.13,.3],'#151f20']]){const mesh=box(props,size,[0,0,0],color);coach[name]={mesh};coach.parts.push({mesh});}
 box(coach.head.mesh,[.31,.09,.32],[0,.135,0],'#202b23');box(coach.head.mesh,[.29,.025,.16],[0,.11,.20],'#202b23');box(coach.head.mesh,[.12,.24,.13],[0,-.10,-.18],'#362b24');
 for(const x of [-.06,.06])box(coach.head.mesh,[.024,.015,.01],[x,.02,.145],'#282923');
 box(coach.torso.mesh,[.06,.43,.015],[0,0,.13],'#c7c6a3');box(coach.torso.mesh,[.13,.39,.04],[-.10,.14,.15],'#d5cfb5');
 const can=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.14,16),material('#b7b89d'));props.add(can);box(can,[.09,.036,.01],[0,0,.056],'#6b7c50');
 const wrap=new THREE.Mesh(new THREE.TorusGeometry(.09,.014,8,24),material('#e0d7b8'));props.add(wrap);
 // Eddie returns as a spectator for the second amateur night.
 const eddie={parts:[]};for(const p of coach.parts){const mesh=p.mesh.clone();mesh.material=p.mesh.material.clone();mesh.material.color.set('#687750');props.add(mesh);const name=Object.keys(coach).find(k=>coach[k]?.mesh===p.mesh);eddie[name]={mesh};eddie.parts.push({mesh});}
 for(const name of ['torso','head'])eddie[name].mesh.clear();for(const name of ['torso','head','upperL','upperR','foreL','foreR','shinL','shinR'])eddie[name].mesh.material.color.set('#ba9475');for(const name of ['footL','footR'])eddie[name].mesh.material.color.set('#242723');box(eddie.head.mesh,[.024,.015,.012],[-.06,.025,.151],'#282923');box(eddie.head.mesh,[.024,.015,.012],[.06,.025,.151],'#282923');box(eddie.head.mesh,[.29,.07,.29],[0,.13,0],'#45352b');box(eddie.head.mesh,[.11,.038,.013],[0,-.008,.15],'#dfd7b8');eddie.head.mesh.material.color.set('#ba9475');
 const connectedCoach=createConnectedFigure(props,coach),connectedEddie=createConnectedFigure(props,eddie);
 function cardTexture(won,second=false,third=false,fourth=false){if(!document.createElement)return null;const c=document.createElement('canvas');c.width=512;c.height=384;const x=c.getContext('2d');x.fillStyle='#d4c69a';x.fillRect(0,0,512,384);x.fillStyle='#3e4938';x.font='bold 35px Arial';x.fillText('AMATEUR NIGHT',28,55);x.font='bold 52px Arial';x.fillText(won?(fourth?'YOU / 4–0':third?'YOU / 3–0':second?'YOU / 2–0':'YOU / 1–0'):'FIRST TIMER',28,165);x.font='26px Arial';x.fillText(won?(fourth?'THE NEIGHBOURHOOD IS NEXT.':third?'THE BASEMENT KNOWS.':second?'THEY KNOW YOUR NAME.':'FIRST WIN. EARNED.'):'THE BOILER ROOM',28,245);x.strokeStyle='#414b3c';x.lineWidth=3;x.strokeRect(12,12,488,360);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
 const cardMaps=[cardTexture(false),cardTexture(true),cardTexture(true,true),cardTexture(true,false,true),cardTexture(true,false,false,true)];const card=new THREE.Mesh(new THREE.PlaneGeometry(.52,.39),new THREE.MeshStandardMaterial({map:cardMaps[0],color:cardMaps[0]?'#ffffff':'#d4c69a',side:THREE.DoubleSide}));props.add(card);
 const origins={entry:vec(-2.2,-.6,5.7),stairs:vec(-2.1,-.5,3.55),corner:vec(-2,0,1.0),eddie:vec(1.85,0,-1.6),mara:vec(-3.4,-.6,1.0)};
 function pose(f,origin,yaw,{walk=0,guard=.2,turn=0,punch=0,punchHand=1,nod=0,hands=null,crouch=0}={}){
  const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,yaw,0));
  const shape=f.proportions,leg=shape?.leg||1,offset=1.075*(leg-1);
  const point=(x,y,z)=>vec(x*(shape?(y<=1.15?shape.hip:shape.chest):1),(y<=1.15?.075+(y-.075)*leg:y+offset)-crouch,z).applyQuaternion(rotation).add(origin);
  const set=(name,p,q)=>{f[name].mesh.position.copy(p);f[name].mesh.quaternion.copy(q||rotation);};
  const bodyQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(.04+crouch*.4,yaw+turn,0,'YXZ'));
  set('hips',point(0,1.15,0),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,yaw+turn*.7,0)));
  set('torso',point(0,1.53,0),bodyQ);set('head',point(0,1.96,.015),new THREE.Quaternion().setFromEuler(new THREE.Euler(nod,yaw+turn*.85,0,'YXZ')));
  function bone(name,a,b){set(name,a.clone().lerp(b,.5),new THREE.Quaternion().setFromUnitVectors(down,b.clone().sub(a).normalize()));}
  for(let i=0;i<2;i++){
   const id=i?'R':'L',s=i?1:-1,step=Math.sin(time*8+i*Math.PI)*walk;
   const hip=point(s*.095,1.04,0),ankle=point(s*.13,.14+Math.max(0,step)*.09,.065+step*.18);
   const knee=hip.clone().lerp(ankle,.51).add(vec(0,.015,.10+Math.abs(step)*.05).applyQuaternion(rotation));bone('thigh'+id,hip,knee);bone('shin'+id,knee,ankle);set('foot'+id,ankle.clone().add(vec(0,-.065,.065).applyQuaternion(rotation)));
   const shoulder=vec(s*.20*(shape?.chest||1),.14,0).applyQuaternion(bodyQ).add(f.torso.mesh.position);
   let hand=point(s*.205,1.55+guard*.27,.24+guard*.02);
   if(i===punchHand&&punch>0){const angle=-.3+punch*2.5;hand=point(s*Math.cos(angle)*.78,1.89,Math.sin(angle)*.78);}
   if(hands?.[i])hand.copy(hands[i]);
   const axis=hand.clone().sub(shoulder),distance=Math.min(.765,Math.max(.1,axis.length()));axis.normalize();hand.copy(shoulder).addScaledVector(axis,distance);
   const pole=point(s*.29,1.20,.16).sub(shoulder);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
   const along=(.4*.4-.38*.38+distance*distance)/(2*distance);const bend=Math.sqrt(Math.max(0,.4*.4-along*along));
   if(i===punchHand&&punch>0&&bend>.025){const vertical=up.clone().addScaledVector(axis,-axis.y),length=vertical.length();if(length>.05){vertical.normalize();const level=THREE.MathUtils.clamp((hand.y-shoulder.y-along*axis.y)/(bend*length),-.98,.98),horizontal=axis.clone().cross(up).normalize();if(horizontal.dot(vec(s,0,0).applyQuaternion(bodyQ))<0)horizontal.negate();pole.copy(vertical.multiplyScalar(level).addScaledVector(horizontal,Math.sqrt(1-level*level)));}}
   const elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,bend);
   bone('upper'+id,shoulder,elbow);bone('fore'+id,elbow,hand);set('glove'+id,hand,new THREE.Quaternion().setFromUnitVectors(down,hand.clone().sub(elbow).normalize()));
  }
 }
 function subtitle(speaker,text){$('#cinema-speaker').textContent=speaker;$('#cinema-line').textContent=text;const key=speaker+'|'+text;if(key!==lastLine){lastLine=key;if(speaker)audio?.speak(speaker,text);else audio?.stopVoices();}}
 function shot(index,title){$('#cinema-shot').textContent=title;if(index!==lastShot){lastShot=index;$('#cinema-fade').animate?.([{opacity:.85},{opacity:0}],{duration:450,easing:'ease-out'});}}
 function look(camera,position,target){camera.position.copy(position);camera.lookAt(target);}
 function updateIntro(camera){
  if(chapter===4)return updateFourthIntro(camera);
  if(chapter===3)return updateThirdIntro(camera);
  if(chapter===2)return updateSecondIntro(camera);
  pose(enemy,origins.eddie,-.5,{guard:.6,nod:Math.sin(time*2)*.04});pose(coach,origins.mara,Math.PI/2,{guard:0});
  $('#cinema-fighter').hidden=!(time>=10&&time<15);can.visible=time>=7&&time<10;wrap.visible=time>=3&&time<7;card.visible=false;
  if(time<3){shot(0,'01 / BELOW THE STREET');const p=time/3,position=mix(origins.entry,origins.stairs,p);pose(player,position,Math.PI,{walk:1});look(camera,position.clone().add(vec(2.0,1.85,3.0)),position.clone().add(vec(0,1.25,0)));subtitle('MARA','No entrance music down here.');}
  else if(time<7){shot(1,'02 / BORROWED GLOVES');const p=Math.min(1,(time-3)/1.1);pose(player,mix(origins.stairs,origins.corner,p),-Math.PI/2,{walk:p<1?.6:0,guard:0,hands:[vec(-2.44,1.40,1.0),vec(-2.3,1.55,1.2)]});
   pose(coach,origins.mara,Math.PI/2,{hands:[player.gloveL.mesh.position.clone().add(vec(-.08,-.02+Math.sin(time*9)*.025,.06)),player.gloveL.mesh.position.clone().add(vec(-.04,.03,-.06+Math.cos(time*9)*.035))],nod:.10+Math.sin(time*3)*.03});wrap.position.copy(player.gloveL.mesh.position);wrap.rotation.set(0,Math.PI/2,(time-3)*7);look(camera,vec(-4.5,2.2,2.5),vec(-2.65,1.45,1.0));subtitle('MARA',time<5?'Borrowed gloves. Your own courage.':'Just get back to your corner.');}
  else if(time<10){shot(2,'03 / A LITTLE LUCK');pose(player,origins.corner,-Math.PI/2,{guard:0});pose(enemy,origins.eddie,-.5,{guard:.35,nod:.13});can.position.copy(enemy.gloveL.mesh.position).add(vec(0,.13,0));can.rotation.z=Math.sin(time*4)*.12;look(camera,vec(1.2,2.2,1.15),enemy.head.mesh.position.clone().add(vec(0,-.2,0)));subtitle('EDDIE',time<8.5?'Fourth time’s the charm.':'Don’t dent my lucky can, yeah?');}
  else if(time<15){shot(3,'04 / YOUR FIRST OPPONENT');pose(player,origins.corner,-Math.PI/2,{guard:.3});const p=(time-10)/5,practice=THREE.MathUtils.clamp((p-.35)/.30,0,1);const punching=p>.35&&p<.8;
   const tap=enemy.head.mesh.position.clone().add(vec(.21+Math.sin(time*14)*.025,-.10,.12));pose(enemy,origins.eddie,-.5,{guard:.8,turn:punching?Math.sin(practice*Math.PI)*-.6:0,punch:punching?practice:0,nod:.05,hands:p<.35?[null,tap]:null});look(camera,vec(3.3+Math.sin(p*Math.PI)*.4,2.05,.45-p*.5),enemy.torso.mesh.position.clone().add(vec(0,.15,0)));subtitle('',p<.5?'A big right. A bigger tell.':'Watch the glove tap.');}
  else if(time<19){shot(4,'05 / ALL HEART');const p=(time-15)/2;const a=mix(origins.corner,vec(-.55,0,0),p),b=mix(origins.eddie,vec(.55,0,0),p);const touching=time>17;
   pose(player,a,Math.PI/2,{walk:p<1?.65:0,guard:.45,hands:touching?[vec(-.06,1.66,-.08),null]:null});pose(enemy,b,-Math.PI/2,{walk:p<1?.65:0,guard:.45,hands:touching?[vec(.06,1.66,-.08),null]:null});look(camera,vec(3.0,2.35,4.5),vec(0,1.4,0));subtitle('REFEREE','Keep it clean. Protect yourselves.');}
  else{shot(5,'06 / EARN YOUR NAME');const p=(time-19)/2;pose(player,mix(vec(-.55,0,0),vec(-1.1,0,0),p),Math.PI/2,{walk:p<1?.5:0,guard:.5});pose(enemy,mix(vec(.55,0,0),vec(1.1,0,0),p),-Math.PI/2,{walk:p<1?.5:0,guard:.5});look(camera,vec(4.3,3.0,5.6),vec(0,1.3,0));subtitle('MARA','Wait for the tap. Then answer.');}
  $('#cinema-progress').style.width=Math.min(100,time/22*100)+'%';return time>=22;
 }
 function updateSecondIntro(camera){
  can.visible=wrap.visible=card.visible=false;pose(coach,origins.mara,Math.PI/2,{guard:0});pose(eddie,vec(-3.6,-.6,3.65),.8,{guard:0});
  $('#cinema-fighter').hidden=!(time>=7&&time<12);
  const base=vec(1.55,0,-1.0);
  if(time<4){shot(0,'01 / BACK BELOW THE STREET');const position=mix(origins.entry,origins.stairs,time/4);pose(player,position,Math.PI,{walk:1});pose(enemy,base,-.7,{guard:.7});const wave=vec(-3.30,1.20,3.8+Math.sin(time*7)*.07);pose(eddie,vec(-3.6,-.6,3.65),.8,{hands:[null,wave],nod:Math.sin(time*4)*.08});look(camera,position.clone().add(vec(2,1.85,3)),position.clone().add(vec(-.4,1.25,0)));subtitle('EDDIE',time<2?'Hey! They kept your name on the card.':'Try not to dent this one.');}
  else if(time<7){shot(1,'02 / TWO STEPS AHEAD');pose(player,origins.corner,Math.PI/2,{guard:.3});const step=Math.sin((time-4)*Math.PI*1.5)*.25;pose(enemy,base.clone().add(vec(step,0,0)),-.7,{walk:.7,guard:.9,nod:.06});look(camera,vec(3.3,1.55,1.8),vec(1.55,1.0,-1));subtitle('MARA','Same ring. Different rhythm.');}
  else if(time<12){shot(2,'03 / LEON “TWO STEP” WARD');pose(player,origins.corner,Math.PI/2,{guard:.3});const age=(time-7)%2.4,hit=age>.6&&age<1.8;const swing=THREE.MathUtils.clamp((age-.6)/1.2,0,1);pose(enemy,base.clone().add(vec(age<.6?Math.sin(age/.6*Math.PI)*.22:0,0,0)),-.7,{walk:age<.6?.5:0,guard:.8,turn:hit?Math.sin(swing*Math.PI*2)*.5:0,punch:hit?(swing*2)%1:0,punchHand:swing<.5?1:0});look(camera,vec(3.6,2.1,.9),enemy.torso.mesh.position.clone().add(vec(0,.12,0)));subtitle('MARA',time<9.5?'He throws twice.':'Make him miss twice.');}
  else if(time<16){shot(3,'04 / NO BIG SPEECH');const p=(time-12)/2;pose(player,mix(origins.corner,vec(-.55,0,0),p),Math.PI/2,{walk:p<1?.6:0,guard:.45,hands:time>14?[vec(-.06,1.66,0),null]:null});pose(enemy,mix(base,vec(.55,0,0),p),-Math.PI/2,{walk:p<1?.6:0,guard:.45,hands:time>14?[vec(.06,1.66,0),null]:null});look(camera,vec(2.5,2.3,3.6),vec(0,1.5,0));subtitle('LEON',time<14?'Heard you can swing.':'Let’s see if you can wait.');}
  else{shot(4,'05 / FIND THE SECOND OPENING');const p=(time-16)/2;pose(player,mix(vec(-.55,0,0),vec(-1.1,0,0),p),Math.PI/2,{walk:p<1?.5:0,guard:.5});pose(enemy,mix(vec(.55,0,0),vec(1.1,0,0),p),-Math.PI/2,{walk:p<1?.5:0,guard:.7});look(camera,vec(4.3,3,5.6),vec(0,1.3,0));subtitle('MARA','Both hands. Then your turn.');}
  $('#cinema-progress').style.width=Math.min(100,time/19*100)+'%';return time>=19;
 }
 function updateThirdIntro(camera){
  can.visible=card.visible=false;wrap.visible=time<4;eddie.parts.forEach(p=>p.mesh.visible=false);
  const base=vec(1.65,0,-1.2);pose(coach,origins.mara,Math.PI/2,{guard:0});pose(player,origins.corner,Math.PI/2,{guard:.3});pose(enemy,base,-.7,{guard:1,nod:.12});
  $('#cinema-fighter').hidden=!(time>=8&&time<13);
  if(time<4){shot(0,'01 / LAST CALL AT THE BOILER ROOM');const clasp=base.clone().add(vec(-.15,1.72,.20));pose(enemy,base,-.7,{guard:1,nod:.15,hands:[clasp.clone().add(vec(-.055,Math.sin(time*8)*.02,0)),clasp.clone().add(vec(.055,0,.02))]});wrap.position.copy(clasp);wrap.rotation.set(0,0,time*2);look(camera,vec(2.4,2.1,1.1),enemy.torso.mesh.position.clone().add(vec(0,.24,0)));subtitle('NICO',time<2?'I fix locks on the night shift.':'Same rule in here. Wait for the click.');}
  else if(time<8){shot(1,'02 / LEARN TO ASK');const p=(time-4)/4,feint=p>.25&&p<.55;pose(player,origins.corner,Math.PI/2,{guard:.4,turn:feint?Math.sin((p-.25)/.3*Math.PI)*-.25:0,punch:feint?(p-.25)/.3*.35:0});pose(coach,origins.mara,Math.PI/2,{guard:.4,nod:Math.sin(time*3)*.06});look(camera,vec(-.5,2.1,3.6),vec(-2.35,1.45,1));subtitle('MARA',p<.5?'He doesn’t chase. He waits.':'Show him one swing. Then cover up.');}
  else if(time<13){shot(2,'03 / NICO “LATCH” REYES');const p=(time-8)%2.5,answer=p>1&&p<1.8,hit=THREE.MathUtils.clamp((p-1)/.8,0,1);pose(enemy,base.clone().add(vec(0,0,p<1?-Math.sin(p*Math.PI)*.12:0)),-.7,{guard:answer?.3:1,crouch:p<1?Math.sin(p*Math.PI)*.06:0,turn:answer?-Math.sin(hit*Math.PI)*.6:0,punch:answer?hit:0,nod:.13});look(camera,vec(.25,2.05,1.25),enemy.torso.mesh.position.clone().add(vec(0,.15,0)));subtitle('MARA',time<10.5?'Miss. Cover. Make him miss.':'Then the door opens.');}
  else if(time<17){shot(3,'04 / NOTHING PERSONAL');const p=(time-13)/2;pose(player,mix(origins.corner,vec(-.55,0,0),p),Math.PI/2,{walk:p<1?.6:0,guard:.5,hands:time>15?[vec(-.06,1.66,0),null]:null});pose(enemy,mix(base,vec(.55,0,0),p),-Math.PI/2,{walk:p<1?.6:0,guard:.8,hands:time>15?[vec(.06,1.66,0),null]:null});look(camera,vec(2.6,2.3,3.5),vec(0,1.5,0));subtitle('NICO',time<15?'Nothing personal.':'We both clock in tomorrow.');}
  else{shot(4,'05 / OPEN THE LATCH');const p=(time-17)/2;pose(player,mix(vec(-.55,0,0),vec(-1.1,0,0),p),Math.PI/2,{walk:p<1?.5:0,guard:.7});pose(enemy,mix(vec(.55,0,0),vec(1.1,0,0),p),-Math.PI/2,{walk:p<1?.5:0,guard:1,nod:.12});look(camera,vec(4.3,3,5.6),vec(0,1.3,0));subtitle('MARA','Make him answer. Then take your turn.');}
  $('#cinema-progress').style.width=Math.min(100,time/20*100)+'%';return time>=20;
 }

 function updateFourthIntro(camera){
  can.visible=wrap.visible=card.visible=false;eddie.parts.forEach(p=>p.mesh.visible=false);const base=vec(1.4,0,-1.1);pose(player,origins.corner,Math.PI/2,{guard:.3});pose(coach,origins.mara,Math.PI/2,{guard:0});pose(enemy,base,-.7,{guard:.4});$('#cinema-fighter').hidden=!(time>=7&&time<12);
  if(time<3.5){shot(0,'01 / ONE LAST NAME ON THE CARD');const p=time/3.5;pose(player,mix(origins.entry,origins.stairs,p),Math.PI,{walk:1});pose(enemy,base,-.7,{guard:.2,nod:Math.sin(time*3)*.10});look(camera,vec(-.7,2.1,5.3),vec(-1.3,1.2,3.7));subtitle('MARA','Three wins. Now the whole room is watching.');}
  else if(time<7){shot(1,'02 / THE LOADING-BAY LEGEND');const bounce=Math.abs(Math.sin((time-3.5)*3.2))*.075;pose(enemy,base.clone().add(vec(0,bounce,0)),-.7,{guard:.3,nod:.12,hands:[base.clone().add(vec(-.10,1.40+Math.sin(time*7)*.04,.28)),base.clone().add(vec(.02,1.40,.28))]});look(camera,vec(2.4,1.6,.7),enemy.torso.mesh.position.clone().add(vec(0,.05,0)));subtitle('OTIS',time<5.2?'I lift crates all day.':'You look lighter than a crate.');}
  else if(time<12){shot(2,'03 / OTIS “BULLFROG” BELL');const p=(time-7)%2.5,load=p<.85,rise=THREE.MathUtils.clamp((p-.85)/.55,0,1),hit=p>.85&&p<1.4;pose(enemy,base,-.7,{guard:load?.2:.5,crouch:load?Math.sin(p/.85*Math.PI/2)*.18:(1-rise)*.18,turn:hit?-Math.sin(rise*Math.PI)*.7:0,hands:hit?[null,base.clone().add(vec(-.14,1.1+rise*.83,.28+rise*.22))]:null});look(camera,vec(.2,1.65,1.2),enemy.torso.mesh.position.clone().add(vec(0,.15,0)));subtitle('MARA',time<9.4?'Short reach. Big engine.':'When he dips, move your head.');}
  else if(time<16){shot(3,'04 / CRATES DON’T HIT BACK');const p=(time-12)/2;pose(player,mix(origins.corner,vec(-.55,0,0),p),Math.PI/2,{walk:p<1?.6:0,guard:.45});pose(enemy,mix(base,vec(.55,0,0),p),-Math.PI/2,{walk:p<1?.6:0,guard:.45,nod:.08});look(camera,vec(2.6,2.3,3.4),vec(0,1.35,0));subtitle('OTIS',time<14?'Crates don’t hit back.':'Let’s see if you do.');}
  else{shot(4,'05 / WAIT FOR THE BIG EXHALE');const p=(time-16)/2;pose(player,mix(vec(-.55,0,0),vec(-1.1,0,0),p),Math.PI/2,{walk:p<1?.5:0,guard:.7});pose(enemy,mix(vec(.55,0,0),vec(1.1,0,0),p),-Math.PI/2,{walk:p<1?.5:0,guard:.6});look(camera,vec(4.3,3,5.6),vec(0,1.3,0));subtitle('MARA','Dodge the lift. Catch the breath.');}
  $('#cinema-progress').style.width=Math.min(100,time/19*100)+'%';return time>=19;
 }
 function updateOutro(camera){
  const victory=mode==='win';$('#cinema-fighter').hidden=true;can.visible=wrap.visible=false;eddie.parts.forEach(p=>p.mesh.visible=false);
  const winner=victory?player:enemy,loser=victory?enemy:player;
  pose(winner,vec(-.48,0,0),Math.PI/2,{guard:.2,nod:Math.sin(time*2)*.04});pose(loser,vec(.48,0,0),-Math.PI/2,{guard:.2,nod:.10});pose(coach,vec(-3.4,-.6,2.15),Math.PI/2,{guard:0});
  if(time<3){shot(0,'AFTER THE BELL');pose(winner,vec(-.48,0,0),Math.PI/2,{hands:[vec(-.06,1.53,0),null]});pose(loser,vec(.48,0,0),-Math.PI/2,{hands:[vec(.06,1.53,0),null],nod:.12});look(camera,vec(.8,2.1,2.9),vec(0,1.5,0));subtitle(chapter===4?'OTIS':chapter===3?'NICO':chapter===2?'LEON':'EDDIE',chapter===4?(victory?'Alright. You hit harder than a crate.':'Get your head out of the loading bay.'):chapter===3?(victory?'Found the opening. Fair play.':'You rushed the lock. Try again.'):chapter===2?(victory?'You waited. Good fight.':'Next time, wait for the second hand.'):(victory?'Guess I need a new lucky can.':'Took me four tries. You’ll get there.'));card.visible=false;}
  else{shot(1,victory?'YOUR NAME STAYS':'THE DOOR IS STILL OPEN');pose(player,origins.corner,-Math.PI/2,{guard:0,nod:.07});pose(coach,origins.mara,Math.PI/2,{guard:.35,hands:[null,vec(-3.1,1.55,.65)]});card.visible=true;card.material.map=cardMaps[victory?chapter:0];card.material.needsUpdate=true;card.position.copy(coach.gloveR.mesh.position).add(vec(.02,.15,0));const view=vec(-1.65,2.25,2.0);card.lookAt(view);card.rotateZ(Math.sin(time)*.02);look(camera,view,card.position.clone().add(vec(-.08,.1,0)));subtitle('MARA',victory?(chapter===4?'Four wins. Otis knows a promoter upstairs.':chapter===3?'Three wins. One last fight tonight.':chapter===2?'Two wins. They remember your name now.':'First win. That’s your name on the card.'):'Now we know his tell. We go again.');}
  $('#cinema-progress').style.width=Math.min(100,time/7*100)+'%';return time>=7;
 }
 function stop(){audio?.stopVoices();lastLine='';active=false;props.visible=false;can.visible=wrap.visible=card.visible=false;}
 return {updateAppearance(){if(!active)return;connectedCoach.update();connectedEddie.update();},get active(){return active;},get time(){return time;},get shot(){return lastShot;},beginIntro(number=1){chapter=number;time=0;lastShot=-1;lastLine='';mode='intro';active=true;props.visible=true;eddie.parts.forEach(p=>p.mesh.visible=chapter===2);$('#cinema-chapter').textContent=`CHAPTER 0${chapter} / THE BOILER ROOM`;$('#cinema-fighter .fighter-intro-label').textContent=chapter>1?'YOUR NEXT OPPONENT':'YOUR FIRST OPPONENT';const identity=fighterIdentities[chapter-1];$('#cinema-fighter h2').textContent='“'+identity.nick+'”';$('#cinema-fighter h3').textContent=identity.full;$('#cinema-fighter p').innerHTML='<b>'+identity.record+'</b> AMATEUR <span>'+Math.round(183+107.5*(identity.leg-1))+' CM · '+enemy.weightKg+' KG</span>';$('#cinema-fighter i').textContent=identity.tell;$('#begin-story').textContent='SKIP INTRO ↗';},beginOutro(victory){time=0;lastShot=-1;mode=victory?'win':'loss';active=true;props.visible=true;$('#begin-story').textContent='SKIP SCENE ↗';},stop,update(dt,camera){time+=dt;return mode==='intro'?updateIntro(camera):updateOutro(camera);}};
}
