import {providerJson} from './provider-response.mjs';
export const MAX_AUDIO_BYTES=8*1024*1024;
export const AUDIO_TYPES={'audio/mp4':'recording.m4a','audio/m4a':'recording.m4a','audio/webm':'recording.webm','audio/wav':'recording.wav','audio/mpeg':'recording.mp3'};
export function validateAudio(bytes,mime,language){
 const type=String(mime??'').split(';')[0].trim().toLowerCase();
 if(!Object.hasOwn(AUDIO_TYPES,type)||!['en','ta'].includes(language)||!bytes?.byteLength||bytes.byteLength>MAX_AUDIO_BYTES)throw new Error('Invalid audio upload');
 return type;
}
export async function transcribe(bytes,mime,language,{baseUrl,model,apiKey},signal,fetcher=fetch){
 const type=validateAudio(bytes,mime,language),form=new FormData();
 form.append('file',new Blob([bytes],{type}),AUDIO_TYPES[type]);form.append('model',model);form.append('language',language);form.append('response_format','json');
 const response=await fetcher(`${baseUrl.replace(/\/$/,'')}/audio/transcriptions`,{method:'POST',headers:apiKey?{Authorization:`Bearer ${apiKey}`}:{},body:form,signal});
 const data=await providerJson(response,signal);
 if(!data||typeof data.text!=='string'||data.text.length>4000)throw new Error('Invalid transcript');
 return data.text.trim();
}
