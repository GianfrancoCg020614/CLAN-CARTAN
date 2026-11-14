"""STREAM BULL'S V389: actual local index, synthetic roles/data and simulated writes only."""
from pathlib import Path
from urllib.parse import urlparse,parse_qs,unquote
from playwright.sync_api import sync_playwright
import os,shutil,json
OUT=Path('artifacts/sb389');OUT.mkdir(parents=True,exist_ok=True)
UID='00000000-0000-4000-8000-000000000001'
roles=['admin','super','reseller','affiliate','pending','expired','other-business']
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),args=['--no-sandbox'])
 # Existing business/marketplace regressions, each with isolated storage.
 for file in sorted(OUT.glob('*.html')):
  c=b.new_context(viewport={'width':390,'height':844});page=c.new_page();page.goto('http://127.0.0.1:8000/'+str(file));marker=page.locator('output[id$="-result"]');marker.wait_for(state='attached');value=json.loads(marker.inner_text());status=marker.get_attribute('data-status');results.append({'case':file.name,'status':status,'checks':value});assert status=='pass',(file.name,value);c.close()
 for width in [1366,390,320]:
  for role in roles:
   c=b.new_context(viewport={'width':width,'height':900 if width>850 else 844});requests=[];writes=[];errors=[]
   paid=role in ['super','reseller','pending'];admin=role=='admin';approved=role in ['super','expired'];membership=role in ['super','reseller','pending','expired'];now_ms=__import__('time').time()*1000
   # Snapshot timestamps remain realistic relative to test execution.
   from datetime import datetime,timezone,timedelta
   now=datetime.now(timezone.utc);iso=lambda d:d.isoformat()
   accounts=[{'id':'a1','owner_id':UID,'code':'CT-001','alias':'Principal de prueba','service':'Netflix','state':'ACTIVE','provider_allows_reassignment':True,'start_at':iso(now-timedelta(days=1)),'end_at':iso(now+timedelta(days=10)),'capacity':12},{'id':'a2','owner_id':UID,'code':'CT-002','alias':'Cuenta libre','service':'Netflix','state':'ACTIVE','provider_allows_reassignment':True,'start_at':iso(now-timedelta(days=1)),'end_at':iso(now+timedelta(days=10)),'capacity':1}]
   slots=[{'id':'s'+str(i),'account_id':'a1' if i<12 else 'a2','position':i+1 if i<12 else 1} for i in range(13)]
   clients=[{'id':'c'+str(i),'owner_id':UID,'alias':'José Rodríguez' if i==0 else 'Cliente '+str(i),'phone_e164':'+51987654321' if i==0 else '+51900000000','email':'cliente'+str(i)+'@example.test'} for i in range(12)]
   contracts=[{'id':'ct'+str(i),'owner_id':UID,'client_id':'c'+str(i),'status':'ACTIVE','service':'Netflix','start_at':iso(now-timedelta(days=1)),'end_at':iso(now+timedelta(days=1)),'price_pen':15,'paid_pen':0} for i in range(12)]
   assignments=[{'id':'as'+str(i),'contract_id':'ct'+str(i),'slot_id':'s'+str(i),'state':'ACTIVE'} for i in range(12)]
   own_product={'id':'own-product','seller_id':UID,'service':'Netflix','title':'Publicación propia','price_pen':12,'stock':5,'status':'ACTIVE','duration_days':30}
   foreign_product={'id':'foreign-product','seller_id':'another-user','service':'Netflix','title':'Publicación ajena','price_pen':15,'stock':5,'status':'ACTIVE','duration_days':30}
   orders=[{'id':'own-purchase','order_code':'ORD-123456','buyer_id':UID,'seller_id':'another-user','title':'Mi compra de prueba','status':'PAID_AWAITING_DELIVERY','price_pen':15,'seller_payable_pen':12,'admin_fee_pen':3},{'id':'own-sale','order_code':'ORD-654321','buyer_id':'another-user','seller_id':UID,'title':'Mi venta de prueba','status':'PAID_AWAITING_DELIVERY','price_pen':12,'seller_payable_pen':10,'admin_fee_pen':2}]
   def route(r):
    req=r.request;n=req.url.split('/rest/v1/')[-1].split('?')[0];params=parse_qs(urlparse(req.url).query);requests.append(req.url)
    if n=='cc_admins':r.fulfill(json=[{'user_id':UID}] if admin else []);return
    if n=='cc_businesses':r.fulfill(json=[{'id':'stream','code':'STREAM_BULLS'}]);return
    if n=='cc_memberships':r.fulfill(json=[{'id':'member','business_id':'stream','role':'SUPER_RESELLER' if role in ['super','pending','expired'] else 'RESELLER','status':'ACTIVE'}] if membership else []);return
    if n=='cc_subscriptions':r.fulfill(json=[{'membership_id':'member','status':'ACTIVE','start_at':'2026-01-01','end_at':'2099-12-31' if paid else '2000-01-01'}] if membership else []);return
    if n=='cc_portal_super_resellers':r.fulfill(json=[{'user_id':UID,'enabled':True,'admin_percent':20}] if approved else []);return
    if n=='rpc/cc_portal_my_business_access_v316':r.fulfill(json={'business_access':[{'service':service,'status':'ACTIVE' if service==('STREAM_BULLS' if paid else 'COBRA_YA' if role=='other-business' else '') else 'INACTIVE','active_until':'2099-12-31' if service==('STREAM_BULLS' if paid else 'COBRA_YA' if role=='other-business' else '') else None,'funding':'VERIFIED_REAL'} for service in ['STREAM_BULLS','COBRA_YA','MI_COCHERA','MI_ALQUILER']]});return
    if n=='rpc/cc_finance_wallet':r.fulfill(json={'available_pen':'17.00'});return
    if n=='rpc/cc_finance_rates':r.fulfill(json=[{'service':'STREAM_BULLS','amount_pen':45}]);return
    if n=='cc_plans':r.fulfill(json=[{'business_id':'stream','code':'STREAM_365','price_pen':45,'is_active':True}]);return
    if n=='cc_portal_stream_products':r.fulfill(json=[own_product] if 'seller_id' in params else [foreign_product]);return
    if n=='rpc/cc_portal_my_stream_prices':r.fulfill(json=[{'id':'own-product','public_price_pen':12,'distributor_price_pen':10}] if role=='super' or admin else []);return
    if n=='rpc/cc_portal_my_stream_orders':r.fulfill(json=orders);return
    if n=='rpc/sb_oper_has_access_v195':r.fulfill(json=paid or admin);return
    tables={'sb_oper_accounts':accounts,'sb_oper_slots':slots,'sb_oper_clients':clients,'sb_oper_contracts':contracts,'sb_oper_assignments':assignments}
    if n in tables:r.fulfill(json=tables[n]);return
    if n=='sb_oper_events':
     offset=int(params.get('offset',['0'])[0]);r.fulfill(json=[{'id':str(i),'action':'MANUAL_PAYMENT_RECORDED','occurred_at':iso(now-timedelta(minutes=i))} for i in range(41)][offset:offset+21]);return
    if n.startswith('rpc/sb_oper_'):
     writes.append({'name':n,'body':req.post_data_json});r.fulfill(status=400,json={'message':'Guardado simulado rechazado'});return
    r.fulfill(json=[])
   c.route('**/rest/v1/**',route)
   page=c.new_page();page.set_default_timeout(10000);page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
   page.goto('http://127.0.0.1:8000/',wait_until='domcontentloaded');page.wait_for_function('typeof cc166OpenPanel==="function"')
   page.evaluate("""()=>{window.CC_V53_SESSION={root:location.origin,key:'local-fixture',jwt:'local-fixture',userId:'"""+UID+"""',isAdmin:false,isReseller:false};window.cc166OpenPanel();}""")
   page.wait_for_function("document.querySelector('#cc166-role')?.textContent.includes('Cuenta verificada')")
   if width<=560:page.locator('#cc308-more').click()
   page.locator('.cc166-navitem[aria-label=Negocios]').click();page.locator('.cc167-tab').first.click();page.wait_for_timeout(300)
   assert page.locator('#cc166-panel.sb389-mode').is_visible()
   label=page.locator('#cc166-role').inner_text();expected='ADMIN' if admin else 'SÚPER RESELLER' if role=='super' else 'RESELLER' if paid else 'AFILIADO';assert label.startswith(expected),(role,label)
   assert page.locator('.sb389-logo').count()==1;assert page.locator('.sb389-logo').evaluate('(i)=>i.complete&&i.naturalWidth>0');assert page.locator('.sb389-exit').is_visible()
   navs=page.locator('.cc166-navitem').all_text_contents();assert any('Mis publicaciones' in x for x in navs)==(role=='super');assert any('Supervisar pedidos' in x for x in navs)==admin;assert any('seller_id=eq.' in x for x in requests)==(role=='super')
   def go(label):
    if width<=850:page.locator('[data-sb389-menu]').click()
    page.locator('.cc166-navitem[aria-label="'+label+'"]').click();page.wait_for_timeout(100)
   if paid:
    page.locator('#sb195-attention .sb195-entry').first.wait_for();assert page.locator('.sb195-entry').count()==(5 if width<=850 else 8)
    search=page.locator('.sb195-search');page.evaluate('window.__search=document.querySelector(".sb195-search")');search.fill('jose rodriguez');assert page.locator('.sb195-entry').count()==1;assert page.evaluate('__search===document.querySelector(".sb195-search")')
    search.fill('654321');assert page.locator('.sb195-entry').count()==1;search.fill('');assert page.locator('.sb195-entry').count()==(5 if width<=850 else 8)
    page.locator('.sb389-pages button',has_text='Siguiente').click();assert page.locator('.sb195-entry').count()==(5 if width<=850 else 4);page.locator('.sb389-pages button',has_text='Anterior').click()
    page.locator('button',has_text='+ AGREGAR CUENTA').click();page.locator('#sb317dialog input[name=code]').fill('PRUEBA');page.locator('#sb317dialog [type=submit]').click();page.wait_for_timeout(50);assert 'simulado' in page.locator('#sb317dialog .sb195-error').inner_text();page.keyboard.press('Escape');assert page.locator('#sb317dialog').count()==0
    fold=page.locator('.sb195-fold').first;fold.locator('summary').first.click();fold.locator('.sb195-more summary').click();fold.get_by_role('button',name='Ver historial',exact=True).click();page.locator('.sb389-history-row').first.wait_for();assert page.locator('.sb389-history-row').count()==20;page.locator('#sb317dialog button',has_text='Siguiente').click();page.wait_for_timeout(50);assert page.locator('.sb389-history-row').count()==20;page.keyboard.press('Escape')
    page.evaluate('window.open=url=>{window.__waDraft=url;return {}}');fold.get_by_role('button',name='WHATSAPP',exact=True).click();page.locator('#sb317dialog select[name=type]').select_option('debt');page.locator('#sb317dialog button[type=submit]').click();draft=unquote(page.evaluate('__waDraft'));assert '15.00' in draft and 'www.ClanCartan.com' in draft and draft.startswith('https://wa.me/51987654321?text=');assert page.locator('#sb317dialog').count()==0;fold.locator('summary').first.click()
   else:
    assert page.locator('#sb195-attention').count()==0;assert not any('/sb_oper_accounts?' in x for x in requests)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   page.locator('.cc166-workspace').evaluate('(e)=>e.scrollTop=0');page.screenshot(path=str(OUT/(role+'-'+str(width)+'.png')))
   if role=='super':
    go('Mis publicaciones');assert page.locator('.sb389-composer').get_attribute('open') is None;page.locator('.sb389-composer summary').click();form=page.locator('#cc166-publish-form');form.locator('[name=title]').fill('Borrador conservado');page.get_by_label('Actualizar datos',exact=True).click();page.wait_for_timeout(300);assert page.locator('#cc166-publish-form [name=title]').input_value()=='Borrador conservado';assert 'Publicación propia' in page.locator('#cc166-content').inner_text();assert 'Publicación ajena' not in page.locator('#cc166-content').inner_text();assert any('seller_id=eq.' in x for x in requests)
    approved=False;page.evaluate('CC_V53_SESSION.isAdmin=true;cc166RefreshPanel()');page.wait_for_function("document.querySelector('#cc166-role')?.textContent.startsWith('RESELLER')");assert page.locator('.cc166-navitem[aria-label="Mis publicaciones"]').count()==0;assert page.locator('#cc166-publish-form').count()==0
   go('Billetera');assert page.locator('.sb389-back').is_visible();page.locator('.sb389-back').click();assert page.locator('#cc166-panel.sb389-mode').is_visible()
   if width<=850:
    page.locator('[data-sb389-menu]').click();assert page.locator('.cc166-sidebar').is_visible();page.keyboard.press('Escape');assert not page.locator('#cc166-panel').evaluate('(e)=>e.classList.contains("sb389-menu-open")')
   if page.locator('.sb389-exit').count()==0:go('Inicio STREAM')
   page.locator('.sb389-exit').click();assert page.locator('#cc166-panel.sb389-mode').count()==0;assert page.locator('.cc167-tab').count()==4;assert page.evaluate('CC_V53_SESSION.userId')==UID;assert not errors,(role,width,errors)
   results.append({'role':role,'width':width,'status':'pass','simulated_writes':len(writes),'errors':errors});print('PASS',role,width,flush=True);c.close()
 b.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print('PASS STREAM V389:',len(results),'isolated role/browser cases; no production writes.')
