"""Full index, existing loaders and local PostgreSQL only. No production operations."""
import json,subprocess,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
uid='00000000-0000-4000-8000-000000000001'
def sql(q):
 cmd=['psql'] if os.environ.get('PGHOST') else ['docker','exec','cobra-v371-test','psql'];r=subprocess.run(cmd+['-U','postgres','-d','mc373test','-qAt','-v','ON_ERROR_STOP=1','-c',q],capture_output=True,text=True);assert r.returncode==0,r.stderr;return r.stdout.strip()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),args=['--no-sandbox']);c=b.new_context(viewport={'width':1366,'height':900});errors=[]
 c.on('weberror',lambda e:errors.append(str(e.error)))
 def route(r):
  n=r.request.url.split('/rest/v1/')[-1].split('?')[0]
  if n=='rpc/mc373_workspace':
   d=r.request.post_data_json or {};args=','.join(k+'=>'+('null' if v is None else 'true' if v is True else 'false' if v is False else str(v) if isinstance(v,(int,float)) else "'"+str(v).replace("'","''")+"'") for k,v in d.items());v=json.loads(sql("begin;set local role authenticated;set local request.jwt.claim.sub='"+uid+"';select public.mc373_workspace("+args+");commit;"));r.fulfill(json=v)
  elif n=='rpc/mc_ensure_account':r.fulfill(json=[{'user_id':uid,'subscription_until':'2099-12-31','currency':'PEN','bonus_pen':0,'suspended':False}])
  elif n=='rpc/cc_finance_wallet':r.fulfill(json={'available_pen':'17.00'})
  else:r.fulfill(json=[])
 c.route('**/rest/v1/**',route);page=c.new_page();page.goto('http://127.0.0.1:8000/',wait_until='domcontentloaded');page.wait_for_function('typeof mc158Open==="function"');page.evaluate("async()=>{CC_V53_SESSION={root:location.origin,key:'local-test',jwt:'local-test',userId:'"+uid+"',isReseller:true,isAdmin:false};await mc158Open()}");page.wait_for_selector('#mc158rows tr');page.wait_for_timeout(1800)
 for w in [1366,390]:
  page.set_viewport_size({'width':w,'height':900 if w>850 else 844});page.wait_for_timeout(500)
  assert page.locator('.mc158head:visible').count()==1
  assert page.locator('#mc158close').is_visible()
  assert page.locator('#mc158rows').inner_text().find('1,507.50')>=0
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  assert page.locator('#cc161currencyCochera').count()==0
  assert page.locator('.mc158head').evaluate('(e)=>getComputedStyle(e).borderRadius')=='0px'
  page.screenshot(path='artifacts/mc373/integration-'+str(w)+'-local.png')
 assert not errors,errors
 print('PASS full index + shared loaders + real local workspace SQL; page errors:',errors)
 b.close()
