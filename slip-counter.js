// Reward a close, physically avoided strike, never a distant miss or a block.
const distanceToSegment=(p,a,b)=>{
 const x=b.x-a.x,y=b.y-a.y,z=b.z-a.z,length=x*x+y*y+z*z;
 const t=length?Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y+(p.z-a.z)*z)/length)):0;
 return Math.hypot(p.x-a.x-x*t,p.y-a.y-y*t,p.z-a.z-z*t);
};
export function updateSlipCounter(defender,attacker,time){
 for(let hand=0;hand<2;hand++){
  const fired=attacker.punch[hand],age=time-fired,glove=attacker[hand?'gloveR':'gloveL'].b;
  const key=glove.id+':'+fired;
  let track=defender.slipTracks[hand];
  if(!track||track.key!==key)track=defender.slipTracks[hand]={key,previous:{...glove.position},threat:false,resolved:false};
  if(age>=.12&&age<=.62&&Math.abs(defender.dodge)>.4){
   const hips=defender.hips.b.position;
   for(const [part,height,radius] of [['head',.84,.30],['torso',.40,.28]]){
    const neutral={x:hips.x,y:hips.y+height,z:hips.z};
    const actual=defender[part].b.position;
    if(Math.hypot(actual.x-neutral.x,actual.z-neutral.z)>.22&&
       distanceToSegment(neutral,track.previous,glove.position)<radius&&
       distanceToSegment(actual,track.previous,glove.position)>radius+.035&&glove.velocity.length()>1.5)track.threat=true;
   }
  }
  if(age>.62&&!track.resolved){
   track.resolved=true;
   if(track.threat&&!defender.hit.has(key)&&defender.health>0){
    defender.counterEarned=time;defender.counterUntil=time+1.25;defender.slips++;
    return true;
   }
  }
  track.previous={...glove.position};
 }
 return false;
}
export function consumeCounter(attacker,hand,time){
 if(time<attacker.counterUntil&&attacker.punch[hand]>=attacker.counterEarned){attacker.counterUntil=0;return 1.5;}
 return 1;
}
