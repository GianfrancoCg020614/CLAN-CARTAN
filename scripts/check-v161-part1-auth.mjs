import fs from 'node:fs';
import assert from 'node:assert/strict';
const s=fs.readFileSync('index.html','utf8');
const normalized=s.replace(/\s+/g,' ');
function check(re,label){assert.match(normalized,re,label)}
check(/const auth=await api\('\/auth\/v1\/token\?grant_type=password'/,'Real password authentication');
check(/window\.CC_V53_SESSION=\{jwt(?:\s*,|\s*:\s*jwt\s*,)\s*userId:me\.id/,'Verified session uses server identity');
check(/const me=await api\('\/auth\/v1\/user'/,'Identity fetched from server');
check(/const isAdmin=Array\.isArray\(admins\)/,'ADMIN determined by backend data');
check(/if\(!isAdmin\)/,'Commercial roles verified separately');
check(/window\.CC_V53_SESSION\?\.isAdmin!==true/,'Demo ADMIN bypass prevented');
check(/gate\.style\.display='none'/,'Gate closes after authentication');
check(/cc79AfterLogin\(\)/,'Portal opens after authentication');
assert.ok(!s.includes("if(typeof loginDemo==='function'){verified=false;}"));
assert.ok(!s.includes("if(typeof loginDemo==='function'){try{loginDemo('admin')}"));
console.log('PASS V161 Part 1: verified server session, ADMIN checks and no demo escalation.');
