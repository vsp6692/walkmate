import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {readdirSync} from 'node:fs';
const root=fileURLToPath(new URL('../',import.meta.url)),mobile=resolve(root,'apps/mobile');
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||(major===22&&minor<13)){console.error('WalkMate validation requires Node 22.13+.');process.exit(1);}
function run(label,args){console.log(`\n${label}`);const result=spawnSync(process.execPath,args,{cwd:mobile,stdio:'inherit',env:{...process.env,CI:'1'}});if(result.status!==0){console.error(`${label} failed.`);process.exit(result.status??1);}}
run('TypeScript',['node_modules/typescript/bin/tsc','--noEmit']);
run('ESLint',['node_modules/eslint/bin/eslint.js','src','components','audio','adventures','conversation','hooks','maps','preferences','session','theme']);
const tests=[...readdirSync(resolve(mobile,'tests')).filter(x=>x.endsWith('.test.mjs')).map(x=>`tests/${x}`),...readdirSync(resolve(root,'apps/server/tests')).filter(x=>x.endsWith('.test.mjs')).map(x=>`../server/tests/${x}`)];
run('Mobile logic and server HTTP tests',['--experimental-strip-types','--test',...tests]);
if(process.argv.includes('--export'))run('Export Android, iOS and web',['node_modules/expo/bin/cli','export','--platform','all']);
console.log('\nValidation passed. Device and real-provider checks remain separate.');
