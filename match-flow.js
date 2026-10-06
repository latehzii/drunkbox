import * as THREE from './vendor/three.js';

// Replay stores the actual simulated poses; playback never changes physics bodies.
export function createMatchFlow(fighters,camera,onReset,extraParts=[],story=null,cinema=null,localFighter=()=>fighters[0]){
 const $=s=>document.querySelector(s),parts=[...fighters.flatMap(f=>f.parts),...extraParts];
 let phase='menu',history=[],clip=[],koTime=0,elapsed=0,loser=null,lastRecord=-Infinity;
 const menu=$('#main-menu'),end=$('#end-screen'),replay=$('#replay-screen'),hud=$('#hud');
 function show(next){phase=next;menu.hidden=next!=='menu';end.hidden=next!=='result';replay.hidden=!['knockout','replay'].includes(next);hud.hidden=next!=='playing';$('#story-intro').hidden=!['intro','outro'].includes(next);}
 function clear(){history=[];clip=[];elapsed=0;loser=null;lastRecord=-Infinity;}
 function start(){cinema?.stop();clear();onReset();show('playing');story?.startAudio();}
 function home(){cinema?.stop();clear();story?.select('sparring');onReset();show('menu');}
 function finish(immediate=false){if(story?.active&&cinema&&!immediate&&phase!=='outro'){show('outro');cinema.beginOutro(loser!==fighters[0]);return;}cinema?.stop();show('result');$('#result-title').textContent=loser===localFighter()?'KNOCKED OUT':'VICTORY';$('#result-detail').textContent=loser===localFighter()?'OPPONENT WINS BY KNOCKOUT':'YOU WIN BY KNOCKOUT';$('#result-time').textContent='FIGHT TIME '+Math.floor(koTime/60)+':'+String(Math.floor(koTime%60)).padStart(2,'0');$('#result-chapter').textContent='FIGHT NIGHT / FIGHT OVER';$('#rematch').textContent='REMATCH ↗';$('#rematch').hidden=false;$('#rematch').onclick=start;story?.finish(loser);}
 $('#start-match').onclick=()=>{story?.select('sparring');start();};$('#rematch').onclick=start;$('#return-menu').onclick=home;$('#menu-button').onclick=home;$('#skip-replay').onclick=()=>finish();
 function chapterIntro(number){cinema?.stop();clear();story?.select('story',number);onReset();show('intro');cinema?.beginIntro(number);story?.startAudio();}
 story?.setNextFight(()=>chapterIntro(story.chapter+1));
 $('#start-story').onclick=()=>chapterIntro(1);$('#continue-story').onclick=()=>chapterIntro(story.unlockedChapter);$('#begin-story').onclick=()=>phase==='outro'?finish(true):start();$('#intro-back').onclick=home;
 show('menu');
 function record(time){
  if(!['playing','knockout'].includes(phase))return;
  if(time-lastRecord>=1/60-.0001){history.push({time,poses:parts.map(p=>({position:new THREE.Vector3(p.b.position.x,p.b.position.y,p.b.position.z),quaternion:new THREE.Quaternion(p.b.quaternion.x,p.b.quaternion.y,p.b.quaternion.z,p.b.quaternion.w)}))});lastRecord=time;while(history.length&&history[0].time<time-6)history.shift();}
  if(phase==='playing'&&fighters.some(f=>f.health<=0)){loser=fighters.find(f=>f.health<=0);koTime=time;elapsed=0;show('knockout');$('#replay-label').textContent='KNOCKOUT';$('#replay-angle').textContent='THE FINISHING BLOW';}
  if(phase==='knockout'&&time>=koTime+1.6){clip=history.filter(s=>s.time>=koTime-1.7);elapsed=0;show('replay');}
 }
 const q=new THREE.Quaternion(),pos=new THREE.Vector3();
 function update(dt){
  if((phase==='intro'||phase==='outro')&&cinema){if(cinema.update(dt,camera)){if(phase==='intro')start();else finish(true);}return;}
  if(phase==='menu'||phase==='intro'){elapsed+=dt;camera.position.set(Math.sin(elapsed*.08)*7.8,3.7,Math.cos(elapsed*.08)*7.8);camera.lookAt(0,1,0);return;}
  if(phase!=='replay')return;
  elapsed+=dt;const duration=clip.at(-1).time-clip[0].time,passLength=duration/.48+.35,angle=Math.floor(elapsed/passLength);
  if(angle>=2){finish();return;}
  const time=Math.min(clip.at(-1).time,clip[0].time+(elapsed%passLength)*.48);
  let i=0;while(i<clip.length-2&&clip[i+1].time<time)i++;
  const a=clip[i],b=clip[i+1]||a,t=Math.min(1,Math.max(0,(time-a.time)/Math.max(.00001,b.time-a.time)));
  parts.forEach((p,n)=>{p.mesh.position.copy(pos.copy(a.poses[n].position).lerp(b.poses[n].position,t));p.mesh.quaternion.copy(q.copy(a.poses[n].quaternion).slerp(b.poses[n].quaternion,t));});
  const attacker=fighters.find(f=>f!==loser),focus=loser.torso.mesh.position.clone().lerp(attacker.torso.mesh.position,.45);focus.y=Math.max(.7,focus.y);
  const direction=attacker.hips.mesh.position.clone().sub(loser.hips.mesh.position);direction.y=0;if(direction.length()<.01)direction.set(1,0,0);direction.normalize();const side=new THREE.Vector3(-direction.z,0,direction.x);
  camera.position.copy(focus).addScaledVector(angle===0?side:direction,angle===0?3.5:3.8).addScaledVector(side,angle===0?0:-1.25);camera.position.y=focus.y+(angle===0?.75:2.3);camera.lookAt(focus);
  $('#replay-label').textContent='INSTANT REPLAY';$('#replay-angle').textContent=angle===0?'01 / RINGSIDE · 0.48×':'02 / CORNER CAMERA · 0.48×';$('#replay-progress').style.width=((elapsed%passLength)/passLength*100)+'%';
 }
 return {get phase(){return phase;},get koTime(){return koTime;},get sampleCount(){return history.length;},startChapter:chapterIntro,start,home,record,update,finish};
}
