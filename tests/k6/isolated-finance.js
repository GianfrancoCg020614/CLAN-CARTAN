/** Actual PostgREST + real purchase/wallet functions, synthetic accounts and money only.
 * No remote target configuration, real emails, external payments or cloud secrets.
 */
import http from 'k6/http';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';
import {check,sleep} from 'k6';
import {Rate,Counter} from 'k6/metrics';
const BASE='http://127.0.0.1:55432';
const secret='capacity-local-jwt-secret-not-valid-in-production-2026';
const vus=Number(__ENV.STAGE_VUS||10);
if(__ENV.ISOLATED!=='YES'||![1,10,100,500,1000,2500,5000,10000].includes(vus))throw Error('Explicit isolated fixture and reviewed VU count required');
export const options={scenarios:{financial:{executor:'constant-vus',vus,duration:'30s',gracefulStop:'15s'}},setupTimeout:'30s',discardResponseBodies:true,thresholds:{http_req_failed:[{threshold:'rate<0.01',abortOnFail:true,delayAbortEval:'10s'}],financial_errors:[{threshold:'rate<0.01',abortOnFail:true,delayAbortEval:'10s'}],http_req_duration:[{threshold:'p(95)<2000',abortOnFail:true,delayAbortEval:'15s'}],checks:['rate>0.99']},tags:{scope:'isolated_synthetic_financial',target_vus:String(vus)}};
const errors=new Rate('financial_errors');const attempts=new Counter('purchase_attempts');
function uuid(s){const h=crypto.md5(s,'hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
function jwt(n){const h=encoding.b64encode(JSON.stringify({alg:'HS256',typ:'JWT'}),'rawurl');const p=encoding.b64encode(JSON.stringify({sub:uuid('capacity-http-user-'+n),role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}),'rawurl');return h+'.'+p+'.'+encoding.b64encode(crypto.hmac('sha256',secret,h+'.'+p,'binary'),'rawurl');}
function params(token,name,expected=200){return{headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},responseType:'text',timeout:'5s',tags:{endpoint:name},responseCallback:http.expectedStatuses(expected)};}
export function setup(){
 const r=http.post(BASE+'/rpc/capacity_fixture_marker','{}',{responseType:'text',timeout:'5s'});
 if(r.status!==200||r.json('marker')!=='CLAN-CAPACITY-SYNTHETIC-ONLY'||r.json('accounts')!==10000)throw Error('Refusing non-fixture API');
 const denied=http.post(BASE+'/rpc/cc_finance_wallet','{}',{...params('', 'anonymous_denied',401),headers:{'Content-Type':'application/json'}});
 if(!check(denied,{'anonymous wallet rejected':r=>r.status===401}))throw Error('Anonymous access failure');
 const admin=http.post(BASE+'/rpc/cc394_admin_directory','{}',params(jwt(1),'admin_denied',403));
 if(!check(admin,{'non-admin directory rejected':r=>r.status===403}))throw Error('Owner authorization failure');
 const invalid=http.post(BASE+'/rpc/cc_finance_wallet','{}',params(jwt(1)+'invalid','invalid_token',401));
 if(!check(invalid,{'invalid signature rejected':r=>r.status===401}))throw Error('JWT validation failure');
}
let token,body;
export default function(){
 if(!token){token=jwt(__VU);body=JSON.stringify({p_product_id:uuid('capacity-http-product-'+((__VU-1)%100+1)),p_checkout_key:uuid('capacity-http-checkout-'+__VU),p_expected_price_pen:1});}
 const wallet=http.post(BASE+'/rpc/cc_finance_wallet','{}',params(token,'wallet_before'));
 let valid=wallet.status===200;
 if(valid){const balance=Number(wallet.json('available_pen'));valid=balance===100||balance===99;}
 const pair=http.batch([['POST',BASE+'/rpc/cc_portal_purchase_stream_product',body,params(token,'purchase_same_key_a')],['POST',BASE+'/rpc/cc_portal_purchase_stream_product',body,params(token,'purchase_same_key_b')]]);
 attempts.add(2);
 for(const r of pair)valid=valid&&r.status===200;
 if(pair.every(r=>r.status===200))valid=valid&&pair[0].json('order_id')===pair[1].json('order_id')&&Number(pair[0].json('price_pen'))===1;
 const after=http.post(BASE+'/rpc/cc_finance_wallet','{}',params(token,'wallet_after'));
 valid=valid&&after.status===200&&Number(after.json('available_pen'))===99;
 errors.add(!valid);check(valid,{'one purchase, one debit, same operation on retry':v=>v});
 sleep(10);
}
