"""Full local index. Synthetic owner data, actual local summary SQL, simulated writes."""
import json,subprocess,os,shutil,re,zipfile
from urllib.parse import urlparse,parse_qs
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('artifacts/ma388');OUT.mkdir(parents=True,exist_ok=True)
OWNER='00000000-0000-4000-8000-000000000001';PEN='00000000-0000-4000-8000-000000000101';USD='00000000-0000-4000-8000-000000000102'
def sql(q):
 cmd=['psql'] if os.environ.get('PGHOST') else ['docker','exec','cobra-v371-test','psql']
 r=subprocess.run(cmd+['-U','postgres','-d','ma388test','-qAt','-v','ON_ERROR_STOP=1','-c',q],capture_output=True,text=True);assert r.returncode==0,r.stderr;return r.stdout.strip()
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),args=['--no-sandbox'])
 for width in [1366,390,320]:
  c=b.new_context(viewport={'width':width,'height':900 if width>850 else 844},device_scale_factor=1);errors=[];writes=[];lost=[True]
  properties=[{'id':1,'name':'Residencial Central','address':'Referencia de prueba'}]
  units=[{'id':1,'property_id':1,'kind':'HABITACION','code':'H-001','alias':'Habitación Norte','state':'READY','currency':'PEN','daily_rate':25,'monthly_rate':400,'floor':'1'},{'id':2,'property_id':1,'kind':'LOCAL','code':'L-001','alias':'Local Central','state':'READY','currency':'USD','daily_rate':10,'monthly_rate':100,'floor':'1'},{'id':3,'property_id':1,'kind':'HABITACION','code':'H-002','alias':'Habitación Libre','state':'READY','currency':'PEN','daily_rate':30,'monthly_rate':450,'floor':'2'}]
  tenants=[{'id':'tenant-1','full_name':'Juan Rodríguez Pérez','document_type':'DNI','document_number':'12345678','whatsapp':'+51987654321','consent_whatsapp':True},{'id':'tenant-2','full_name':'Ana Torres','document_type':'DNI','document_number':'87654321','whatsapp':'+51911223344','consent_whatsapp':False}]
  leases=[{'id':PEN,'unit_id':1,'tenant_id':'tenant-1','mode':'MONTH','rate':400,'start_on':'2026-10-01','next_due_on':'2026-11-01','state':'ACTIVE','periods':1,'currency':'PEN'},{'id':USD,'unit_id':2,'tenant_id':'tenant-2','mode':'MONTH','rate':100,'start_on':'2026-10-01','next_due_on':'2026-11-01','state':'ACTIVE','periods':1,'currency':'USD'}]
  def route(r):
   req=r.request;n=req.url.split('/rest/v1/')[-1].split('?')[0];data=req.post_data_json or {}
   if n=='rpc/ma388_summary':
    value=json.loads(sql("begin;set local role authenticated;set local request.jwt.claim.sub='"+OWNER+"';select public.ma388_summary();commit;"));r.fulfill(json=value);return
   if n=='rpc/ma_ensure_account':r.fulfill(json=[{'active':True,'role':'RESELLER','subscription_until':'2099-12-31','invite_code':'ALQUILER123','bonus_pen':0}]);return
   if n=='rpc/cc_finance_wallet':r.fulfill(json={'available_pen':17});return
   tables={'ma_properties':properties,'ma_units':units,'ma_tenants':tenants,'ma_leases':leases}
   if n in tables:r.fulfill(json=tables[n] if parse_qs(urlparse(req.url).query).get('reseller_id',['eq.'+OWNER])[0]=='eq.'+OWNER else []);return
   if n=='ma_ledger':
    params=parse_qs(urlparse(req.url).query);lease=params.get('lease_id',[''])[0].removeprefix('eq.')
    if lease in [PEN,USD]:
     offset=max(0,int(params.get('offset',['0'])[0]));rows=json.loads(sql("begin;set local role authenticated;set local request.jwt.claim.sub='"+OWNER+"';select coalesce(jsonb_agg(x),'[]'::jsonb) from (select id,kind as label,due_on,amount_pen,currency from public.ma_ledger where lease_id='"+lease+"' order by id desc limit 21 offset "+str(offset)+") x;commit;"));r.fulfill(json=rows);return
   if n.startswith('rpc/ma_'):
    writes.append({'name':n,'body':data})
    if n=='rpc/ma_set_unit_state':next(u for u in units if u['id']==data['p_unit'])['state']=data['p_state']
    if n=='rpc/ma_record_payment' and lost[0]:lost[0]=False;r.fulfill(status=503,json={'message':'Respuesta perdida de prueba'});return
    r.fulfill(json='00000000-0000-4000-8000-000000000777');return
   r.fulfill(json=[])
  c.add_init_script('window.print=()=>{window.__printed=true;}');c.route('**/rest/v1/**',route)
  c.route('**/functions/v1/ma-verify-dni',lambda r:r.fulfill(json={'status':'found','full_name':'Cliente Verificado'}))
  page=c.new_page();page.set_default_timeout(10000);page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept('1'))
  page.goto('http://127.0.0.1:8000/',wait_until='domcontentloaded');page.wait_for_function('window.ma1611MiAlquiler')
  page.evaluate("""()=>{window.CC_V53_SESSION={root:location.origin,key:'local-fixture',jwt:'local-fixture',userId:'"""+OWNER+"""',isReseller:true,isAdmin:false};window.cc337GateBusinessEntry=async(s,cb)=>{if(window.__locked){window.__blocked=true;return false;}cb();return true;};const redundant=document.createElement('div');redundant.id='cc177-return-panel';document.body.append(redundant);window.__returns=0;window.cc166OpenPanel=()=>{window.__returns++};window.cc166OpenWallet=(tab,back)=>{window.__walletTab=tab;window.__walletBack=back;};window.cc166OpenProfile=back=>{window.__profileBack=back;};ma1611MiAlquiler.open();}""")
  print('Verifying viewport',width,flush=True);page.locator('[data-ma-action=new-property]').wait_for();page.wait_for_timeout(500)
  def nav(area):
   if width<=850:page.locator('.ma1611-head [data-ma388-menu]').click()
   page.locator('.ma1611-nav [data-area='+area+']').click();page.wait_for_timeout(150)
  assert page.locator('#ma1611layer img:visible').count()==1
  assert page.locator('#cc177-return-panel').count()==0;assert page.locator('.ma1611-head').count()==1;assert page.locator('.ma1611-brand-logo').evaluate('(i)=>i.complete&&i.naturalWidth>0')
  assert page.locator('#ma1611close').is_visible();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  page.screenshot(path=str(OUT/('pc.png' if width>850 else 'celular-'+str(width)+'.png')))
  page.locator('[data-ma-action=new-property]').click();page.locator('[data-ma-form=property] [name=name]').fill('Inmueble de prueba');page.locator('[data-ma-form=property] [name=address]').fill('Referencia controlada');page.locator('[data-ma-form=property] [type=submit]').click();page.wait_for_timeout(100);assert writes[-1]['name']=='rpc/ma_add_property'
  page.locator('[data-ma-action=new-unit]').click();page.locator('[data-ma-form=unit] [name=alias]').fill('Unidad de prueba');page.locator('[name=daily]').fill('20');page.locator('[data-ma-form=unit] [type=submit]').click();page.wait_for_timeout(100);assert writes[-1]['name']=='rpc/ma_add_unit'
  page.locator('[data-ma-action=disable]').click();page.wait_for_timeout(100);assert writes[-1]['name']=='rpc/ma_set_unit_state';page.locator('[data-ma-action=ready]').click();page.wait_for_timeout(100);assert writes[-1]['body']['p_state']=='READY'
  nav('inquilinos');page.locator('#ma388search').fill('Perez Juan');page.wait_for_timeout(50);assert 'Juan Rodríguez' in page.locator('#ma1611content').inner_text();assert 'Ana Torres' not in page.locator('#ma1611content').inner_text();page.locator('#ma388search').fill('')
  page.locator('[data-ma-action=new-tenant]').click();assert page.locator('[data-ma-form=tenant] input').first.get_attribute('name')=='document';page.locator('[name=document]').fill('11112222');page.locator('[data-ma4-dni]').click();page.wait_for_timeout(100);assert page.locator('[data-ma-form=tenant] [name=name]').input_value()=='Cliente Verificado';page.locator('[data-ma-form=tenant] [type=submit]').click();page.wait_for_timeout(100);assert writes[-1]['name']=='rpc/ma_save_tenant'
  nav('contratos');page.locator('[data-ma-action=extend][data-lease="'+PEN+'"]').click();page.locator('[data-ma-form=extend] [type=submit]').click();page.wait_for_timeout(100);assert writes[-1]['name']=='rpc/ma_extend_lease';page.locator('[data-ma-action=end][data-lease="'+PEN+'"]').click();page.wait_for_timeout(100);assert writes[-1]['name']=='rpc/ma_end_lease';page.locator('[data-ma-action=new-lease]').click();page.locator('[data-ma-form=lease] [type=submit]').click();page.wait_for_timeout(100);assert writes[-1]['name']=='rpc/ma_start_lease'
  nav('finanzas');page.locator('#ma388currency').wait_for();assert '2,501.00' in page.locator('.ma3-stats').inner_text();page.locator('#ma388currency').select_option('USD');assert '$15.00' in page.locator('.ma3-stats').inner_text();assert '2,501' not in page.locator('.ma3-stats').inner_text()
  page.locator('[data-ma388-wallet]').click();assert page.locator('#ma1611layer').is_hidden();assert page.evaluate('__walletTab')=='summary';page.evaluate('__walletBack()');page.locator('#ma388currency').wait_for();assert page.locator('.ma1611-nav [data-area=finanzas]').get_attribute('aria-current')=='page'
  page.locator('[data-ma388-profile]').click();assert page.locator('#ma1611layer').is_hidden();page.evaluate('__profileBack()');page.locator('#ma388currency').wait_for();assert page.evaluate('CC_V53_SESSION.userId')==OWNER
  page.locator('[data-ma3-action=payment][data-lease="'+USD+'"]').click();assert 'USD' in page.locator('#ma3dialog').inner_text();page.locator('#ma3dialog [name=amount]').fill('1');page.locator('#ma3dialog [type=submit]').click();page.wait_for_timeout(80);assert 'Respuesta perdida' in page.locator('#ma3-dialog-status').inner_text();req=writes[-1]['body']['p_request'];page.locator('#ma3dialog [type=submit]').click();page.wait_for_timeout(100);assert writes[-1]['body']['p_request']==req
  for action in ['meter','fixed','guarantee','history']:
   page.locator('[data-ma3-action='+action+'][data-lease="'+USD+'"]').click();assert page.locator('#ma3dialog').is_visible()
   if action=='history':
    page.locator('#ma388-history table').wait_for();assert page.locator('#ma388-history tbody tr').count()==2;page.keyboard.press('Escape')
   else:
    fields={'meter':{'reading':'10','price':'2'},'fixed':{'service':'Internet','amount':'5'},'guarantee':{'amount':'1'}}[action]
    for name,value in fields.items():page.locator('#ma3dialog [name='+name+']').fill(value)
    page.locator('#ma3dialog [type=submit]').click();page.wait_for_timeout(100);assert writes[-1]['name']=={'meter':'rpc/ma_record_meter','fixed':'rpc/ma_charge_fixed','guarantee':'rpc/ma_record_guarantee'}[action]
   assert page.locator('#ma3dialog').count()==0
  page.locator('[data-ma3-action=expense]').click();page.locator('[name=category]').fill('Mantenimiento');page.locator('[name=description]').fill('Gasto de prueba');page.locator('#ma3dialog [name=amount]').fill('3');page.locator('#ma3dialog [type=submit]').click();page.wait_for_timeout(100);assert writes[-1]['name']=='rpc/ma_record_expense'
  nav('avisos');page.locator('.ma4-row').first.wait_for();assert page.locator('#ma4-search').count()==0;assert '2,501' in page.locator('.ma4-row').first.inner_text();assert page.locator('.ma4-wa').count()==1;assert 'www.ClanCartan.com' in page.locator('.ma4-wa').get_attribute('href')
  with page.expect_download() as dl:page.locator('[data-ma4-action=xlsx]').click()
  report_file=OUT/('reporte-'+str(width)+'.xlsx');dl.value.save_as(str(report_file))
  with zipfile.ZipFile(report_file) as workbook:assert len([n for n in workbook.namelist() if n.startswith('xl/worksheets/sheet')])==8
  with page.expect_popup() as report:page.locator('[data-ma4-action=pdf]').click()
  popup=report.value;popup.wait_for_load_state();assert popup.locator('tbody tr').count()==2;assert 'moneda original' in popup.locator('thead').inner_text();popup.close()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert not errors,errors
  nav('finanzas');page.locator('#ma388currency').wait_for();page.locator('[data-ma3-action=history][data-lease="'+PEN+'"]').click();page.locator('#ma388-history tbody tr').first.wait_for();assert page.locator('#ma388-history tbody tr').count()==20;page.locator('#ma388-history button',has_text='Siguiente').click();page.wait_for_timeout(100);assert page.locator('#ma388-history tbody tr').count()==20;page.keyboard.press('Escape')
  page.locator('#ma1611close').click();assert page.locator('#ma1611layer').is_hidden();assert page.evaluate('__returns')==1
  page.evaluate('window.__locked=true;ma1611MiAlquiler.open()');assert page.locator('#ma1611layer').is_hidden();assert page.evaluate('__blocked===true')
  page.evaluate("window.__locked=false;ma1611MiAlquiler.open()");page.locator('#ma388currency').wait_for()
  page.evaluate("""()=>{const base=cc80.api;window.__hold=true;cc80.api=async(p,m,b)=>{const value=await base(p,m,b);if(window.__hold&&p.startsWith('ma_properties?')){window.__hold=false;return new Promise(resolve=>window.__release=()=>resolve(value));}return value;};void ma1612OnOpen();}""");page.wait_for_function('typeof __release==="function"')
  page.evaluate("CC_V53_SESSION={...CC_V53_SESSION,userId:'00000000-0000-4000-8000-000000000002',jwt:'other-local'};ma1611MiAlquiler.open()");page.locator('[data-ma-action=new-property]').wait_for();page.evaluate('__release()');page.wait_for_timeout(100);assert 'Residencial Central' not in page.locator('#ma1611content').inner_text();assert 'Juan Rodríguez' not in page.locator('#ma1611content').inner_text();page.evaluate("document.dispatchEvent(new Event('cc192-session-ended'))");assert page.locator('#ma1611layer').is_hidden()
  results.append({'width':width,'status':'pass','simulated_writes':len(writes),'errors':errors});c.close()
 b.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2));print('PASS MA388 full local index, SQL summary, PC/390/320, forms/search/exports/expiry; writes simulated only.')
