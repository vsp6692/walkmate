import http from 'node:http';
import {payload,reply} from './provider.mjs';
import {MAX_AUDIO_BYTES,validateAudio,transcribe} from './transcription.mjs';
export function createServer({conversation={},speech={},allowedOrigin='http://localhost:8082'}={},fetcher=fetch){
 return http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  if(origin&&origin!==allowedOrigin){res.writeHead(403).end();return;}
  if(origin)res.setHeader('Access-Control-Allow-Origin',allowedOrigin);
  res.setHeader('Vary','Origin');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','POST, GET, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.writeHead(204).end();return;}
  const send=(code,data)=>{if(!res.destroyed)res.writeHead(code).end(JSON.stringify(data));};
  let url;try{url=new URL(req.url,'http://localhost');}catch{send(400,{error:'Invalid request URL'});return;}
  if(url.pathname==='/health'&&req.method==='GET'){send(200,{configured:!!(conversation.baseUrl&&conversation.model),transcription:!!(speech.baseUrl&&speech.model),acceptedLanguageHints:speech.baseUrl&&speech.model?['en','ta']:[],languageQualityVerified:false});return;}
  const audio=url.pathname==='/transcribe';
  if(!['/conversation','/transcribe'].includes(url.pathname)||req.method!=='POST'){send(404,{error:'Not found'});return;}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),40000);
  res.on('close',()=>controller.abort());
  let chunks=[];
  try{
   let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>(audio?MAX_AUDIO_BYTES:90000)){send(413,{error:'Request too large'});return;}chunks.push(chunk);}
   const bytes=Buffer.concat(chunks);chunks=[];
   let parsed,mime,language;
   try{if(audio){language=url.searchParams.get('language');mime=validateAudio(bytes,req.headers['content-type'],language);}else{parsed=JSON.parse(bytes.toString('utf8'));payload(parsed);}}catch{send(400,{error:'Invalid request'});return;}
   const config=audio?speech:conversation;
   if(!config.baseUrl||!config.model){send(503,{error:'Provider not configured'});return;}
   if(audio)send(200,{text:await transcribe(bytes,mime,language,config,controller.signal,fetcher)});
   else send(200,{reply:await reply(parsed,config,controller.signal,fetcher)});
  }catch{send(502,{error:'Provider unavailable or request interrupted'});}finally{chunks=[];clearTimeout(timeout);}
 });
}
