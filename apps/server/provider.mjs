import maya from '../../characters/maya.json' with {type:'json'};
import arjun from '../../characters/arjun.json' with {type:'json'};
const characters={maya,arjun};
export function payload(body){
 if(!body||!Object.hasOwn(characters,body.character)||!['English','Tamil · experimental'].includes(body.language)||!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>20)throw new Error('Invalid conversation request');
 const messages=body.messages.map(m=>{if(!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>4000)throw new Error('Invalid message');return {role:m.role,content:m.content};});
 if(messages.at(-1).role!=='user')throw new Error('Last message must be from user');
 const c=characters[body.character];
 const p=body.preferences??{};
 if(!["brief","balanced","story"].includes(p.length??"brief")||!["gentle","balanced","lively"].includes(p.energy??"balanced"))throw new Error("Invalid conversation preferences");
 const length={brief:'Use 1–2 short sentences.',balanced:'Use 2–4 sentences.',story:'When appropriate, tell a short story in up to 8 sentences.'}[p.length??'brief'];
 const energy={gentle:'Use a calm, low-key tone.',balanced:'Use a warm, natural tone.',lively:'Use playful, energetic language without pressure.'}[p.energy??'balanced'];
 if(!length||!energy||(p.questions!==undefined&&typeof p.questions!=='boolean'))throw new Error('Invalid conversation preferences');
 const questions=p.questions===false?'Do not ask follow-up questions; let the user lead.':'Ask at most one optional follow-up question when it fits.';
 return [{role:'system',content:`You are ${c.name}, a fictional AI companion in WalkMate. ${c.personality} Speak in ${body.language==='English'?'English':'Tamil'}. ${length} ${energy} ${questions} Be clear you are AI, never a real person. Do not pressure continued engagement or imply exclusive relationships. You have no access to location, surroundings, camera or fitness metrics; never invent observations or navigation. Do not claim to remember past sessions. Respect requests to stop.`},...messages];
}
export async function reply(body,{baseUrl,model,apiKey},signal,fetcher=fetch){
 const messages=payload(body);
 const response=await fetcher(`${baseUrl.replace(/\/$/,'')}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json',...(apiKey?{Authorization:`Bearer ${apiKey}`}:{})},body:JSON.stringify({model,messages,max_tokens:body.preferences?.length==='story'?500:300}),signal});
 if(!response.ok)throw new Error('Provider request failed');
 const text=(await response.json()).choices?.[0]?.message?.content;
 if(typeof text!=='string'||!text.trim()||text.length>4000)throw new Error('Provider returned invalid text');
 return text;
}
