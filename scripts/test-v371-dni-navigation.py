"""Browser regression: mocked identity/API data only; never calls production services."""
import json, pathlib, shutil
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'v371-dni-navigation'
OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),headless=True,args=['--no-sandbox'])
 for width,height in [(1280,800),(390,844)]:
  ctx=b.new_context(viewport={'width':width,'height':height})
  errors=[];ctx.on('weberror',lambda e:errors.append(str(e.error)))
  calls=[];pending=[]
  def api(route):
   name=route.request.url.split('/rest/v1/')[-1].split('?')[0]
   if name=='rpc/cy371_access':value={'allowed':True,'admin':True}
   elif name=='rpc/cy371_dashboard':value={'portfolios':[],'clients':0,'active':0,'today':0,'late':0,'soon':0}
   elif name=='rpc/cy371_list':value={'rows':[],'total':0}
   elif name=='rpc/cc_finance_wallet':value={'available_pen':'17.00'}
   else:value=[]
   assert not any(x in name for x in ['mutate','activate','purchase','grant_bonus']),name
   route.fulfill(json=value)
  def dni(route):
   calls.append(route.request.post_data_json['dni'])
   if calls[-1]=='22222222':pending.append(route);return
   if calls[-1]=='33333333':route.fulfill(json={'status':'manual','reason':'operator_not_approved'});return
   assert route.request.headers['authorization']=='Bearer fixture-token'
   route.fulfill(json={'status':'found','full_name':'JUAN CARLOS RODRIGUEZ PEREZ'})
  ctx.route('**/rest/v1/**',api);ctx.route('**/functions/v1/**',lambda r:r.fulfill(json={}))
  ctx.route('**/functions/v1/cc-consulta-dni',dni)
  page=ctx.new_page();page.goto('http://127.0.0.1:8000/',wait_until='domcontentloaded')
  page.wait_for_function('window.cc166OpenWallet && window.cy53 && document.querySelector("#cy53layer.cy371-layer")')
  page.evaluate("""async()=>{window.CC_V53_SESSION={root:location.origin,key:'fixture-key',jwt:'fixture-token',userId:'fixture-user',isReseller:true};await window.cy53.open();}""")
  page.wait_for_selector('.cy371-layout:not([hidden])')
  page.locator('[data-action=new-client]').click()
  form=page.locator('dialog[open] form');doc=form.locator('[name=document_number]');name=form.locator('[name=full_name]')
  assert form.locator('input').first.get_attribute('name')=='document_number'
  assert doc.evaluate('(e)=>document.activeElement===e')
  doc.fill('123');page.wait_for_timeout(450);assert calls==[]
  doc.fill('12345678');page.wait_for_timeout(450)
  assert name.input_value()=='JUAN CARLOS RODRIGUEZ PEREZ';assert calls==['12345678']
  doc.fill('22222222');page.wait_for_timeout(450);assert len(pending)==1
  name.fill('Nombre manual');pending.pop().fulfill(json={'status':'found','full_name':'NO SOBRESCRIBIR'})
  page.wait_for_timeout(50);assert name.input_value()=='Nombre manual'
  doc.fill('33333333');page.wait_for_timeout(450)
  assert 'manualmente' in form.locator('[role=status]').inner_text()
  assert name.input_value()=='Nombre manual'
  doc.fill('22222222');page.wait_for_timeout(450);assert len(pending)==1
  doc.fill('44444444');page.wait_for_timeout(450)
  pending.pop().fulfill(json={'status':'found','full_name':'DNI ANTERIOR'})
  page.wait_for_timeout(50);assert name.input_value()!='DNI ANTERIOR'
  page.screenshot(path=str(OUT/f'dni-{width}.png'))
  page.locator('dialog[open] [data-action=close-modal]').click();assert page.locator('dialog[open]').count()==0
  # Nested client registration returns to the actual previous picker.
  page.locator('[data-action=new-loan]').click();assert page.locator('#cy371pickClient').count()==1
  page.locator('dialog[open] [data-action=new-client]').click()
  page.locator('dialog[open] [data-action=close-modal]').click();assert page.locator('#cy371pickClient').count()==1
  page.locator('dialog[open] [data-action=close-modal]').click()
  # Wallet back returns to Cobra, tab back follows wallet history.
  page.locator('[data-action=wallet]').first.click();page.wait_for_selector('#cc166-panel:not([hidden])')
  page.locator('#cc166-panel .cc177-back').click();page.wait_for_selector('.cy371-layout:not([hidden])')
  page.locator('[data-action=wallet]').first.click()
  page.get_by_role('button',name='Movimientos',exact=True).first.click()
  page.locator('#cc166-panel .cc177-back').click();assert page.get_by_role('button',name='Resumen',exact=True).first.get_attribute('class').find('selected')>=0
  page.locator('#cc166-panel .cc177-back').click();page.wait_for_selector('.cy371-layout:not([hidden])')
  page.locator('[data-action=wallet]').first.click()
  page.locator('#cc166-panel .cc166-x').click();assert page.locator('#cc166-panel').is_hidden()
  assert page.locator('#cy53layer').is_hidden();assert page.locator('#cc77home').is_visible()
  assert page.evaluate('CC_V53_SESSION.jwt')=='fixture-token'
  # A popup X dismisses only that popup and preserves the module/context.
  page.evaluate('window.cy53.open()');page.wait_for_selector('.cy371-layout:not([hidden])')
  page.locator('[data-action=new-client]').click();page.locator('dialog[open] [data-action=close-modal]').click()
  assert page.locator('#cy53layer').is_visible();assert page.locator('.cy371-layout').is_visible()
  assert page.locator('dialog[open]').count()==0
  page.locator('[data-action=new-client]').click()
  assert page.locator('dialog[open] header button').count()==1
  assert page.locator('dialog[open] [data-action=close-home]').count()==0
  page.keyboard.press('Escape');assert page.locator('dialog[open]').count()==0
  assert page.evaluate('CC_V53_SESSION.jwt')=='fixture-token'
  assert not errors,errors
  print(json.dumps({'viewport':width,'status':'pass','dni_calls':len(calls),'errors':errors}))
  ctx.close()
 b.close()
