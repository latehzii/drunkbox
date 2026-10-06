import {fighterIdentities,applyFighterIdentity} from './fighter-identities.js';
import * as THREE from './vendor/three.js';
import {createBasementAudio} from './basement-audio.js';

export function createStory({scene,player,enemy,light,underground,onArena,nextFight=null,audio=createBasementAudio()}){
 const $=s=>document.querySelector(s);let mode='sparring',chapter=1,nextAttack=5.5,warning=null,attacks=0,blocks=0,won=false,bellRung=false,followUp=null,exchange=0,secondWon=false,thirdWon=false,fourthWon=false,fifthWon=false,wallet=0,lastObservedSwing=-10,recoverUntil=0;
 $('#sound').onclick=e=>{e.target.textContent=audio.toggle()?'Sound: off':'Sound: on';};
 try{won=localStorage.getItem('drunkbox.boiler-room')==='won';}catch{}
 try{secondWon=localStorage.getItem('drunkbox.two-step')==='won';}catch{}
 try{thirdWon=localStorage.getItem('drunkbox.latch')==='won';}catch{}
 try{fourthWon=localStorage.getItem('drunkbox.bullfrog')==='won';}catch{}
 try{fifthWon=localStorage.getItem('drunkbox.meter')==='won';wallet=Math.max(0,Number(localStorage.getItem('drunkbox.wallet'))||0);}catch{}
 const originals=new Map();enemy.parts.forEach(p=>p.mesh.traverse(m=>{if(m.material?.color&&!originals.has(m.material))originals.set(m.material,m.material.color.clone());}));
 const accessories=new THREE.Group();enemy.head.mesh.add(accessories);
 const box=(parent,size,pos,color)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,roughness:1}));m.position.set(...pos);parent.add(m);return m;};
 box(accessories,[.11,.038,.012],[0,-.008,.18],'#dfd7b8');box(accessories,[.075,.015,.01],[0,-.067,.151],'#674c32');
 box(accessories,[.06,.025,.014],[-.065,.09,.157],'#e2dcc4');
 const outfit=new THREE.Group();enemy.hips.mesh.add(outfit);box(outfit,[.09,.10,.008],[.085,0,.119],'#c9b572');box(outfit,[.056,.067,.009],[.085,0,.126],'#53664b');
 const patches=[];for(const id of ['L','R']){const group=new THREE.Group();enemy['thigh'+id].mesh.add(group);box(group,[.022,.22,.165],[-.06,.1,0],'#c2a667');patches.push(group);}
 const leonDetails=new THREE.Group();enemy.head.mesh.add(leonDetails);box(leonDetails,[.29,.07,.30],[0,.12,0],'#28211f');box(leonDetails,[.08,.026,.017],[.065,.064,.158],'#372725');
 const leonTrim=[];for(const id of ['L','R']){const g=new THREE.Group();enemy['thigh'+id].mesh.add(g);box(g,[.018,.23,.17],[-.065,.09,0],'#c7bfb0');box(g,[.045,.025,.008],[.028,.14,.087],'#a48270');leonTrim.push(g);}
 const nicoDetails=new THREE.Group();enemy.head.mesh.add(nicoDetails);box(nicoDetails,[.29,.055,.30],[0,.12,0],'#171f24');box(nicoDetails,[.012,.10,.01],[-.11,.07,.156],'#e2c8a7');
 const nicoTrim=[];for(const id of ['L','R']){const g=new THREE.Group();enemy['thigh'+id].mesh.add(g);box(g,[.022,.23,.17],[-.065,.09,0],'#d1ae69');box(g,[.05,.04,.009],[.025,.13,.088],'#d1ae69');nicoTrim.push(g);}
 const otisDetails=new THREE.Group();enemy.head.mesh.add(otisDetails);
 for(const side of [-1,1]){const moustache=new THREE.Mesh(new THREE.SphereGeometry(.04,12,8),new THREE.MeshStandardMaterial({color:'#452a20',roughness:1}));moustache.scale.set(1,.4,.38);moustache.position.set(side*.025,-.048,.156);otisDetails.add(moustache);}
 box(otisDetails,[.052,.02,.012],[.045,.068,.146],'#452a20');
 const otisTrim=[];for(const id of ['L','R']){const g=new THREE.Group();enemy['thigh'+id].mesh.add(g);box(g,[.028,.21,.17],[-.07,.09,0],'#ffd45e');otisTrim.push(g);}
 const curls=new THREE.Group();enemy.head.mesh.add(curls);for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.055,12,8),new THREE.MeshStandardMaterial({color:'#211a1c'}));m.position.set((i-2)*.045,.16+Math.sin(i)*.012,0);curls.add(m);}
 const vinceDetails=new THREE.Group();enemy.head.mesh.add(vinceDetails);box(vinceDetails,[.22,.035,.014],[0,-.082,.145],'#493126');box(vinceDetails,[.035,.11,.02],[-.117,-.027,.125],'#493126');box(vinceDetails,[.035,.11,.02],[.117,-.027,.125],'#493126');
 const vinceTrim=[];for(const id of ['L','R']){const g=new THREE.Group();enemy['thigh'+id].mesh.add(g);box(g,[.026,.23,.17],[-.065,.08,0],'#eee4cf');box(g,[.045,.045,.009],[.025,.14,.088],'#eaba56');vinceTrim.push(g);}
 const genericHair=enemy.head.mesh.children.find(c=>c.geometry?.parameters?.width>.26&&c.geometry.parameters.height<.12);
 const title=$('#story-state');title.textContent=won?'CHAPTER 01 · FIRST WIN EARNED':'CHAPTER 01 · YOUR FIRST FIGHT';
 function progress(){title.textContent=fifthWon?'FIGHT NIGHT WON · WALLET $'+wallet:fourthWon?'CHAPTER 05 · FIRST PAID FIGHT':thirdWon?'CHAPTER 04 · NEXT FIGHT UNLOCKED':secondWon?'CHAPTER 03 · NEXT FIGHT UNLOCKED':won?'CHAPTER 02 · NEXT FIGHT UNLOCKED':'CHAPTER 01 · YOUR FIRST FIGHT';$('#continue-story').hidden=!won||fifthWon;$('#continue-story').textContent=fourthWon?'FIGHT NIGHT · METER ↗':thirdWon?'NEXT FIGHT · BULLFROG ↗':secondWon?'NEXT FIGHT · LATCH ↗':'NEXT FIGHT · TWO STEP ↗';}
 progress();
 function select(next,number=1){mode=next;chapter=[1,2,3,4,5].includes(number)?number:1;const active=mode==='story';if(!active)audio.stop();underground.setChapter(chapter);underground.setEnabled(active);onArena(active);accessories.visible=outfit.visible=active&&chapter===1;patches.forEach(p=>p.visible=active&&chapter===1);leonDetails.visible=active&&chapter===2;leonTrim.forEach(p=>p.visible=active&&chapter===2);nicoDetails.visible=active&&chapter===3;nicoTrim.forEach(p=>p.visible=active&&chapter===3);
  vinceDetails.visible=active&&chapter===5;vinceTrim.forEach(p=>p.visible=active&&chapter===5);otisDetails.visible=active&&chapter===4;otisTrim.forEach(p=>p.visible=active&&chapter===4);curls.visible=active&&chapter===2;if(genericHair){genericHair.visible=!active||chapter!==4;genericHair.material.color.set(active?fighterIdentities[chapter-1].hair:'#29221c');}
  for(const [mat,color] of originals)mat.color.copy(color);applyFighterIdentity(enemy,active?fighterIdentities[chapter-1]:null);
  if(active){for(const name of ['hips','thighL','thighR','gloveL','gloveR'])enemy[name].mesh.material.color.set(fighterIdentities[chapter-1].shorts);}
  scene.background=active?new THREE.Color(chapter===5?'#122033':'#171b17'):null;scene.fog=new THREE.Fog(active?'#20231d':'#11191f',active?13:15,active?25:35);light.color.set(active?(chapter===5?'#fff0d5':'#ffd4a0'):'#ffe2b8');light.intensity=active?(chapter===5?2.4:1.7):2.2;
  $('#opponent-name').textContent=active?fighterIdentities[chapter-1].name:'OPPONENT';$('#fight-tag').textContent=active?`CHAPTER 0${chapter} / ${chapter===5?'SATURDAY SCRAPS':'THE BOILER ROOM'}`:'PLAYABLE PROTOTYPE / 01';$('#corner-tip').hidden=!active;$('#ai').hidden=active;$('#debug').hidden=active;$('#sound').hidden=false;player.voice='PLAYER';enemy.voice=active?fighterIdentities[chapter-1].voice:'OPPONENT';
 }
 function reset(){nextAttack=5.5;warning=null;followUp=null;exchange=0;lastObservedSwing=-10;recoverUntil=0;attacks=0;blocks=0;bellRung=false;enemy.telegraph=null;player.damageScale=mode==='story'?1.15:1;enemy.damageScale=mode==='story'?(chapter===5?.64:chapter===4?.61:chapter===3?.58:chapter===2?.52:.45):1;enemy.health=mode==='story'?(chapter===5?100:chapter===4?96:chapter===3?90:chapter===2?80:70):100;$('#ehealth').max=enemy.health;$('#story-countdown').hidden=mode!=='story';$('#corner-tip').textContent=chapter===5?'MARA / Jab, cross, then a breath. Slip the first. Respect the second.':chapter===4?'MARA / When he crouches, move your head. Then take your turn.':chapter===3?'MARA / Show him a swing. Catch him when he answers.':chapter===2?'MARA / He throws twice. Make him miss twice.':'MARA / Breathe. These are borrowed gloves, not borrowed courage.';}
 function updateAI(time,dist,punch){
  if(enemy.health<=0)return {speed:0,guard:false};
  if(time<3)return {speed:0,guard:false};
  if(chapter===5){
   if(followUp&&time>=followUp.fire){punch(enemy,followUp.hand,.73,'straight');followUp=null;enemy.telegraph=null;attacks++;recoverUntil=time+1.8;nextAttack=time+3.2;}
   if(warning&&time>=warning.fire){punch(enemy,warning.hand,.66,'straight');warning=null;enemy.telegraph=null;attacks++;exchange++;if(exchange%2===1)followUp={hand:1,start:time+.42,fire:time+.91,kind:'straight'};else{recoverUntil=time+1.8;nextAttack=time+3.2;}}
   if(followUp&&time>=followUp.start)enemy.telegraph=followUp;
   if(!warning&&!followUp&&time>=nextAttack&&dist<1.55){warning={hand:0,start:time,fire:time+.85,kind:'straight'};enemy.telegraph=warning;}
   return {speed:warning||followUp||time<recoverUntil?0:dist>1.15?.50:dist<.78?-.26:0,guard:!warning&&!followUp&&time>=recoverUntil&&Math.sin(time)>.05,side:!warning&&!followUp&&time>=recoverUntil?Math.sin(time*.65)*.12:0};
  }
  if(chapter===4){
   if(warning&&time>=warning.fire){punch(enemy,warning.hand,.74,warning.kind);attacks++;warning=null;enemy.telegraph=null;recoverUntil=time+2.15;nextAttack=time+3.25;}
   if(!warning&&time>=nextAttack&&dist<1.5){warning={hand:attacks%2,start:time,fire:time+1.0,kind:attacks%3===2?'hook':'uppercut'};enemy.telegraph=warning;}
   return {speed:warning||time<recoverUntil?0:dist>1.0?.46:dist<.68?-.22:0,guard:!warning&&time>=recoverUntil&&Math.sin(time)>.15,side:warning&&time<warning.start+.3?(warning.hand?-.12:.12):0};
  }
  if(chapter===3){
   const swing=Math.max(...player.punch),age=time-swing;
   const contact=[player.gloveL,player.gloveR].some(g=>enemy.hit.has(g.b.id+':'+swing));
   if(!warning&&time>=nextAttack&&dist<1.75&&swing>lastObservedSwing&&age>=.65&&age<1.1){lastObservedSwing=swing;if(!contact){warning={hand:attacks%2,start:time,fire:time+.55,counter:true};enemy.telegraph=warning;}}
   if(!warning&&time>=nextAttack+2.5&&dist<1.65){warning={hand:attacks%2,start:time,fire:time+.85,counter:false};enemy.telegraph=warning;}
   if(warning&&time>=warning.fire){punch(enemy,warning.hand,.70);attacks++;warning=null;enemy.telegraph=null;nextAttack=time+3.2;recoverUntil=time+1.9;lastObservedSwing=swing;}
   return {speed:warning||time<recoverUntil?0:dist>1.25?.45:dist<.82?-.28:0,guard:!warning&&time>=recoverUntil&&Math.sin(time*.9)>-.2,side:warning&&time<warning.start+.2?.18:0};
  }
  if(chapter===2){
   if(followUp&&time>=followUp.fire){punch(enemy,followUp.hand,.64);followUp=null;enemy.telegraph=null;attacks++;nextAttack=time+3.5;}
   if(warning&&time>=warning.fire){punch(enemy,warning.hand,.64);const hand=warning.hand;warning=null;enemy.telegraph=null;attacks++;exchange++;if(exchange%2===1){followUp={hand:1-hand,start:time+.55,fire:time+.96};nextAttack=time+4.46;}else nextAttack=time+3.5;}
   if(followUp&&time>=followUp.start)enemy.telegraph=followUp;
   if(!warning&&!followUp&&time>=nextAttack&&dist<1.65){warning={hand:exchange%2,start:time,fire:time+.85};enemy.telegraph=warning;}
   const recovering=!warning&&!followUp&&exchange>0&&time<nextAttack-1.0;
   return {speed:warning||followUp||recovering?0:dist>1.1?.43:dist<.72?-.3:0,guard:!warning&&!followUp&&!recovering&&Math.sin(time*1.15)>.35,side:warning&&time<warning.start+.32?(exchange%2?-.27:.27):0};
  }
  if(warning&&time>=warning.fire){punch(enemy,warning.hand,.58);enemy.telegraph=null;warning=null;attacks++;nextAttack=time+3.8;}
  if(!warning&&time>=nextAttack&&dist<1.6){const hand=attacks%4===3?0:1;warning={hand,start:time,fire:time+1};enemy.telegraph=warning;}
  const recovering=time<nextAttack-2.0&&attacks>0;
  return {speed:warning||recovering?0:dist>1.05?.38:dist<.70?-.28:0,guard:!warning&&!recovering&&Math.sin(time*.65)>.95};
 }
 function tick(dt,time,phase){
  if(mode!=='story')return;underground.update(dt);
  const countdown=$('#story-countdown');countdown.hidden=phase!=='playing'||time>3.5;countdown.textContent=time<3?String(Math.max(1,Math.ceil(3-time))):'FIGHT';
  if(phase!=='playing')return;
  if(time>=3&&!bellRung){bellRung=true;audio.bell();}
  if(chapter===5){$('#corner-tip').textContent=warning?'MARA / The jab is coming. Move your head.':followUp?'MARA / The cross follows. Keep that guard up.':time<recoverUntil?'MARA / Meter’s stopped. Go now.':'MARA / First paid card. Same two hands. Stay patient.';return;}
  if(chapter===4){$('#corner-tip').textContent=time<5?'MARA / Big shoulders. Short reach. Watch the dip.':warning?'MARA / He’s loading low. Slip now.':time<recoverUntil?'MARA / He’s catching his breath. Your turn.':'MARA / Get him to throw. Don’t stand on his toes.';return;}
  if(chapter===3){$('#corner-tip').textContent=time<5?'MARA / He waits for a miss. Make him show his hand.':warning?.counter?'MARA / Here comes the answer. Guard or slip.':warning?'MARA / He’s coming first. Keep your guard ready.':time<recoverUntil?'MARA / The latch is open. Step in and swing.':'MARA / One swing, then protect yourself. Don’t feed him a flurry.';return;}
  if(chapter===2){$('#corner-tip').textContent=time<5?'MARA / Same basement. One new trick. Watch for the second hand.':followUp?'MARA / Not yet. Here comes his second swing.':warning?'MARA / A little step, then a swing. Guard or slip.':exchange>0&&time<nextAttack-1?'MARA / Both hands are done. Now answer.':'MARA / Stay patient. His guard opens when he throws.';return;}
  let tip='MARA / Stay close enough to reach him. One clean swing beats a flurry.';
  if(time<5)tip='MARA / WASD to find your range. Mouse or arrow keys to punch. Hold F for a hook, G for an uppercut.';
  else if(warning)tip='MARA / He taps his glove before he throws. Space to guard. Q / E to slip.';
  else if(attacks>0&&time<nextAttack-1.8)tip='MARA / There’s your opening. He needs a breath after that swing. Answer now.';
  else if(enemy.blocks>0)tip='MARA / Don’t punch his gloves. Let him throw, then catch the opening.';
  if(player.blocks>blocks){blocks=player.blocks;tip='MARA / Good guard. Now give him something to think about.';}
  $('#corner-tip').textContent=tip;
 }
 function finish(loser){
  if(mode!=='story'){$('#story-epilogue').hidden=true;return;}
  const victory=loser!==player;$('#story-epilogue').hidden=false;$('#result-detail').textContent= victory?(chapter===5?'FIRST FIGHT NIGHT WIN · 5–0':chapter===4?'FOUR AMATEUR WINS · 4–0':chapter===3?'THREE AMATEUR WINS · 3–0':chapter===2?'TWO AMATEUR WINS · 2–0':'YOUR FIRST AMATEUR WIN · 1–0'):(chapter===5?'VINCE DOYLE WINS · YOU CAN TRY AGAIN':chapter===4?'OTIS BELL WINS · YOU CAN TRY AGAIN':chapter===3?'NICO REYES WINS · YOU CAN TRY AGAIN':chapter===2?'LEON WARD WINS · YOU CAN TRY AGAIN':'EDDIE MERCER WINS · YOU CAN TRY AGAIN');
  audio.bell();audio.stopVoices();
  if(victory&&chapter===5&&!fifthWon){wallet+=75;try{localStorage.setItem('drunkbox.wallet',String(wallet));}catch{}}
  $('#story-epilogue').textContent=victory?(chapter===5?'FIRST PURSE +$75 · WALLET $'+wallet+' · The hall knows your name now.':chapter===4?'Four wins. Otis puts your name on the neighbourhood card.':chapter===3?'Three wins. One last name on tonight’s card: Bullfrog.':chapter===2?'Two wins. This time, they remember your name.':'First win. Your name stays on the card.'):'The basement door is still open. Go again.';
  $('#result-chapter').textContent=`CHAPTER 0${chapter} / ${chapter===5?'SATURDAY SCRAPS':'THE BOILER ROOM'}`;$('#rematch').textContent=victory?'NEXT FIGHT ↗':'TRY AGAIN ↗';$('#rematch').hidden=victory&&(chapter===5||typeof nextFight!=='function');if(victory&&chapter<5&&typeof nextFight==='function')$('#rematch').onclick=nextFight;
  if(victory){won=true;title.textContent='CHAPTER 01 · FIRST WIN EARNED';try{localStorage.setItem('drunkbox.boiler-room','won');}catch{}}
  if(victory&&chapter===2){secondWon=true;try{localStorage.setItem('drunkbox.two-step','won');}catch{}}if(victory&&chapter===3){secondWon=thirdWon=true;try{localStorage.setItem('drunkbox.two-step','won');localStorage.setItem('drunkbox.latch','won');}catch{}}if(victory&&chapter===4){won=secondWon=thirdWon=fourthWon=true;try{for(const key of ['boiler-room','two-step','latch','bullfrog'])localStorage.setItem('drunkbox.'+key,'won');}catch{}}if(victory&&chapter===5){won=secondWon=thirdWon=fourthWon=fifthWon=true;try{for(const key of ['boiler-room','two-step','latch','bullfrog','meter'])localStorage.setItem('drunkbox.'+key,'won');}catch{}}progress();
 }
 select('sparring');
 return {get active(){return mode==='story';},get chapter(){return chapter;},get wallet(){return wallet;},get unlockedChapter(){return fourthWon?5:thirdWon?4:secondWon?3:won?2:1;},get attacks(){return attacks;},get warning(){return warning;},get followUp(){return followUp;},setNextFight(fn){nextFight=fn;},select,reset,updateAI,tick,finish,startAudio(){audio.unlock(mode==='story');}};
}
