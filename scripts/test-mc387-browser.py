"""Recent MI COCHERA regressions. All RPC writes are simulated locally."""
import json,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('artifacts/mc373');checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),args=['--no-sandbox'])
 for width in [1366,390,320]:
  page=b.new_page(viewport={'width':width,'height':900 if width>850 else 844});page.on('dialog',lambda d:d.accept())
  page.goto('http://127.0.0.1:8000/artifacts/mc373/premium.html');page.locator('#mc158rows [data-action=select-cart]').first.wait_for()
  def nav(view):
   if width<=850:page.locator('.mc158head [data-action=menu]').click()
   page.locator('.mc158sidebar [data-view='+view+']').click();page.wait_for_timeout(100)
  nav('retired_due');assert page.locator('#mc158state').count()==0;assert page.locator('#mc158rows [data-action=select-cart]').count()==1;assert 'Carrito 3' in page.locator('#mc158rows').inner_text()
  page.locator('#mc158search').fill('inexistente');page.wait_for_timeout(350);assert page.locator('#mc158rows [data-action=select-cart]').count()==0
  nav('carts');nav('carts')
  if width>850:assert not page.locator('.mc158sidebar').evaluate('(x)=>x.inert')
  nav('reports');nav('carts')
  page.locator('#mc158rows [data-cart="2"]').click();page.wait_for_timeout(50)
  page.locator('.mc158detail-actions [data-action=payment]').click();assert '$' in page.locator('#mc158pay p').inner_text();assert 'S/' not in page.locator('#mc158pay p').inner_text()
  page.evaluate("""()=>{const base=cc80.api;window.__calls=[];cc80.api=async(p,m,b)=>{if(p==='rpc/mc_record_payment_once'){__calls.push(b);throw Error('Respuesta de prueba perdida');}if(p==='rpc/mc_list_corrections'&&window.__failCorrections)throw Error('Consulta no disponible');if(p==='rpc/mc384_historical'){__calls.push(b);return {saved:true,movements_added:1};}return base(p,m,b)}}""")
  page.locator('#mc158pay input[name=amount]').fill('1');page.locator('#mc158pay button[type=submit]').click();page.wait_for_timeout(50);assert 'Respuesta de prueba perdida' in page.locator('#mc158dialogStatus').inner_text();first=page.evaluate('__calls[0].p_request')
  page.locator('#mc158pay button[type=submit]').click();page.wait_for_timeout(50);assert first==page.evaluate('__calls[1].p_request')
  page.locator('#mc158dialog [data-action=close-dialog]').click()
  # Re-open selected USD cart; no parallel payment/wallet is created.
  page.locator('#mc158rows [data-cart="2"]').click();page.wait_for_timeout(20)
  page.locator('.mc158detail-actions [data-action=sale]').click();assert '($)' not in page.locator('#mc158sale').inner_text() # Intl unit is USD, never account PEN.
  assert 'USD' in page.locator('#mc158sale').inner_text();assert 'PEN' not in page.locator('#mc158sale').inner_text();page.locator('#mc158dialog [data-action=close-dialog]').click()
  page.locator('#mc158rows [data-cart="2"]').click();page.wait_for_timeout(20);page.locator('.mc158detail-actions [data-action=historical]').click();form=page.locator('#mc385history');assert form.locator('[name=day]').is_disabled();assert form.locator('[name=amount]').is_disabled()
  form.locator('[name=mode]').select_option('payment');assert form.locator('[name=amount]').is_enabled();assert form.locator('[name=reason]').get_attribute('required') is not None
  form.locator('[name=joined]').fill('2026-10-01');form.locator('[name=day]').fill('2026-10-02');form.locator('[name=amount]').fill('2');form.locator('[name=reason]').fill('Referencia controlada');form.locator('button[type=submit]').click();page.wait_for_timeout(100);assert page.evaluate('__calls.at(-1).p_payment')==2
  page.locator('#mc158rows [data-cart="2"]').click();page.wait_for_timeout(20);page.evaluate('window.__failCorrections=true');page.locator('.mc158detail-actions [data-action=corrections]').click();page.wait_for_timeout(100);assert 'No se pudieron consultar' in page.locator('#mc377items').inner_text();assert page.locator('[data-action=reverse-item]').count()==0;page.keyboard.press('Escape')
  page.locator('#mc158rows [data-cart="2"]').click();page.wait_for_timeout(20)
  page.evaluate("""()=>{const base=cc80.api;cc80.api=async(p,m,b)=>{if(p==='rpc/mc_list_corrections')return [];if(p.startsWith('mc_movements?')){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),v=k=>parts.find(x=>x.type===k).value,day=v('year')+'-'+v('month')+'-'+v('day');return [{id:'rent',cart_id:2,kind:'RENT',amount_local:17,currency:'USD',occurred_on:day,created_at:day+'T12:00:00Z'},{id:'adjust',cart_id:2,kind:'RENT_ADJUSTMENT',amount_local:-17,currency:'USD',occurred_on:day,created_at:day+'T13:00:00Z'}];}return base(p,m,b)}}""")
  page.locator('.mc158detail-actions [data-action=calendar]').click();page.wait_for_timeout(100);assert page.locator('.mc376-review').count()==1;assert page.locator('.mc376-paid').count()==0;assert 'no se puede confirmar' in page.locator('.mc376-info').inner_text();page.screenshot(path=str(out/('v387-calendar-'+str(width)+'.png')));page.keyboard.press('Escape')
  page.screenshot(path=str(out/('v387-pc.png' if width>850 else 'v387-mobile-'+str(width)+'.png')))
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  checks.append({'width':width,'retired_debt':True,'desktop_navigation':True,'cart_currency':True,'visible_errors':True,'retry_key':True,'historical_fields':True,'corrections_fail_closed':True})
  page.close()
 b.close()
(out/'v387-results.json').write_text(json.dumps(checks,indent=2));print('PASS MI COCHERA V387 regressions, 1366/390/320px; no production writes.')
