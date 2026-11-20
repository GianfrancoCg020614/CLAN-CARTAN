"""Actual local UI and Postgres RPC with controlled purchases, never production."""
import subprocess,json,shutil,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('artifacts/v399');OUT.mkdir(parents=True,exist_ok=True)
OWNER='00000000-0000-0000-0000-000000000001';ADMIN='00000000-0000-0000-0000-000000000003'
def sql(q):
 r=subprocess.run(['docker','exec','cobra-v371-test','psql','-U','postgres','-d','support398test','-qAt','-v','ON_ERROR_STOP=1','-c',q],capture_output=True,text=True);assert r.returncode==0,r.stderr;return r.stdout.strip()
sql("insert into public.cc_portal_stream_orders(id,buyer_id,order_code,title,service,created_at,status) select md5('support399-owned-'||n)::uuid,'"+OWNER+"','ORD-PRUEBA-'||n,'Servicio de prueba '||n,'Netflix','2026-09-01'::timestamptz+n*interval '1 hour','FULFILLED' from generate_series(2,21)n on conflict(id) do nothing")
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
 for width in [1366,390,320]:
  c=b.new_context(viewport={'width':width,'height':900 if width>600 else 844});fail=[True];errors=[]
  def route(r):
   if not r.request.url.endswith('/rpc/cc_support398'):r.fulfill(json=[]);return
   data=r.request.post_data_json;uid=ADMIN if r.request.headers.get('authorization')=='Bearer admin-fixture' else OWNER
   if data['p_action']=='purchases' and fail[0]:fail[0]=False;r.fulfill(status=503,json={'message':'Conexión de prueba interrumpida'});return
   raw=json.dumps(data['p_data']).replace("'","''");q="begin;set local role authenticated;set local request.jwt.claim.sub='"+uid+"';select public.cc_support398('"+data['p_action']+"','"+raw+"');commit;"
   r.fulfill(json=json.loads(sql(q)))
  c.route('**/rest/v1/**',route);page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8000/',wait_until='domcontentloaded');page.wait_for_function('window.cc398Support&&window.CCTheme')
  page.evaluate("CC_V53_SESSION={root:location.origin,key:'fixture',jwt:'client-fixture',userId:'"+OWNER+"'};CCTheme.set('light');cc398Support.open()")
  dlg=page.locator('#cc398-support-dialog');dlg.locator('[data-support=new]').click();reason=dlg.locator('[name=reason]');assert reason.locator('option').all_text_contents()==['Información de producto','Ayuda con mi compra','Propuesta de proveedor','Otro motivo'];reason.select_option(label='Ayuda con mi compra');dlg.locator('[data-support=retry-purchases]').click();select=dlg.locator('[name=order_id]');page.wait_for_function("document.querySelector('[name=order_id]').options.length===21");assert 'ORD-AJENO' not in select.inner_text();dlg.locator('[data-support=older-purchases]').click();page.wait_for_function("document.querySelector('[name=order_id]').options.length===22");select.select_option('40000000-0000-0000-0000-000000000001');assert dlg.locator('[name=order_product] option').inner_text()=='Producto controlado A';assert dlg.locator('[name=subject]').is_hidden();assert dlg.locator('[name=business]').is_hidden();dlg.locator('[name=body]').fill('Consulta de prueba sobre el producto de mi pedido.');page.screenshot(path=str(OUT/f'support-purchase-{width}.png'));dlg.locator('[type=submit]').click();page.wait_for_function("document.querySelector('.cc398-thread-title')?.textContent.includes('ORD-PRUEBA-1')");assert 'ORD-PRUEBA-1' in dlg.inner_text();assert not errors,errors
  dlg.locator('[data-support=close]').click();page.evaluate("CC_V53_SESSION={root:location.origin,key:'fixture',jwt:'admin-fixture',userId:'"+ADMIN+"'};cc398Support.open()");dlg=page.locator('#cc398-support-dialog');dlg.locator('[data-support=new]').click();dlg.locator('[name=reason]').select_option(label='Ayuda con mi compra');page.wait_for_function("document.querySelector('#cc398-support-dialog [role=status]').textContent.includes('No tienes compras registradas')");assert dlg.locator('[name=order_id] option').count()==1;dlg.locator('[name=reason]').select_option(label='Otro motivo');assert dlg.locator('[name=order_id]').is_hidden();assert dlg.locator('[name=business]').is_visible();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');c.close();print('PASS support purchase selection',width,flush=True)
 b.close()
