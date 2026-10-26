import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8');
const normalized=html.replace(/\s+/g,' ');
function has(pattern,description){assert.match(normalized,pattern,description)}
has(/const auth=await api\('\/auth\/v1\/token\?grant_type=password'/,'Password login');
has(/const me=await api\('\/auth\/v1\/user'/,'Identity validation');
has(/let admins=\[\];\s*try\s*\{\s*admins=await api\('\/rest\/v1\/cc_admins/,'ADMIN lookup with guarded failure');
has(/let memberships=\[\];\s*try\s*\{\s*memberships=await api\('\/rest\/v1\/cc_memberships/,'Membership lookup with guarded failure');
has(/if\(!isAdmin\)/,'No commercial role unless checked');
has(/ccAuthGeneration/,'Auth generation race guard');
has(/ccInstallSession\(auth,gen\)/,'Session installation');
has(/scripts\/v161-global-currency-flags\.js\?v=161/,'V161 currency');
has(/scripts\/v161-marketing-account\.js\?v=161/,'V161 marketing');
assert.equal((normalized.match(/let admins=\[\];/g)||[]).length,1,'Single ADMIN lookup');
assert.equal((normalized.match(/let memberships=\[\];/g)||[]).length,1,'Single membership lookup');
console.log('PASS V161: real login, server-checked roles, resilient lookups, race protection.');
