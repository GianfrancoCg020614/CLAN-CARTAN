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
  assert page.locator('#mc158close').is_visible()
  assert page.locator('#mc158rows tr').count()==(10 if width>850 else 5)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  assert page.locator('.mc373-logo').evaluate('(i)=>i.complete&&i.naturalWidth>0')
  page.screenshot(path=str(root/('pc-local.png' if width>850 else 'celular-'+str(width)+'-local.png')),full_page=True)
  search=page.locator('#mc158search');search.fill('Paisa');page.wait_for_timeout(400);assert page.locator('#mc158rows tr').count()==1
  search.fill('Rodriguez Juan');page.wait_for_timeout(400);assert page.locator('#mc158rows tr [data-action=select-cart]').count()>0
  search.fill('');page.wait_for_timeout(400)
  page.locator('#mc158rows [data-action=select-cart]').first.click()
  if width<=850:
   assert page.locator('#mc158dialog').is_visible();page.screenshot(path=str(root/('ficha-'+str(width)+'-local.png')),full_page=True);page.locator('#mc158dialog [data-action=close-dialog]').click();assert page.locator('#mc158layer').is_visible()
  for view in ['carts','sales','collections','reports','settings','home']:
   if width<=850:page.locator('.mc158head [data-action=menu]').click()
   page.locator('.mc158sidebar [data-view='+view+']').click();page.wait_for_timeout(100)
   assert page.locator('.mc158main h2').inner_text()=={'carts':'Carritos','sales':'Ventas','collections':'Cobros','reports':'Reportes','settings':'Configuración','home':'Inicio'}[view]
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  page.locator('[data-action=new]').click();assert page.locator('#mc158new').is_visible();page.keyboard.press('Escape');assert page.locator('#mc158dialog').count()==0
  page.locator('#mc158close').click();assert page.evaluate('window.__returned===true');assert not errors,errors
  results.append({'case':'premium navigation/search/logo/return','width':width,'status':'pass'})
  page.close()
 browser.close()
(root/'browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print('PASS:',len(results),'browser cases; screenshots use controlled local data.')
