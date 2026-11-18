import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const bin=process.env.K6_BIN;
assert.ok(bin,'Provide K6_BIN pointing to the verified k6 executable');
const inspect=env=>spawnSync(bin,['inspect',...Object.entries(env).flatMap(([k,v])=>['-e',k+'='+v]),'tests/k6/clancartan.js'],{encoding:'utf8'});
let r=inspect({});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/constant-vus/);
r=inspect({PROFILE:'baseline'});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/ramping-vus/);
for(const env of [
 {PROFILE:'capacity-isolated'},
 {PROFILE:'capacity-isolated',ISOLATED:'YES',ALLOW_LARGE_TEST:'YES'},
 {PROFILE:'capacity-isolated',ISOLATED:'YES',ALLOW_LARGE_TEST:'YES',BASE_URL:'http://127.0.0.1:3000',API_URL:'https://pqalxtrcyrpmwqdlibqd.supabase.co'},
 {PROFILE:'capacity-isolated',ISOLATED:'YES',ALLOW_LARGE_TEST:'YES',BASE_URL:'https://clan-cartan.pages.dev'},
 {PROFILE:'capacity-isolated',ISOLATED:'YES',ALLOW_LARGE_TEST:'YES',BASE_URL:'https://www.clancartan.com:443',API_URL:'http://127.0.0.1:54321',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'},
 {PROFILE:'capacity-isolated',ISOLATED:'YES',ALLOW_LARGE_TEST:'YES',BASE_URL:'http://127.0.0.1:3000',API_URL:'https://pqalxtrcyrpmwqdlibqd.supabase.co:443',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'},
 {PROFILE:'anything-else'},
 {BASE_URL:'http://127.0.0.1:3000',API_URL:'http://127.0.0.1:54321',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'},
 {SUPABASE_PUBLISHABLE_KEY:'sb_secret_FORBIDDEN'},
 {SUPABASE_PUBLISHABLE_KEY:'fake.service.jwt'},
]){r=inspect(env);assert.notEqual(r.status,0,'Unsafe or invalid configuration must be rejected: '+JSON.stringify(env));}
r=inspect({PROFILE:'capacity-isolated',ISOLATED:'YES',ALLOW_LARGE_TEST:'YES',BASE_URL:'http://127.0.0.1:3000',API_URL:'http://127.0.0.1:54321',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/10000/);
console.log('PASS k6: smoke/baseline valid; production 10k, production API with local frontend, Pages alias, secret keys, JWTs and unknown profiles blocked. Explicit isolated profile accepted without making requests.');
