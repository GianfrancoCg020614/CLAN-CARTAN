"""Actual support UI; controlled delayed requests, no real accounts or messages."""
import json,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('artifacts/v400');OUT.mkdir(parents=True,exist_ok=True)
def take_request(page,queue):
 for _ in range(100):
  if queue:return queue.pop(0)
  page.wait_for_timeout(50)
 raise AssertionError('Controlled request did not arrive')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),args=['--no-sandbox'])
 c=b.new_context(viewport={'width':390,'height':844});pending=[];creates=[];errors=[]
 def route(r):
  if r.request.url.endswith('/rpc/cc_support398'):
   action=r.request.post_data_json['p_action']
   if action=='context':pending.append(r);return
   if action=='create':creates.append(r);return
   if action=='thread':r.fulfill(json={'ticket':{'id':r.request.post_data_json['p_data']['ticket_id'],'subject':'Nueva consulta guardada','status':'OPEN'},'messages':[]});return
   r.fulfill(json=[]);return
  r.fulfill(json=[])
 c.route('**/rest/v1/**',route);page=c.new_page();page.set_default_timeout(10000);page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8173/',wait_until='domcontentloaded');page.wait_for_function('window.cc398Support');page.evaluate("CC_V53_SESSION={root:location.origin,key:'fixture',jwt:'fixture',userId:'owner-one'};void cc398Support.open()")
 initial=take_request(page,pending);page.locator('#cc398-support-dialog [data-support=close]').click();initial.fulfill(json={'admin':False});page.wait_for_timeout(250);assert not errors,errors
 print('PASS closing support while context is loading')
 page.evaluate('void cc398Support.open()');first=take_request(page,pending);page.locator('#cc398-support-dialog [data-support=close]').click();page.evaluate('void cc398Support.open()');second=take_request(page,pending);second.fulfill(json={'admin':False});page.locator('#cc398-support-dialog [data-support=new]').wait_for();first.fulfill(json={'admin':True});page.wait_for_timeout(250);assert page.locator('#cc398-support-dialog [data-support=new]').is_visible();assert page.locator('#cc398-support-dialog [data-support=retry]').count()==0;assert not errors,errors
 print('PASS old context cannot replace newly opened support')
 page.locator('#cc398-support-dialog [name=support-query]').fill('Consulta privada de owner-one');page.wait_for_timeout(350);page.evaluate('CC_V53_SESSION=null');page.wait_for_timeout(1100);page.evaluate("CC_V53_SESSION={root:location.origin,key:'fixture',jwt:'fixture-two',userId:'owner-two'};void cc398Support.open()");take_request(page,pending).fulfill(json={'admin':False});page.locator('#cc398-support-dialog [name=support-query]').wait_for();assert page.locator('#cc398-support-dialog [name=support-query]').input_value()=='';assert not errors,errors
 print('PASS account change clears support search state');page.screenshot(path=str(OUT/'support-clean-account.png'))
 dlg=page.locator('#cc398-support-dialog');dlg.locator('[data-support=new]').click();dlg.locator('[name=body]').fill('Primera consulta pendiente');dlg.locator('[type=submit]').click();old_create=take_request(page,creates);dlg.locator('[data-support=close]').click();page.evaluate('void cc398Support.open()');take_request(page,pending).fulfill(json={'admin':False});dlg.locator('[data-support=new]').click();dlg.locator('[name=body]').fill('Segunda consulta pendiente');dlg.locator('[type=submit]').click();new_create=take_request(page,creates);old_create.fulfill(json={'id':'old-inquiry'});page.wait_for_timeout(150);assert dlg.locator('[type=submit]').is_disabled();assert not creates
 new_create.fulfill(json={'id':'new-inquiry'});page.wait_for_function("document.querySelector('.cc398-thread-title')?.textContent==='Nueva consulta guardada'");assert not errors,errors;print('PASS old save cannot unlock or replace a new pending form',flush=True);c.close();b.close()
# Long histories must remain accessible after a reply refreshes the newest page.
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),args=['--no-sandbox']);c=b.new_context(viewport={'width':390,'height':844});errors=[];signing=[]
 history=[{'id':n,'ticket_id':'thread-a','sender_id':'owner-one','staff':False,'kind':'MESSAGE','body':'Mensaje controlado '+str(n),'attachment':'thread-a/prueba.png' if n==180 else None,'created_at':'2026-11-20T10:00:00Z'} for n in range(1,181)]
 def api(r):
  if not r.request.url.endswith('/rpc/cc_support398'):r.fulfill(json=[]);return
  d=r.request.post_data_json;action=d['p_action'];data=d['p_data'];value=[]
  if action=='context':value={'admin':False}
  elif action=='list':value=[{'id':k,'subject':'Consulta '+k,'business':'CLAN_CARTAN','reason':'Otro motivo','status':'OPEN','updated_at':'2026-11-20T10:00:00Z'} for k in ['thread-a','thread-b']]
  elif action=='thread':
   k=data['ticket_id'];rows=history if k=='thread-a' else []
   rows=[m for m in rows if m['id']<int(data.get('before_id',999999))][-50:]
   value={'ticket':{'id':k,'subject':'Consulta '+k,'status':'OPEN'},'messages':rows}
  elif action=='send':
   history.append({'id':181,'staff':False,'kind':'MESSAGE','body':data['body'],'created_at':'2026-11-20T10:01:00Z'});value={'ok':True}
  r.fulfill(json=value)
 c.route('**/rest/v1/**',api)
 c.route('**/storage/v1/**',lambda r:signing.append(r))
 page=c.new_page();page.set_default_timeout(10000);page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8173/',wait_until='domcontentloaded');page.wait_for_function('window.cc398Support');page.evaluate("CC_V53_SESSION={root:location.origin,key:'fixture',jwt:'fixture',userId:'owner-one'};void cc398Support.open()")
 dlg=page.locator('#cc398-support-dialog');dlg.locator('[data-support=ticket][data-id=thread-a]').click();dlg.locator('[data-support=older]').click();page.wait_for_function("document.querySelectorAll('.cc398-support-messages article').length===100");dlg.locator('[name=body]').fill('Nuevo mensaje controlado');dlg.locator('[type=submit]').click();page.wait_for_function("document.querySelectorAll('.cc398-support-messages article').length===101");assert dlg.locator('[data-support=older]').count()==1
 dlg.locator('[data-support=older]').click();page.wait_for_function("document.querySelectorAll('.cc398-support-messages article').length===151");dlg.locator('[data-support=older]').click();page.wait_for_function("document.querySelectorAll('.cc398-support-messages article').length===181");assert dlg.locator('[data-support=older]').count()==0
 print('PASS all 181 messages remain accessible after sending a reply',flush=True)
 dlg.locator('[data-support=attachment]').click();signed_request=take_request(page,signing);dlg.locator('[data-support=list]').click();dlg.locator('[data-support=ticket][data-id=thread-b]').click();page.wait_for_function("document.querySelector('.cc398-thread-title').textContent==='Consulta thread-b'");signed_request.fulfill(json={'signedURL':'/object/sign/cc-support398/thread-a/prueba.png?token=fixture'});page.wait_for_timeout(200);assert dlg.locator('.cc398-capture-preview').count()==0;assert not errors,errors
 print('PASS a delayed attachment cannot open in another conversation',flush=True);page.screenshot(path=str(OUT/'support-thread-isolated.png'));c.close();b.close()
