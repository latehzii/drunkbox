import * as THREE from './vendor/three.js';

export function impactStyle(damage,speed,kind='hit'){
 const intensity=Math.min(1,Math.max(0,damage/24,speed/13));
 const blocked=kind==='block';
 return {intensity,color:blocked?'#92d6ff':intensity>.72?'#ff6252':intensity>.38?'#ffbb58':'#ffe6af',size:Math.round(19+intensity*22),label:blocked?'BLOCKED':kind==='contact'?'HIT':damage<1?`−${damage.toFixed(1)}`:`−${Math.round(damage)}`,strength:blocked?'BLOCKED':intensity>.72?'HEAVY HIT':intensity>.38?'HARD HIT':'LIGHT HIT'};
}

export function createImpactIndicators(){
 const active=[],history=[],summary=document.querySelector('#last-hit');
 return {history,clear(){for(const effect of active)effect.element?.remove();active.length=0;history.length=0;if(summary)summary.hidden=true;},
   add(position,damage,speed,kind='hit'){
     const style=impactStyle(damage,speed,kind);history.push({damage,speed,kind,intensity:style.intensity});if(history.length>64)history.shift();
     if(summary&&kind!=='contact'){summary.hidden=false;summary.innerHTML=`<small>${style.strength}</small><strong>${style.label}</strong>`;summary.style.color=style.color;}
     if(!document.createElement)return;
     const element=document.createElement('div');element.className='impact-number';element.textContent=style.label;element.style.color=style.color;element.style.fontSize=style.size+'px';element.dataset.strength=style.intensity.toFixed(2);document.body.appendChild(element);
     active.push({element,position:new THREE.Vector3(position.x,position.y,position.z),age:0,intensity:style.intensity});
     if(active.length>18){active.shift().element.remove();}
   },update(dt,camera){camera.updateMatrixWorld();for(let i=active.length-1;i>=0;i--){const effect=active[i];effect.age+=dt;if(effect.age>1.05){effect.element.remove();active.splice(i,1);continue;}
     const p=effect.position.clone();p.y+=effect.age*.6;p.project(camera);const visible=p.z>-1&&p.z<1&&Math.abs(p.x)<1.2&&Math.abs(p.y)<1.2;
     effect.element.style.display=visible?'block':'none';effect.element.style.left=(p.x*.5+.5)*innerWidth+'px';effect.element.style.top=(-p.y*.5+.5)*innerHeight+'px';effect.element.style.opacity=Math.min(1,(1.05-effect.age)*3);effect.element.style.transform=`translate(-50%,-50%) scale(${1+Math.exp(-effect.age*13)*(.2+effect.intensity*.4)})`;
   }}
 };
}
