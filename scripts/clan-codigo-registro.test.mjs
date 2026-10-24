import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('./v172-clan-referrals.js',import.meta.url),'utf8');
test('el código CLAN indica registro y no concede roles comerciales',()=>{
 assert.match(ui,/Tu código CLAN es único/);
 assert.match(ui,/No determina si eres AFILIADO, RESELLER, SUPER RESELLER o ADMIN/);
});
test('el código CLAN se consulta desde servidor sin inventar numeración',()=>{
 assert.match(ui,/rpc\/cc_clan_my_summary/);
 assert.match(ui,/const code=String\(summary\?\.code\|\|''\)/);
 assert.doesNotMatch(ui,/CLAN2.*clancartan@gmail\.com/i);
});
