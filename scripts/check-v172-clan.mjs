import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html');
const sql=read('supabase/migrations/20261023225000_v172_clan_global_referrals.sql');
const list=read('scripts/v172-clan-referrals.js');
const setup=read('scripts/v160-invitation-register.js');
const common=read('scripts/shared-invitations-v161.js');
for(const x of [
 'id="cc110-invite"','Ej.: CLAN1','MI_ALQUILER','scripts/v172-clan-referrals.js?v=172',
 'styles/v172-clan-referrals.css?v=172',
 "const rpc='cc_clan_validate_code';","invite_business:invitationCode?(invitationCode.startsWith('CLAN')?null",
 'void window.cc172ShowClanReferrals?.();'
])assert.ok(html.includes(x),'Portal CLAN no integrado: '+x);
assert.ok(!html.includes('  cc110ShowMyInvitationCodes();\n  const adminBtn='));
assert.ok(setup.includes('CLAN|COBRA|BULL|COCHERA|ALQUILER') && setup.includes("if(business)kind.value=business;"));
assert.ok(common.includes("rpc('cc_clan_validate_code'"));
for(const value of [
 'CREATE TABLE IF NOT EXISTS public.cc_clan_codes',
 'CREATE TABLE IF NOT EXISTS public.cc_clan_attributions',
 'CREATE TABLE IF NOT EXISTS public.cc_clan_legacy_aliases',
 'CREATE TABLE IF NOT EXISTS public.cc_clan_attribution_conflicts',
 'CREATE TRIGGER zz_cc_clan_on_signup',
 'CREATE TRIGGER cc_clan_guard_signup',
 'cc_clan_my_summary','cc_clan_my_referrals','cc_clan_validate_code',
 "GRANT EXECUTE ON FUNCTION public.cc_clan_my_summary() TO authenticated",
 'REVOKE ALL ON public.cc_clan_attributions FROM PUBLIC,anon,authenticated',
 'user_id=(SELECT auth.uid())',
 'registered_user_id',
 'ON CONFLICT(referred_user_id) DO NOTHING'
])assert.ok(sql.includes(value),'Seguridad o migración CLAN falta '+value);
assert.ok(!/(\binsert\s+into\s+public\.cc_real|\bupdate\s+public\.cc_real|\bupdate\s+public\.cc_wallet|bonus_pen\s*=)/i.test(sql),'Referidos Parte 2 no acreditan dinero');
assert.ok(sql.includes("'rewards_enabled',false"),'No prometer premios ya habilitados');
assert.ok(list.includes("moneyRewardNotice='Los premios de S/ 5"));
assert.ok(list.includes("const result=await window.cc80.api('rpc/cc_clan_my_summary','POST',{})"));
assert.ok(list.includes("window.CC_V53_SESSION?.userId!==uid"),'No filtrar datos entre sesiones');
assert.ok(list.includes('navigator.share')&&list.includes('Copiar enlace'));
assert.ok(!list.includes('rpc/cc_activate')&&!list.includes('balance_pen'),'La interfaz no debe otorgar ni modificar fondos');
// Parser común: CLAN universal y compatibilidad con códigos existentes.
const callbacks=[];
const sandbox={
 window:{location:{search:'?ref=CLAN27'}},
 document:{readyState:'loading',addEventListener:(name,fn)=>callbacks.push([name,fn])},
 URL,URLSearchParams,Event:function(){}
};
vm.runInNewContext(common,sandbox,{timeout:1000});
const p=sandbox.window.ClanCartanInvitations;
assert.equal(p.parse(' clan27 ').code,'CLAN27');
assert.equal(p.parse('alquiler2').business,'MI ALQUILER');
assert.equal(p.parse('COBRA2').business,'COBRA YA');
assert.equal(p.parse('BULL3').business,"STREAM BULL'S");
assert.equal(p.parse('COCHERA4').business,'MI COCHERA');
assert.equal(p.parse('CLAN0'),null);
assert.equal(p.parse('CLAN01'),null);
assert.equal(p.parse('CLAN'),null);
assert.equal(p.incomingCode().code,'CLAN27');
assert.equal(p.invitationUrl('CLAN27'),'https://www.clancartan.com/?ref=CLAN27');
console.log('PASS PARTE 2: CLAN universal, 4 negocios, enlaces, alias históricos, seguridad RLS y recompensa deshabilitada.');
