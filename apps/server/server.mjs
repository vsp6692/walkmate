import {createServer} from './http.mjs';
import {serverConfig,configurationSummary} from './config.mjs';
let config;
try { config=serverConfig(process.env); }
catch(error) { console.error(`WalkMate configuration: ${error.message}`); process.exit(1); }
if(process.argv.includes('--check')) {
 console.log(JSON.stringify(configurationSummary(config),null,2));
} else {
 const server=createServer(config);
 server.requestTimeout=45000;
 server.on('error',error=>{console.error(`WalkMate could not listen (${error.code??'unknown error'}). Check HOST/PORT.`);process.exitCode=1;});
 server.listen(config.port,config.host,()=>console.log(`WalkMate development server listening on port ${config.port}.`));
}
