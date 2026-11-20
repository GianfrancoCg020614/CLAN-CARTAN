"""Current full page with synthetic owner/role data. Never performs a real financial write."""
import json,shutil,re
from pathlib import Path
from datetime import datetime,timezone
from playwright.sync_api import sync_playwright
OUT=Path('artifacts/v401');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),args=['--no-sandbox'])
 for width in [1366,390,320]:
  for role in ['affiliate','reseller','admin']:
   c=b.new_context(viewport={'width':width,'height':900 if width>600 else 844});errors=[];writes=[];amount=['17.00'];empty=[False]
   today=datetime.now(timezone.utc).date().isoformat();now=datetime.now(timezone.utc).isoformat()
   moves=[{'id':str(i),'occurred_at':now,'movement_type':'RECHARGE' if i%2 else 'PURCHASE','service':'STREAM_BULLS','description':'Movimiento controlado '+str(i),'amount_pen':10 if i%2 else -2,'status':'CONFIRMED'} for i in range(1,20)]
   def route(r):
    n=r.request.url.split('/rest/v1/')[-1].split('?')[0];v=[]
    if re.search('activate|purchase_stream|submit_manual|cc_recharge_create|record_payment|grant_',n):writes.append(n)
    if n=='cc_admins':v=[{'user_id':'owner-test'}] if role=='admin' else []
    elif n=='cc_businesses':v=[{'id':'stream','code':'STREAM_BULLS'}]
    elif n=='cc_memberships':v=[{'id':'member','business_id':'stream','role':'RESELLER','status':'ACTIVE'}] if role=='reseller' else []
    elif n=='cc_subscriptions':v=[{'membership_id':'member','status':'ACTIVE','start_at':'2026-01-01','end_at':'2099-12-31'}] if role=='reseller' else []
    elif n=='cc_real_service_wallets':v=[{'service':'CLAN_CARTAN','balance_pen':amount[0]}]
    elif n=='cc_cobra_welcome_bonus_wallets':v=[{'balance_pen':15}]
    elif n=='rpc/cc_finance_wallet':v={'available_pen':amount[0]}
    elif n=='rpc/cc_finance_rates':v=[]
    elif n=='rpc/cc_my_real_wallet_movements':v=[] if empty[0] else moves
    elif n=='rpc/cc_admin_financial_summary':v={'cash_received_pen':100,'paid_service_consumption_pen':25,'real_wallet_liability_pen':75}
    elif n=='rpc/cc_recharge_admin':v={'requests':[],'events':[]}
    elif n=='rpc/cc_recharge_my_requests':v={'requests':[]}
    elif n=='rpc/cc_manual_recharge_public_status':v={'enabled':True}
    elif n=='rpc/cc_portal_my_business_access_v316':v={'business_access':[{'service':s,'status':'ACTIVE' if role=='reseller' else 'INACTIVE','active_until':'2099-12-31' if role=='reseller' else None,'funding':'VERIFIED_REAL'} for s in ['STREAM_BULLS','COBRA_YA','MI_COCHERA','MI_ALQUILER']]}
    r.fulfill(json=v)
   c.route('**/rest/v1/**',route);c.route('**/functions/v1/**',lambda r:r.fulfill(json={}))
   page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8173/',wait_until='domcontentloaded');page.wait_for_function('window.cc166OpenWallet&&window.CCTheme');assert page.locator('script[src="scripts/v166-portal-roles.js?v=401"]').count()==1;page.evaluate("CC_V53_SESSION={root:location.origin,key:'fixture',jwt:'fixture-token',userId:'owner-test'};cc166OpenPanel()");page.wait_for_function("document.querySelector('#cc166-role')?.textContent.includes('Cuenta verificada')");page.evaluate("cc166OpenWallet('summary')");page.wait_for_function("document.querySelector('#cc166-panel[data-cc401-wallet=true]')")
   if role=='admin':
    page.wait_for_function("document.querySelector('#cc166-content').textContent.includes('S/ 100.00')");assert page.locator('#cc166-content .cc-wallet-tile').count()==0
   else:
    page.wait_for_function("document.querySelector('.cc401-wallet-real strong')?.textContent==='S/ 17.00'");assert page.locator('.cc401-wallet-bonus strong').inner_text()=='S/ 15.00';page.wait_for_function("!document.querySelector('#cc166-panel .cc166-top .cc326-wallet-summary')");assert page.locator('.cc401-wallet-tabs button').count()==4;assert page.locator('.cc166-movement').count()==3;assert page.locator('.cc401-wallet-rules').get_attribute('open') is None
   page.wait_for_function("document.querySelector('#cc398-support-launcher')?.parentElement.id==='cc166-top-actions'")
   for theme in ['light','dark']:
    page.evaluate('(v)=>CCTheme.set(v)',theme);page.wait_for_timeout(300);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert page.locator('#cc166-content').evaluate('(n)=>n.scrollWidth<=n.clientWidth+1');page.screenshot(path=str(OUT/f'wallet-{role}-{width}-{theme}.png'))
   if role!='admin':
    rules=page.locator('.cc401-wallet-rules');rules.locator('summary').click();assert 'STREAM BULL’S acepta únicamente saldo real' in rules.inner_text();rules.locator('summary').click()
    page.locator('.cc401-wallet-tabs').get_by_role('button',name='Movimientos',exact=True).click();assert page.locator('.cc166-movement').count()==8;assert '1–8 de 19' in page.locator('.cc401-wallet-pager').inner_text();page.get_by_role('button',name='Siguientes →',exact=True).click();assert '9–16 de 19' in page.locator('.cc401-wallet-pager').inner_text();page.get_by_role('button',name='Siguientes →',exact=True).click();assert page.locator('.cc166-movement').count()==3;assert page.get_by_role('button',name='Siguientes →',exact=True).is_disabled()
    for tab in ['Recarga manual','Recarga automática']:
     page.locator('.cc401-wallet-tabs').get_by_role('button',name=tab,exact=True).click();page.locator('.cc321-form').wait_for();assert page.locator('.cc321-form input[type=number]').count()>0;assert page.locator('.cc321-root').evaluate('(n)=>n.scrollWidth<=n.clientWidth+1');page.screenshot(path=str(OUT/f'{tab.replace(" ","-")}-{role}-{width}.png'))
    page.locator('.cc401-wallet-tabs').get_by_role('button',name='Resumen',exact=True).click();amount[0]='12345678.90';page.evaluate('cc166RefreshPanel()');page.wait_for_function("document.querySelector('.cc401-wallet-real strong')?.textContent.includes('12,345,678.90')");page.wait_for_timeout(100);assert page.locator('.cc401-wallet-real strong').evaluate('(n)=>n.scrollWidth<=n.clientWidth+1');page.screenshot(path=str(OUT/f'wallet-large-{role}-{width}.png'))
    empty[0]=True;amount[0]='0.00';page.evaluate('cc166RefreshPanel()');page.wait_for_function("document.querySelector('.cc401-wallet-real strong')?.textContent==='S/ 0.00'");assert page.locator('.cc401-wallet-bonus strong').inner_text()=='S/ 15.00';assert 'No se encontraron movimientos reales' in page.locator('#cc166-content').inner_text()
   assert not writes,writes;assert not errors,errors;assert page.evaluate('CC_V53_SESSION.jwt')=='fixture-token';c.close();print('PASS wallet',role,width,flush=True)
 b.close()
print('PASS shared wallet balances/bonus, no duplicate header amount, tab actions, pagination, admin isolation, themes, large/zero amounts; no financial writes')
