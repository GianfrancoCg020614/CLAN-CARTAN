"""Actual local index, synthetic API data; no real credentials, payments or messages."""
import json,shutil
from pathlib import Path
from datetime import datetime,timezone
from playwright.sync_api import sync_playwright
OUT=Path('artifacts/v390');OUT.mkdir(parents=True,exist_ok=True)
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),args=['--no-sandbox'])
 for width in [1366,390,320]:
  c=b.new_context(viewport={'width':width,'height':900 if width>850 else 844});pending=[];writes=[];errors=[]
  today=datetime.now(timezone.utc).date().isoformat()
  def route(r):
   req=r.request;n=req.url.split('/rest/v1/')[-1].split('?')[0];data=req.post_data_json or {}
   value=[]
   if n=='cc_businesses':value=[{'id':'stream','code':'STREAM_BULLS'}]
   elif n=='cc_memberships':value=[{'id':'member','business_id':'stream','role':'RESELLER','status':'ACTIVE'}]
   elif n=='cc_subscriptions':value=[{'membership_id':'member','status':'ACTIVE','start_at':'2026-01-01','end_at':'2099-12-31'}]
   elif n=='rpc/cc_portal_my_business_access_v316':value={'business_access':[{'service':s,'status':'ACTIVE','active_until':'2099-12-31','funding':'VERIFIED_REAL'} for s in ['STREAM_BULLS','COBRA_YA','MI_COCHERA','MI_ALQUILER']]}
   elif n=='rpc/cc_finance_wallet':value={'available_pen':'17.00'}
   elif n=='rpc/cc_finance_rates':value=[{'service':s,'amount_pen':15} for s in ['COBRA_YA','MI_COCHERA','MI_ALQUILER']]
   elif n=='rpc/sb_oper_has_access_v195':value=True
   elif n=='rpc/mc_ensure_account':value=[{'user_id':'fixture-user','subscription_until':'2099-12-31','currency':'PEN','bonus_pen':0}]
   elif n=='rpc/mc373_workspace':value={'rows':[],'summary':[],'total':0,'cart_count':0,'selected':None}
   elif n=='rpc/ma_ensure_account':value=[{'active':True,'role':'RESELLER','subscription_until':'2099-12-31','currency':'PEN'}]
   elif n=='rpc/ma388_summary':value={'currencies':[],'units':0,'occupied':0,'available':0,'tenants':0,'leases':0,'ending':[]}
   elif n in ['rpc/cy372_context','rpc/cy372_set_timezone']:value={'configured':True,'timezone':'UTC','local_date':today,'verified_at':datetime.now(timezone.utc).isoformat()}
   elif n=='rpc/cy371_access':value={'allowed':True,'admin':False,'expires_at':'2099-12-31'}
   elif n in ['rpc/cy371_dashboard','rpc/cy372_dashboard']:value={'portfolios':[],'currencies':[],'clients':0,'active':0,'today':0,'tomorrow':0,'late':0,'soon':0,'paid':0,'attention':0,'local_date':today,'timezone':'UTC','verified_at':datetime.now(timezone.utc).isoformat()}
   elif n=='rpc/cy371_list':value={'rows':[],'total':0}
   elif n=='rpc/cy371_mutate':writes.append(data);pending.append(r);return
   r.fulfill(json=value)
  c.route('**/rest/v1/**',route);c.route('**/functions/v1/**',lambda r:r.fulfill(json={}))
  page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8000/',wait_until='domcontentloaded');page.wait_for_function('window.cc166ReturnToBusinesses&&window.cy53&&window.mc158Open&&window.ma1611MiAlquiler')
  page.evaluate("CC_V53_SESSION={root:location.origin,key:'fixture',jwt:'fixture-token',userId:'fixture-user',isReseller:true};cc166OpenPanel()")
  page.wait_for_function("document.querySelector('#cc166-role')?.textContent.includes('Cuenta verificada')")
  for module,opener,layer,back,modal,new in [
   ('cobra','cy53.open()','#cy53layer','[data-action=back]','dialog[open]','[data-action=new-client]'),
   ('cochera','mc158Open()','#mc158layer','#mc158close','#mc158dialog','[data-action=new]'),
   ('alquiler','ma1611MiAlquiler.open()','#ma1611layer','#ma1611close','#ma1612dialog','[data-ma-action=new-property]')]:
   page.evaluate(opener);page.locator(layer+' '+new).first.wait_for();page.locator(layer+' '+new).first.click();page.locator(modal).wait_for();page.keyboard.press('Escape');assert page.locator(modal).count()==0;assert page.locator(layer).is_visible()
   wallet={'cobra':'[data-action=wallet]','cochera':'[data-action=wallet]','alquiler':'[data-ma388-wallet]'}[module]
   page.locator(layer+' '+wallet).first.click();page.locator('#cc166-panel .cc177-back').click();assert page.locator(layer).is_visible()
   if module=='cobra':
    page.locator(new).first.click();page.locator('dialog[open] [name=full_name]').fill('Cliente anterior');page.locator('dialog[open] [type=submit]').click();page.wait_for_timeout(250);assert len(pending)==1
    page.locator('dialog[open] [data-action=close-modal]').click();page.locator(new).first.click();page.locator('dialog[open] [name=full_name]').fill('Nuevo borrador');page.evaluate('window.__draft=document.querySelector("dialog[open]")');pending.pop().fulfill(json={'id':'synthetic-client'});page.wait_for_timeout(400)
    assert page.evaluate('__draft===document.querySelector("dialog[open]")');assert page.locator('dialog[open] [name=full_name]').input_value()=='Nuevo borrador';page.keyboard.press('Escape')
   page.screenshot(path=str(OUT/(module+'-'+str(width)+'.png')));page.locator(layer+' '+back).click();page.wait_for_selector('#cc166-panel:not([hidden]) .cc167-tab');assert page.locator('.cc167-tab').count()==4;assert not page.locator(layer).is_visible();assert page.evaluate('CC_V53_SESSION.jwt')=='fixture-token';assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   results.append({'module':module,'width':width,'status':'pass'});print('PASS',module,width,flush=True)
  page.locator('.cc167-tab').first.click();page.wait_for_selector('#cc166-panel.sb389-mode');page.locator('.sb389-exit').click();assert page.locator('.cc167-tab').count()==4;assert not errors,errors;assert len(writes)==1
  results.append({'module':'stream','width':width,'status':'pass'});c.close()
 # The actual mobile cart detail must survive a secondary form and preserve its DOM/scroll.
 for width in [390,320]:
  page=b.new_page(viewport={'width':width,'height':844});page.goto('http://127.0.0.1:8000/artifacts/mc373/premium.html');page.locator('[data-action=select-cart]').first.click();page.locator('#mc158dialog').wait_for();page.evaluate('window.__detail=document.querySelector("#mc158dialog")');page.locator('#mc158dialog [data-action=payment]').click();page.locator('#mc158pay').wait_for();page.keyboard.press('Escape');assert page.evaluate('__detail===document.querySelector("#mc158dialog")');assert 'Ficha del carrito' in page.locator('#mc158dialog').inner_text();page.keyboard.press('Escape');assert page.locator('#mc158dialog').count()==0;results.append({'module':'cochera nested return','width':width,'status':'pass'});page.close()
 b.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2));print('PASS',len(results),'navigation cases, controlled data only')
