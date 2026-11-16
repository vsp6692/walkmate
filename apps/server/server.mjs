import {createServer} from './http.mjs';
const port=Number(process.env.PORT??8787),host=process.env.HOST??'127.0.0.1';
const server=createServer({
 conversation:{baseUrl:process.env.LLM_BASE_URL,model:process.env.LLM_MODEL,apiKey:process.env.LLM_API_KEY},
 speech:{baseUrl:process.env.STT_BASE_URL,model:process.env.STT_MODEL,apiKey:process.env.STT_API_KEY},
 allowedOrigin:process.env.WEB_ORIGIN??'http://localhost:8081',
});
server.requestTimeout=45000;
server.listen(port,host,()=>console.log(`WalkMate development server: http://${host}:${port}`));
