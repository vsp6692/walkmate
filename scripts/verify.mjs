import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {readdirSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url)),mobile=resolve(root,'apps/mobile');
const reportPath=resolve(root,'artifacts/verification.json');
const report={
 startedAt:new Date().toISOString(),finishedAt:null,node:process.versions.node,
 exportRequested:process.argv.includes('--export'),status:'running',steps:[],
 deviceRuntimeValidated:false,realProvidersValidated:false,
};
function saveReport(){
 mkdirSync(resolve(root,'artifacts'),{recursive:true});
 const temporary=`${reportPath}.${process.pid}.tmp`;
 writeFileSync(temporary,JSON.stringify(report,null,2)+'\n');
 renameSync(temporary,reportPath);
}
function finish(status){report.status=status;report.finishedAt=new Date().toISOString();saveReport();}
function run(label,args){
 console.log(`\n${label}`);
 const step={name:label,status:'running',durationMs:0,exitCode:null};
 report.steps.push(step);saveReport();
 const started=performance.now();
 const result=spawnSync(process.execPath,args,{cwd:mobile,stdio:'inherit',env:{...process.env,CI:'1'}});
 step.durationMs=Math.round(performance.now()-started);
 step.exitCode=result.status;
 step.status=result.status===0?'passed':'failed';
 saveReport();
 if(result.status!==0){finish('failed');console.error(`${label} failed. See artifacts/verification.json.`);process.exit(result.status??1);}
}
saveReport();
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||(major===22&&minor<13)){
 report.steps.push({name:'Node 22.13+ requirement',status:'failed',durationMs:0,exitCode:1});
 finish('failed');console.error('WalkMate validation requires Node 22.13+.');process.exit(1);
}
try{
 run('TypeScript',['node_modules/typescript/bin/tsc','--noEmit']);
 run('ESLint',['node_modules/eslint/bin/eslint.js','src','components','audio','adventures','conversation','hooks','maps','preferences','session','theme']);
 const tests=[...readdirSync(resolve(mobile,'tests')).filter(x=>x.endsWith('.test.mjs')).map(x=>`tests/${x}`),...readdirSync(resolve(root,'apps/server/tests')).filter(x=>x.endsWith('.test.mjs')).map(x=>`../server/tests/${x}`)];
 run('Mobile logic and server HTTP tests',['--experimental-strip-types','--test',...tests]);
 if(report.exportRequested)run('Export Android, iOS and web',['node_modules/expo/bin/cli','export','--platform','all']);
 finish('passed');
 console.log('\nValidation passed. Report: artifacts/verification.json. Device and real-provider checks remain separate.');
}catch(error){
 finish('failed');console.error(`Validation could not finish: ${error.message}`);process.exit(1);
}
