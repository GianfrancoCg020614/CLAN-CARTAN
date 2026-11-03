// Parse every executable inline script: an invalid financial module must block release.
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import assert from 'node:assert/strict';
const html=readFileSync('index.html','utf8');
let count=0;
for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
 if(/\bsrc\s*=/.test(match[1])||/type\s*=\s*["'](?:application\/ld\+json|application\/json)["']/.test(match[1]))continue;
 new Script(match[2],{filename:'index.html:inline-'+(++count)});
}
assert.ok(count>10,'No se revisaron los módulos integrados');
console.log(`PASS ${count} scripts inline; COBRA YA y navegación analizados.`);
