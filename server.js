import {createPartyService} from './party-server.js';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const parties=createPartyService();
const server=http.createServer(async(req,res)=>{if(await parties.handle(req,res))return;let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));const relative=path.relative(root,file).replaceAll('\\','/');if(!file.startsWith(root+path.sep)||relative.startsWith('.')||relative.startsWith('tests/')||relative.startsWith('node_modules/')||['server.js','party-server.js'].includes(relative)||!['.html','.js','.css','.png','.jpg','.mp3','.wav'].includes(path.extname(file))){res.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
server.on('upgrade',(req,socket,head)=>parties.upgrade(req,socket,head));
server.listen(Number(process.env.PORT)||5173,process.env.HOST||'0.0.0.0',()=>console.log('Drunkbox: http://localhost:5173'));
