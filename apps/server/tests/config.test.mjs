import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {serverConfig,configurationSummary} from '../config.mjs';
test('default and copied example remain honestly unconfigured',()=>{
 const example=parseEnv(readFileSync(new URL('../.env.example',import.meta.url),'utf8'));
 for(const env of [{},example]) {
  const c=serverConfig(env);assert.equal(c.host,'127.0.0.1');assert.equal(c.port,8787);
  assert.deepEqual(configurationSummary(c),{conversationConfigured:false,transcriptionConfigured:false,providerConnectivityChecked:false,languageQualityVerified:false});
 }
});
test('provider configuration rejects partial settings, placeholders and credential-bearing URLs without leaking values',()=>{
 const secret='do-not-print-me';
 for(const env of [{LLM_API_KEY:secret},{LLM_BASE_URL:'https://host',LLM_MODEL:'your-installed-model'},{STT_BASE_URL:`https://host?key=${secret}`,STT_MODEL:'test'},{LLM_BASE_URL:`https://user:${secret}@host`,LLM_MODEL:'test'}]) {
  assert.throws(()=>serverConfig(env),error=>!error.message.includes(secret));
 }
});
test('listen/origin settings reject malformed input and normalize browser origins',()=>{
 for(const env of [{PORT:''},{PORT:'0'},{PORT:'65536'},{PORT:'1e3'},{HOST:'http://localhost'},{WEB_ORIGIN:'https://host/path'},{WEB_ORIGIN:'https://host?token=hidden'}]) assert.throws(()=>serverConfig(env));
 assert.equal(serverConfig({WEB_ORIGIN:'http://localhost:8082/'}).allowedOrigin,'http://localhost:8082');
});
test('safe configuration diagnostics expose only booleans, not provider addresses or credentials',()=>{
 const c=serverConfig({LLM_BASE_URL:'http://localhost:11434/v1/',LLM_MODEL:'local-model',LLM_API_KEY:'secret-value'});
 assert.equal(c.conversation.baseUrl,'http://localhost:11434/v1');
 assert.equal(configurationSummary(c).conversationConfigured,true);
 assert.doesNotMatch(JSON.stringify(configurationSummary(c)),/secret-value|local-model|11434/);
});
