"""Full local index. Synthetic products/quotes/roles; never charges or publishes real data."""
from pathlib import Path
from datetime import datetime,timezone
import json,time,shutil
from playwright.sync_api import sync_playwright
OUT=Path('artifacts/v391');OUT.mkdir(parents=True,exist_ok=True)
UID='00000000-0000-4000-8000-000000000001';PID='11111111-1111-4111-8111-111111111111'
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),args=['--no-sandbox'])
 for width in [1366,390,320]:
  for role in ['visitor','affiliate','pending','reseller','super']:
   ctx=b.new_context(viewport={'width':width,'height':900 if width>850 else 844});errors=[];fx=[];publishes=[];quotes=[];confirmed=[];detail_ok=[True];paid=role in ['reseller','super'];logged=role!='visitor'
   public={'id':PID,'service':'Netflix','title':'Servicio de prueba','description':'Condiciones controladas','duration_days':30,'price_pen':17 if paid else 34,'public_price_pen':34,'distributor_price_pen':17 if paid else None,'price_tier':'DISTRIBUTOR' if paid else 'PUBLIC','stock':5}
   def rest(r):
    n=r.request.url.split('/rest/v1/')[-1].split('?')[0];data=r.request.post_data_json or {};v=[]
    if n=='cc_businesses':v=[{'id':'stream','code':'STREAM_BULLS'}]
    elif n=='cc_memberships':v=[{'id':'member','business_id':'stream','role':'SUPER_RESELLER' if role=='super' else 'RESELLER','status':'ACTIVE'}] if paid or role=='pending' else []
    elif n=='cc_subscriptions':v=[{'membership_id':'member','status':'ACTIVE','start_at':'2026-01-01','end_at':'2099-12-31'}] if paid else []
    elif n=='cc_portal_super_resellers':v=[{'enabled':True,'user_id':UID,'admin_percent':20}] if role=='super' else []
    elif n=='rpc/cc_portal_my_business_access_v316':v={'business_access':[{'service':s,'status':'ACTIVE' if paid and s=='STREAM_BULLS' else 'INACTIVE','active_until':'2099-12-31' if paid and s=='STREAM_BULLS' else None,'funding':'VERIFIED_REAL'} for s in ['STREAM_BULLS','COBRA_YA','MI_COCHERA','MI_ALQUILER']]}
    elif n=='rpc/cc_finance_wallet':v={'available_pen':100}
    elif n in ['rpc/cc_portal_public_catalog_v3','rpc/cc_portal_public_catalog_v2','rpc/cc_portal_public_catalog']:v=[public]
    elif n=='cc_portal_stream_products':v=[dict(public,seller_id=UID,price_pen=34)] if role=='super' else []
    elif n=='rpc/cc_portal_my_stream_prices':v=[{'id':PID,'public_price_pen':34,'distributor_price_pen':17}] if role=='super' and detail_ok[0] else []
    elif n=='rpc/cc_portal_stream_price_for_me':quotes.append(data);v={'id':PID,'price_pen':17 if paid else 34,'price_tier':public['price_tier'],'title':public['title'],'service':'Netflix','stock':5,'status':'ACTIVE','seller_id':'another-owner'}
    elif n=='rpc/cc_portal_publish_stream_product_v2':publishes.append(data);v=PID
    elif n=='rpc/sb_oper_has_access_v195':v=False
    elif n=='rpc/cc_portal_purchase_stream_product':raise AssertionError('No purchase allowed in this test')
    r.fulfill(json=v)
   def exchange(r):
    fx.append(r.request);assert 'authorization' not in r.request.headers;assert 'apikey' not in r.request.headers
    now=int(time.time());r.fulfill(json={'result':'success','base_code':'USD','rates':{'PEN':3.4},'time_last_update_unix':now-300,'time_next_update_unix':now+86400})
   ctx.route('**/rest/v1/**',rest);ctx.route('https://open.er-api.com/**',exchange);ctx.route('**/functions/v1/**',lambda r:r.fulfill(json={}))
   page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(confirmed.append(d.message),d.dismiss()))
   page.goto('http://127.0.0.1:8000/',wait_until='domcontentloaded');page.wait_for_function('typeof window.cc169OpenCatalog==="function"&&!!window.cc391Usd&&typeof window.cc166ReturnToBusinesses==="function"')
   if logged:
    page.evaluate("CC_V53_SESSION={root:location.origin,key:'fixture',jwt:'fixture-token',userId:'"+UID+"',isReseller:true};cc166OpenPanel()")
    page.wait_for_function("document.querySelector('#cc166-role')?.textContent.includes('Cuenta verificada')")
   page.evaluate('cc169OpenCatalog()');page.wait_for_function("document.querySelector('.cc169-offer .cc391-usd')?.textContent.includes('US$')");page.wait_for_timeout(100)
   card=page.locator('.cc169-offer:not(.cc169-example)').first;expected='5.00' if paid else '10.00';assert card.locator('.cc391-usd').inner_text()=='≈ US$ '+expected
   assert ('Precio distribuidor' if paid else 'Precio público') in card.inner_text();assert len(fx)==1;assert page.locator('.cc391-rate-note a').first.get_attribute('href')=='https://www.exchangerate-api.com';assert 'Referencial' in page.locator('.cc391-rate-note').first.inner_text();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   page.screenshot(path=str(OUT/(role+'-'+str(width)+'.png')))
   card.locator('.v23-card-price').scroll_into_view_if_needed();page.screenshot(path=str(OUT/(role+'-'+str(width)+'-price.png')))
   if logged:
    card.locator('.cc169-buy').click();page.wait_for_timeout(100);assert quotes and any('por S/ '+('17.00' if paid else '34.00') in x for x in confirmed);assert not any('US$' in x for x in confirmed)
   if role=='super':
    page.evaluate('cc166ReturnToBusinesses()');page.locator('.cc167-tab').first.click()
    if width<=850:page.locator('[data-sb389-menu]').click()
    page.locator('.cc166-navitem[aria-label="Mis publicaciones"]').click();page.locator('.sb389-composer summary').click();form=page.locator('#cc166-publish-form');form.locator('[name=price]').fill('34');form.locator('[name=distributor]').fill('17');assert form.locator('[name=price]').evaluate('(e)=>e.required');assert form.locator('[name=distributor]').evaluate('(e)=>e.required')
    assert form.locator('[name=price]').locator('..').locator('.cc391-usd').inner_text()=='≈ US$ 10.00';assert form.locator('[name=distributor]').locator('..').locator('.cc391-usd').inner_text()=='≈ US$ 5.00'
    for k,v in {'title':'Producto controlado','cost':'10','stock':'5','whatsapp':'51987654321'}.items():form.locator('[name='+k+']').fill(v)
    form.locator('[type=submit]').click();page.wait_for_timeout(150);assert len(publishes)==1;assert publishes[0]['p_price_pen']==34 and publishes[0]['p_distributor_price_pen']==17 and publishes[0]['p_cost_pen']==10;assert not any('usd' in k.lower() or 'rate' in k.lower() for k in publishes[0]);assert len(fx)==1
    detail_ok[0]=False;page.evaluate('cc166RefreshPanel()');page.wait_for_function("document.querySelector('.cc391-own-prices')?.textContent.includes('Distribuidor sin verificar')");assert page.get_by_role('button',name='Editar precios',exact=True).is_disabled()
   assert not errors,errors;results.append({'width':width,'role':role,'status':'pass'});print('PASS',width,role,flush=True);ctx.close()
 # Error and stale quotes never become a fake conversion or change the PEN price.
 for mode in ['offline','stale','zero','future','cache']:
  ctx=b.new_context();page=ctx.new_page();now=int(time.time());calls=[]
  def bad(r):
   calls.append(1)
   if mode=='offline':r.abort();return
   r.fulfill(json={'result':'success','base_code':'USD','rates':{'PEN':0 if mode=='zero' else 3.4},'time_last_update_unix':now-200000 if mode=='stale' else now+3600 if mode=='future' else now,'time_next_update_unix':now+86400})
  ctx.route('https://open.er-api.com/**',bad);ctx.route('**/rest/v1/**',lambda r:r.fulfill(json=[]));page.goto('http://127.0.0.1:8000/');page.wait_for_function('window.cc391Usd')
  if mode=='cache':
   page.evaluate("localStorage.setItem('cc391:usd-pen',JSON.stringify({penPerUsd:3.4,asOf:Date.now()-300000,next:Date.now()+86400000}))");page.reload();page.wait_for_function('window.cc391Usd')
  page.evaluate('document.body.append(cc391Usd.amount(34),cc391Usd.note())');page.wait_for_timeout(250);text=page.locator('body>.cc391-usd').inner_text();assert ('10.00' in text and not calls) if mode=='cache' else ('no disponible' in text);results.append({'case':mode,'status':'pass'});ctx.close()
 b.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2));print('PASS',len(results),'controlled catalogue/quote cases')
