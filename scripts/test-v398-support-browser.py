"""Real local UI + real local Postgres RPC. Synthetic users/messages only."""
import json,subprocess,shutil,uuid,base64
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('artifacts/v398');OUT.mkdir(parents=True,exist_ok=True)
def sql(q):
 r=subprocess.run(['docker','exec','cobra-v371-test','psql','-U','postgres','-d','support398test','-qAt','-v','ON_ERROR_STOP=1','-c',q],capture_output=True,text=True)
 if r.returncode:raise ValueError(r.stderr)
 return r.stdout.strip()
def rpc(uid,action,data):
 data=json.dumps(data).replace("'","''")
 return json.loads(sql("begin;set local role authenticated;set local request.jwt.claim.sub='"+uid+"';select public.cc_support398('"+action+"','"+data+"');commit;"))
USER='00000000-0000-0000-0000-000000000001';ADMIN='00000000-0000-0000-0000-000000000003'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
 for width in [1366,390,320]:
  c=b.new_context(viewport={'width':width,'height':900 if width>600 else 844});calls=[];fail=[False];errors=[]
  def route(r):
   req=r.request
   if not req.url.endswith('/rpc/cc_support398'):r.fulfill(json=[]);return
   data=req.post_data_json;uid=ADMIN if req.headers.get('authorization')=='Bearer admin-fixture' else USER
   calls.append(data)
   try:
    value=rpc(uid,data['p_action'],data['p_data'])
    if data['p_action']=='send' and fail[0]:fail[0]=False;r.fulfill(status=503,json={'message':'Error de red controlado después de guardar'});return
    r.fulfill(json=value)
   except ValueError:r.fulfill(status=403,json={'message':'Consulta no disponible'})
  def storage_route(r):
   req=r.request;uid=ADMIN if req.headers.get('authorization')=='Bearer admin-fixture' else USER
   path=req.url.split('/storage/v1/')[-1]
   if path.startswith('object/sign/') and req.method=='POST':r.fulfill(json={'signedURL':'/'+path+'?token=fixture'});return
   if req.method=='GET':r.fulfill(body=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jDXkAAAAASUVORK5CYII='),content_type='image/png');return
   name=path.split('object/cc-support398/')[-1]
   sql("begin;set local role authenticated;set local request.jwt.claim.sub='"+uid+"';insert into storage.objects(bucket_id,name,owner_id) values('cc-support398','"+name+"','"+uid+"');commit;")
   r.fulfill(json={'Key':'cc-support398/'+name})
  c.route('**/storage/v1/**',storage_route)
  c.route('**/rest/v1/**',route);c.route('**/functions/v1/**',lambda r:r.fulfill(json={}))
  page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8000/',wait_until='domcontentloaded');page.wait_for_function('window.cc398Support&&window.CCTheme')
  page.evaluate("CC_V53_SESSION={root:location.origin,key:'fixture',jwt:'client-fixture',userId:'"+USER+"'};CCTheme.set('light');cc398Support.open()")
  dlg=page.locator('#cc398-support-dialog');dlg.locator('[data-support=new]').click();form=dlg.locator('form');subject='Prueba controlada '+str(uuid.uuid4())[:8]
  form.locator('[name=subject]').fill(subject);form.locator('[name=body]').fill('<img src=x onerror=alert(1)> Consulta local de prueba');form.locator('[type=submit]').dblclick()
  dlg.locator('[data-support-form=send]').wait_for();page.wait_for_timeout(200);assert len([x for x in calls if x['p_action']=='create'])==1
  assert dlg.locator('article img').count()==0;assert '<img src=x' in dlg.inner_text()
  ticket=[x['p_data']['request_id'] for x in calls if x['p_action']=='create'][0]
  fail[0]=True;form=dlg.locator('[data-support-form=send]');form.locator('[name=body]').fill('Reintento sin duplicados');form.locator('[type=submit]').click();page.wait_for_function("document.querySelector('#cc398-support-dialog [role=status]').textContent.includes('Error de red')")
  assert form.locator('[name=body]').input_value()=='Reintento sin duplicados';form.locator('[type=submit]').click();page.wait_for_function("document.querySelector('#cc398-support-dialog [name=body]').value===''")
  sends=[x['p_data']['request_id'] for x in calls if x['p_action']=='send'];assert sends[-1]==sends[-2]
  assert len(rpc(USER,'thread',{'ticket_id':ticket})['messages'])==2
  form.locator('[name=body]').fill('Captura controlada');form.locator('[name=capture]').set_input_files({'name':'prueba.png','mimeType':'image/png','buffer':base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jDXkAAAAASUVORK5CYII=')});form.locator('[type=submit]').click();dlg.locator('[data-support=attachment]').click();dlg.locator('.cc398-capture-preview img').wait_for();assert dlg.locator('.cc398-capture-preview img').evaluate('(i)=>i.complete&&i.naturalWidth===1');dlg.locator('[data-support=close-preview]').click()
  page.screenshot(path=str(OUT/f'support-client-{width}.png'));dlg.locator('[data-support=close]').click();assert page.locator('#cc398-support-dialog').count()==0;assert page.evaluate('CC_V53_SESSION.jwt')=='client-fixture'
  page.evaluate("CC_V53_SESSION={root:location.origin,key:'fixture',jwt:'admin-fixture',userId:'"+ADMIN+"'};cc398Support.open()")
  dlg=page.locator('#cc398-support-dialog');dlg.locator('[name=support-query]').fill(subject);dlg.locator('[data-support=ticket]').first.click();form=dlg.locator('form');form.locator('[name=body]').fill('Respuesta del administrador');form.locator('[type=submit]').click();page.wait_for_function("document.querySelector('#cc398-support-dialog [name=body]').value===''");dlg.locator('[data-support=status]').click();page.wait_for_function("document.querySelector('#cc398-support-dialog .cc398-ticket-state').textContent.includes('Solucionada')")
  page.evaluate("CCTheme.set('dark')");page.wait_for_timeout(350);page.screenshot(path=str(OUT/f'support-admin-{width}.png'))
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert not errors,errors
  assert rpc(USER,'thread',{'ticket_id':ticket})['ticket']['status']=='RESOLVED';dlg.locator('[data-support=list]').click();dlg.locator('[data-support=resolved]').click();dlg.locator('[name=support-query]').fill(subject);dlg.locator('[data-support=ticket]').first.wait_for()
  page.evaluate("CC_V53_SESSION=null");page.wait_for_timeout(1100);assert page.locator('#cc398-support-dialog').count()==0;assert page.locator('#cc398-support-launcher').is_hidden();c.close();print('PASS support',width,flush=True)
 b.close()
print('PASS client/admin support, SQL persistence, dedup after lost response, XSS text, status, close/logout, PC/mobile')
