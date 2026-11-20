"""Real local catalogue, synthetic API responses; no purchase or external messages."""
from pathlib import Path
from datetime import datetime,timezone
import json,shutil,time
from playwright.sync_api import sync_playwright
OUT=Path('artifacts/v399');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
 for width in [1366,390,320]:
  for role in ['visitor','affiliate','admin']:
   c=b.new_context(viewport={'width':width,'height':900 if width>600 else 844});mode=['products'];errors=[]
   products=[{'id':'11111111-1111-4111-8111-11111111111'+str(i),'service':service,'title':title,'description':desc,'duration_days':30,'price_pen':12+i,'price_tier':'PUBLIC','stock':5,'seller_name':'Vendedor de prueba'} for i,(service,title,desc) in enumerate([('Netflix','Netflix · Acceso mensual','Condiciones de acceso al servicio.'),('Canva','Canva · Diseño creativo','Edición creativa y recursos digitales.'),('Spotify','Spotify · Música','Condiciones de acceso al servicio.'),('Disney+','Disney+ · Entretenimiento','Condiciones de acceso al servicio.')])]
   def route(r):
    n=r.request.url.split('/rest/v1/')[-1].split('?')[0];value=[]
    if n=='rpc/cc_portal_public_catalog_v3':
     if mode[0]=='error':r.fulfill(status=503,json={'message':'Controlled connection failure'});return
     value=products if mode[0]=='products' else []
    elif n=='cc_admins':value=[{'user_id':'fixture'}] if role=='admin' else []
    elif n=='rpc/cc_finance_wallet':value={'available_pen':17}
    r.fulfill(json=value)
   c.route('**/rest/v1/**',route);c.route('**/functions/v1/**',lambda r:r.fulfill(json={}))
   c.route('https://open.er-api.com/**',lambda r:r.fulfill(json={'result':'success','base_code':'USD','rates':{'PEN':3.4},'time_last_update_unix':int(time.time())-100,'time_next_update_unix':int(time.time())+86400}))
   page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8000/',wait_until='domcontentloaded');page.wait_for_function('window.cc169OpenCatalog&&window.CCTheme')
   if role!='visitor':page.evaluate("CC_V53_SESSION={root:location.origin,key:'fixture',jwt:'fixture-token',userId:'fixture',isAdmin:"+str(role=='admin').lower()+"};cc166OpenPanel();");page.wait_for_function("document.querySelector('#cc166-role')?.textContent.includes('Cuenta verificada')")
   page.evaluate('cc169OpenCatalog()');page.wait_for_function("document.querySelectorAll('.cc169-offer').length===4");page.wait_for_timeout(1200)
   assert page.locator('#app .cc117-header').count()==1;assert page.locator('#app h1').count()==1;assert page.locator('#app .admin-fab').count()==0;assert page.locator('#cc77back').is_hidden();assert page.locator('#cc77demobanner').is_hidden();assert page.locator('#cy53open').is_hidden();assert page.locator('#cy54adminShortcut').is_hidden()
   if role=='visitor':assert page.locator('#cc169-whatsapp-admin').is_visible();assert page.locator('#cc169-whatsapp-admin').evaluate('(n)=>!!n.closest(".cc117-actions-top")');assert page.locator('#cc398-support-launcher').is_hidden()
   else:assert page.locator('#cc169-whatsapp-admin').count()==0;assert page.locator('#cc398-support-launcher').is_visible();assert page.locator('#cc398-support-launcher').evaluate('(n)=>!!n.closest(".cc117-actions-top")')
   page.evaluate("window.__catalogInput=document.querySelector('#cc117-search')");page.locator('#cc117-search').fill('edicion');page.wait_for_function("document.querySelectorAll('.cc169-offer').length===1");assert page.evaluate("__catalogInput===document.querySelector('#cc117-search')");assert 'Canva' in page.locator('.cc169-offer').inner_text();page.locator('#cc117-search').fill('');page.wait_for_function("document.querySelectorAll('.cc169-offer').length===4")
   page.evaluate("window.__catalogHeader=document.querySelector('.cc117-header')");page.get_by_role('button',name='Recursos',exact=True).click();page.wait_for_function("document.querySelectorAll('.cc169-offer').length===1");page.get_by_role('button',name='Todos',exact=True).click();page.wait_for_function("document.querySelectorAll('.cc169-offer').length===4")
   assert page.evaluate("__catalogHeader===document.querySelector('.cc117-header')")
   for theme in ['light','dark']:
    page.evaluate('(v)=>CCTheme.set(v)',theme);page.wait_for_timeout(350);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert page.locator('.cc169-buy').count()==4;page.locator('.cc399-conditions summary').first.click();assert page.locator('.cc169-product-facts').first.is_visible();page.locator('.cc399-conditions summary').first.click();page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUT/f'catalog-{role}-{width}-{theme}.png'))
   mode[0]='empty';page.evaluate('cc169RefreshCatalog()');page.wait_for_function("document.querySelector('.cc169-status')?.textContent.includes('Todavía no hay productos')");assert page.locator('.cc169-example').count()==0;assert page.locator('.cc169-offer').count()==0;page.screenshot(path=str(OUT/f'catalog-empty-{role}-{width}.png'))
   mode[0]='error';page.evaluate('cc169RefreshCatalog()');page.wait_for_function("document.querySelector('.cc169-status')?.textContent.includes('No se pudo verificar')");mode[0]='products';page.get_by_role('button',name='Volver a consultar',exact=True).click();page.wait_for_function("document.querySelectorAll('.cc169-offer').length===4");assert not errors,errors;page.locator('.cc117-actions-top .cc117-link').click();page.wait_for_timeout(1100);assert page.locator('#cc77home').is_visible();
   if role!='visitor':assert page.locator('#cc398-support-launcher').is_visible();assert page.locator('#cc398-support-launcher').evaluate('(n)=>n.parentElement===document.body')
   c.close();print('PASS catalogue',role,width,flush=True)
 b.close()
print('PASS catalogue PC/mobile, both themes, one header/contact, no demo/floats, input preservation, filters, conditions, empty/error/retry')
