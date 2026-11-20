"""Real module, controlled local fixtures: no production credentials or writes."""
import json, os, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path('artifacts/mc373'); results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH') or shutil.which('chromium') or shutil.which('google-chrome'),args=['--no-sandbox'])
 for width in [1366,390,320]:
  page=browser.new_page(viewport={'width':width,'height':900 if width>850 else 844},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  for file in sorted(root.glob('3*.html')):
   page.goto('http://127.0.0.1:8000/'+str(file));out=page.locator('output[id$="-result"]');out.wait_for(state='attached');status=out.get_attribute('data-status');checks=json.loads(out.text_content());results.append({'case':file.name,'width':width,'status':status,'checks':checks});assert status=='pass',(file.name,width,checks)
  page.goto('http://127.0.0.1:8000/artifacts/mc373/premium.html');page.locator('#mc158rows tr [data-action=select-cart]').first.wait_for()
  assert page.locator('.mc158head').count()==1
  assert page.locator('.mc373-logo').count()==1
  assert page.locator('.mc158kpi strong').evaluate_all("items=>items.every(x=>{const r=document.createRange();r.selectNodeContents(x);return r.getClientRects().length===1})"),'An amount must not split digits over multiple lines'
  assert page.locator('[data-action=new]').count()==1
  assert page.locator('.mc158quick').count()==0
  assert page.locator('[data-action=wallet]').count()==1
  assert page.locator('#mc158close').is_visible()
  assert page.locator('#mc158rows tr').count()==5
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  assert page.locator('.mc373-logo').evaluate('(i)=>i.complete&&i.naturalWidth>0')
  page.screenshot(path=str(root/('pc-local.png' if width>850 else 'celular-'+str(width)+'-local.png')),full_page=True)
  search=page.locator('#mc158search');search.fill('Paisa');page.wait_for_timeout(400);assert page.locator('#mc158rows tr').count()==1
  search.fill('Rodriguez Juan');page.wait_for_timeout(400);assert page.locator('#mc158rows tr [data-action=select-cart]').count()>0
  search.fill('');page.wait_for_timeout(400)
  page.locator('#mc158rows [data-action=select-cart]').first.click()
  detail=page.locator('#mc158dialog')
  assert detail.locator('[data-action=payment]').count()==1
  more=detail.locator('.mc395-more');assert more.get_attribute('open') is None
  assert not more.locator('[data-action=historical]').is_visible()
  more.locator('summary').click();assert more.locator('[data-action=historical]').is_visible()
  more.locator('summary').click()
  assert page.locator('#mc158dialog').is_visible();page.screenshot(path=str(root/('ficha-'+str(width)+'-local.png')),full_page=True);page.locator('#mc158dialog [data-action=close-dialog]').click();assert page.locator('#mc158layer').is_visible()
  page.locator('[data-action=pick-payment]').click();page.locator('.mc396-pick').first.wait_for()
  page.locator('#mc396pickSearch').fill('Carrito 2');page.wait_for_timeout(400)
  picker=page.locator('#mc158dialog');page.evaluate('window.__picker=document.querySelector("#mc158dialog")')
  page.locator('.mc396-pick').first.click();page.locator('#mc158pay').wait_for()
  assert '$17.00' in page.locator('#mc158pay').inner_text()
  page.keyboard.press('Escape');assert page.evaluate('__picker===document.querySelector("#mc158dialog")')
  page.keyboard.press('Escape');assert page.locator('#mc158dialog').count()==0
  page.locator('[data-action=pick-sale]').click();page.locator('.mc396-pick').first.wait_for()
  first_page=page.locator('.mc396-pick').all_inner_texts()
  page.locator('#mc396pickPages button',has_text='Siguiente').click();page.wait_for_timeout(200)
  assert page.locator('.mc396-pick').all_inner_texts()!=first_page
  page.locator('#mc396pickSearch').fill('Carrito 13');page.wait_for_timeout(400)
  assert page.locator('.mc396-pick').count()==1
  page.locator('.mc396-pick').click();page.locator('#mc158sale').wait_for()
  assert page.locator('#mc158sale').get_attribute('data-cart')=='13'
  page.keyboard.press('Escape');page.keyboard.press('Escape')
  page.locator('.mc158kpi[data-state=ACTIVE]').click();page.wait_for_timeout(250)
  assert page.locator('#mc158state').input_value()=='ACTIVE'
  assert 'Retirado' not in page.locator('#mc158rows').inner_text()
  page.locator('#mc158state').select_option('ALL');page.wait_for_timeout(250)
  for view in ['carts','sales','collections','reports','settings','home']:
   if width<=850:page.locator('.mc158head [data-action=menu]').click()
   page.locator('.mc158sidebar [data-view='+view+']').click();page.wait_for_timeout(100)
   assert page.locator('[data-action=new]').count()==(1 if view in ['home','carts'] else 0)
   assert page.locator('.mc158main h2').inner_text()=={'carts':'Carritos','sales':'Ventas','collections':'Cobros','reports':'Reportes','settings':'Configuración','home':'Inicio'}[view]
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  page.locator('[data-action=new]').click();assert page.locator('#mc158new').is_visible();page.keyboard.press('Escape');assert page.locator('#mc158dialog').count()==0
  # Recovery from picker failure and late responses after switching owner.
  page.evaluate("window.__healthyFixture=__mc373Fixture;__mc373Fixture=async b=>{if(b.p_due)throw Error('Sin conexión de prueba');return __healthyFixture(b)}")
  page.locator('[data-action=pick-payment]').click();page.get_by_text('Sin conexión de prueba',exact=False).wait_for()
  page.evaluate('window.__mc373Fixture=__healthyFixture')
  page.locator('#mc158dialog button',has_text='Reintentar').click();page.locator('.mc396-pick').first.wait_for();page.keyboard.press('Escape')
  page.evaluate("window.__mc373Fixture=async b=>{if(CC_V53_SESSION.userId!=='fixture-user')return{rows:[],summary:[],total:0,cart_count:0,selected:null};const r=await __healthyFixture(b);if(b.p_due)return new Promise(resolve=>window.__releasePicker=()=>resolve(r));return r}")
  page.locator('[data-action=pick-payment]').click();page.wait_for_function('typeof __releasePicker==="function"')
  page.evaluate("CC_V53_SESSION.userId='other-owner';mc158Open()")
  page.locator('.mc158empty').wait_for();page.evaluate('__releasePicker()');page.wait_for_timeout(100)
  assert page.locator('#mc158dialog').count()==0
  assert 'Juan Rodríguez' not in page.locator('#mc158body').inner_text()
  page.evaluate("CC_V53_SESSION.userId='fixture-user';__mc373Fixture=__healthyFixture;mc158Open()")
  page.locator('#mc158rows [data-action=select-cart]').first.wait_for()
  page.evaluate("window.__mc373Fixture=async()=>({rows:[],total:0,cart_count:0,selected:null,summary:[]});mc158Open()")
  page.locator('.mc158empty').wait_for();assert page.locator('.mc158detail-panel').count()==0
  assert page.locator('[data-action=new]').count()==1
  page.locator('#mc158close').click();assert page.evaluate('window.__returned===true');assert not errors,errors
  results.append({'case':'premium navigation/search/logo/return','width':width,'status':'pass'})
  page.close()
 browser.close()
(root/'browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print('PASS:',len(results),'browser cases; screenshots use controlled local data.')
