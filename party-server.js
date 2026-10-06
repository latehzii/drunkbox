import {WebSocketServer} from 'ws';
import {randomBytes,randomInt} from 'node:crypto';
export function createPartyService(){
 const rooms=new Map(),sessions=new Map(),websockets=new WebSocketServer({noServer:true,maxPayload:40000});const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 const empty=()=>({x:0,z:0,guard:false,slip:0});
 const send=(slot,event)=>{const stream=slot?.stream;if(!stream)return;if(stream.send){if(stream.readyState===1&&stream.bufferedAmount<256000)stream.send(JSON.stringify(event));}else if(!stream.destroyed&&!stream.writableNeedDrain)stream.write('data: '+JSON.stringify(event)+'\n\n');};
 const end=slot=>{slot.stream?.end?.();slot.stream?.close?.();};
 const info=room=>({type:'party',code:room.code,playing:room.playing,players:room.slots.map(s=>s?{ready:s.ready,connected:!!s.stream}:null)});
 const broadcast=(room,event)=>room.slots.forEach(s=>s&&send(s,event));
 function remove(slot){const room=slot.room;room.slots[slot.role]=null;sessions.delete(slot.token);end(slot);room.playing=false;room.slots.forEach(s=>{if(s){s.ready=false;s.input=empty();}});if(slot.role===0){broadcast(room,{type:'closed',message:'The host left the party.'});room.slots.forEach(s=>{if(s){sessions.delete(s.token);end(s);}});rooms.delete(room.code);}else broadcast(room,info(room));}
 function makeSlot(room,role){const slot={token:randomBytes(24).toString('hex'),role,room,ready:false,input:empty(),actions:[],lastAction:0,lastInput:0,seen:Date.now(),stream:null};room.slots[role]=slot;sessions.set(slot.token,slot);return slot;}
 const reply=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 async function handle(req,res){
  const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/api/'))return false;
  if(req.headers.origin&&(()=>{try{return new URL(req.headers.origin).host!==req.headers.host;}catch{return true;}})()){reply(res,403,{error:'This request must come from the game website.'});return true;}
  let body={};if(req.method==='POST'){let text='';try{for await(const chunk of req){text+=chunk;if(text.length>40000)throw Error('too large');}body=JSON.parse(text||'{}');}catch{reply(res,400,{error:'Invalid request.'});return true;}}
  if(req.method==='POST'&&['/api/create','/api/join'].includes(url.pathname)){
   if(rooms.size>=500){reply(res,503,{error:'Parties are full. Try again shortly.'});return true;}
   let room,role=0;if(url.pathname==='/api/create'){let code;do{code=Array.from({length:6},()=>alphabet[randomInt(alphabet.length)]).join('');}while(rooms.has(code));room={code,slots:[null,null],playing:false,match:0,created:Date.now()};rooms.set(code,room);}else{room=rooms.get(String(body.code||'').toUpperCase().trim());if(!room){reply(res,404,{error:'Party not found. Check the code.'});return true;}if(room.slots[1]){reply(res,409,{error:'This party already has two players.'});return true;}role=1;}
   const slot=makeSlot(room,role);reply(res,200,{token:slot.token,role,code:room.code});broadcast(room,info(room));return true;
  }
  const token=req.headers.authorization?.replace(/^Bearer /,'')||url.searchParams.get('token'),slot=sessions.get(token);if(!slot){reply(res,401,{error:'Your party session ended. Create or join again.'});return true;}slot.seen=Date.now();const room=slot.room;
  if(req.method==='GET'&&url.pathname==='/api/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(': connected\n\n');const previous=slot.stream;slot.stream=res;previous?.end?.();previous?.close?.();broadcast(room,info(room));if(room.playing)send(slot,{type:'start',match:room.match});req.on('close',()=>{if(slot.stream===res){slot.stream=null;slot.input=empty();broadcast(room,{type:'paused',message:'Connection interrupted. Waiting for your friend…'});broadcast(room,info(room));}});return true;}
  if(req.method!=='POST'){reply(res,405,{error:'Method not allowed.'});return true;}
  if(url.pathname==='/api/leave'){remove(slot);reply(res,200,{ok:true});return true;}
  if(url.pathname==='/api/ready'){if(room.playing&&!room.ended){reply(res,409,{error:'The fight is already underway.'});return true;}slot.ready=true;broadcast(room,info(room));if(room.slots.every(s=>s?.ready&&s.stream)){room.playing=true;room.ended=false;room.match++;room.slots.forEach(s=>{s.input=empty();s.actions=[];});broadcast(room,{type:'start',match:room.match});}reply(res,200,{ok:true});return true;}
  if(!room.playing||body.match!==room.match){reply(res,409,{error:'No active fight.'});return true;}
  if(url.pathname==='/api/input'&&slot.role===1){if(Number.isInteger(body.seq)&&body.seq>slot.lastInput){slot.lastInput=body.seq;const x=Number(body.x)||0,z=Number(body.z)||0,norm=Math.max(1,Math.hypot(x,z));slot.input={x:Math.max(-1,Math.min(1,x/norm)),z:Math.max(-1,Math.min(1,z/norm)),guard:body.guard===true,slip:Math.max(-1,Math.min(1,Number(body.slip)||0))};}send(room.slots[0],{type:'input',input:slot.input});reply(res,200,{ok:true});return true;}
  if(url.pathname==='/api/punch'&&slot.role===1){if(Number.isInteger(body.seq)&&body.seq>slot.lastAction&&[0,1].includes(body.hand)&&['straight','hook','uppercut'].includes(body.kind)){slot.lastAction=body.seq;send(room.slots[0],{type:'punch',hand:body.hand,kind:body.kind});}reply(res,200,{ok:true});return true;}
  if(url.pathname==='/api/state'&&slot.role===0){const state=body.state;if(!state||!Number.isFinite(state.clock)||!Array.isArray(state.poses)||state.poses.length<30||state.poses.length>60||!state.poses.every(p=>Array.isArray(p)&&p.length===7&&p.every(n=>Number.isFinite(n)&&Math.abs(n)<1e5))||!Array.isArray(state.fighters)||state.fighters.length!==2||!state.fighters.every(f=>f&&Number.isFinite(f.health)&&f.health>=0&&f.health<=100&&Number.isFinite(f.yaw)&&Array.isArray(f.punch)&&f.punch.length===2&&f.punch.every(Number.isFinite)&&Array.isArray(f.punchKind)&&f.punchKind.length===2&&f.punchKind.every(k=>['straight','hook','uppercut'].includes(k))&&Number.isFinite(f.dodge)&&Math.abs(f.dodge)<=1)){reply(res,400,{error:'Invalid fight state.'});return true;}if(state.phase==='result'&&!room.ended){room.ended=true;room.slots.forEach(s=>{if(s)s.ready=false;});}send(room.slots[1],{type:'state',state});reply(res,200,{ok:true});return true;}
  reply(res,403,{error:'Action unavailable.'});return true;
 }
 function upgrade(req,socket,head){
  let url;try{url=new URL(req.url,'http://localhost');}catch{socket.destroy();return;}
  const slot=sessions.get(url.searchParams.get('token'));
  let originValid=true;try{if(req.headers.origin)originValid=new URL(req.headers.origin).host===req.headers.host;}catch{originValid=false;}
  if(url.pathname!=='/api/events'||!slot||!originValid){socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');socket.destroy();return;}
  websockets.handleUpgrade(req,socket,head,ws=>{slot.seen=Date.now();const previous=slot.stream;slot.stream=ws;previous?.end?.();previous?.close?.();broadcast(slot.room,info(slot.room));if(slot.room.playing)send(slot,{type:'start',match:slot.room.match});
   ws.on('close',()=>{if(slot.stream===ws){slot.stream=null;slot.input=empty();slot.seen=Date.now();broadcast(slot.room,{type:'paused',message:'Connection interrupted. Waiting for your friend…'});broadcast(slot.room,info(slot.room));}});
   ws.on('error',()=>{});ws.on('pong',()=>slot.seen=Date.now());
  });
 }
 const timer=setInterval(()=>{const now=Date.now();for(const slot of sessions.values()){if(slot.stream?.send){if(slot.stream.readyState===1)slot.stream.ping();}else slot.stream?.write(': heartbeat\n\n');if(!slot.stream&&now-slot.seen>30000)remove(slot);}for(const room of rooms.values())if(!room.playing&&now-room.created>30*60*1000)remove(room.slots[0]);},10000);timer.unref();
 return {handle,upgrade,close(){clearInterval(timer);for(const slot of sessions.values())end(slot);rooms.clear();sessions.clear();websockets.close();}};
}
