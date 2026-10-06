export function createTouchControls(onPunch){
 const state={x:0,y:0,guard:false,slip:0,kind:'straight'};
 const root=document.querySelector('#touch-controls');let active=false,stickPointer=null;
 const holds=new Map();
 if(!root?.addEventListener)return {state,reset(){},setActive(){}};
 const stick=root.querySelector('.touch-stick'),knob=stick.querySelector('.stick-knob');
 const media=matchMedia('(any-pointer: coarse), (max-width: 900px)');
 const enabled=()=>document.documentElement.classList.toggle('touch-device',media.matches);
 enabled();media.addEventListener('change',enabled);
 function reset(){state.x=state.y=state.slip=0;state.guard=false;stickPointer=null;holds.clear();knob.style.transform='translate(-50%, -50%)';for(const button of root.querySelectorAll('.is-held'))button.classList.remove('is-held');}
 function release(e){if(e.pointerId===stickPointer){stickPointer=null;state.x=state.y=0;knob.style.transform='translate(-50%, -50%)';}holds.delete(e.pointerId);sync();}
 function sync(){state.guard=[...holds.values()].includes('guard');state.slip=Number([...holds.values()].includes('slip-right'))-Number([...holds.values()].includes('slip-left'));for(const button of root.querySelectorAll('[data-hold]'))button.classList.toggle('is-held',[...holds.values()].includes(button.dataset.hold));}
 function move(e){if(e.pointerId!==stickPointer)return;const rect=stick.getBoundingClientRect(),radius=rect.width*.34,dx=(e.clientX-rect.left-rect.width/2)/radius,dy=(e.clientY-rect.top-rect.height/2)/radius,length=Math.hypot(dx,dy),scale=1/Math.max(1,length);state.x=length<.12?0:dx*scale;state.y=length<.12?0:-dy*scale;knob.style.transform='translate(calc(-50% + '+state.x*radius+'px), calc(-50% - '+state.y*radius+'px))';}
 stick.addEventListener('pointerdown',e=>{if(!active||stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);move(e);});stick.addEventListener('pointermove',move);
 for(const button of root.querySelectorAll('[data-punch],[data-hold]'))button.addEventListener('pointerdown',e=>{if(!active)return;e.preventDefault();button.setPointerCapture(e.pointerId);if(button.dataset.punch!==undefined)onPunch(Number(button.dataset.punch),state.kind);else{holds.set(e.pointerId,button.dataset.hold);sync();}});
 for(const button of root.querySelectorAll('[data-kind]'))button.addEventListener('click',()=>{state.kind=button.dataset.kind;for(const choice of root.querySelectorAll('[data-kind]')){const chosen=choice===button;choice.classList.toggle('selected',chosen);choice.setAttribute('aria-pressed',String(chosen));}});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(event,release);
 addEventListener('blur',reset);addEventListener('resize',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 return {state,reset,setActive(value){if(active!==value){active=value;root.hidden=!value;reset();}}};
}
