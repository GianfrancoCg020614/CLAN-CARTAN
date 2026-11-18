"""Production components with synthetic API responses; no real users, emails or money."""
import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/v394'; OUT.mkdir(parents=True,exist_ok=True)
HTML='''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles/v394-account-admin.css"><style>body{margin:0;background:#0a1c2b;color:#edfbff;font:14px/1.5 system-ui}main{padding:20px;max-width:1000px;margin:auto}button{padding:12px;min-height:44px;background:#21485a;color:white;border:1px solid #487d91;border-radius:10px;cursor:pointer}button:disabled{opacity:.5}h1{font-size:22px}.cc171-person{padding:15px;border:1px solid #355c70;border-radius:12px;margin:10px 0}#cc-real-login{padding:20px;border:1px solid #355c70;margin:20px}.cc394-social{max-width:650px}</style><main><h1>CLAN CARTAN · V394 · PRUEBA CONTROLADA</h1><p>Datos ficticios, sin dinero ni usuarios reales</p><div id="page"></div></main><section id="cc-real-login"><form id="cc-real-form"></form><p id="cc-real-status"></p></section><script src="/scripts/v394-account-admin.js"></script></html>'''
BOOT='''() => {
 window.CC_V53_SESSION={userId:'ADMIN',jwt:'AUTH-JWT',root:'https://pqalxtrcyrpmwqdlibqd.supabase.co',key:'TEST-PUBLIC'};
 window.fixture={calls:[],passwordCode:null,passwordCalls:0,grantCalls:0,overview:false};
 fixture.person={user_id:'CLIENT',registry_code:'CLAN99',registry_alias:'Cliente de Prueba',email:'client@example.test'};
 window.cc80={api:async(path,method,body)=>{fixture.calls.push({path,body});
 if(path==='rpc/cc394_admin_overview')return{users:300,pending_recharges:2,pending_orders:3,user_funds_pen:100};
 if(path==='rpc/cc394_admin_directory')return{rows:[fixture.person],registered_users:300,has_more:body.p_page===0};
 if(path==='rpc/cc394_admin_records')return{rows:body.p_section==='wallet'?[{service:'CLAN CARTAN',balance_pen:17,currency:'PEN'}]:[{client_code:'CL-0001',full_name:'Cliente Ficticio',currency:'USD'}],shared_bonus_pen:15,has_more:false};
 if(path==='rpc/cc394_admin_grant_shared_bonus'){fixture.grantCalls++;await new Promise(r=>setTimeout(r,100));return{confirmed:true,amount_pen:body.p_amount,shared_bonus_pen:15};}
 if(path==='rpc/cc394_referral_status')return{rows:[{referred:'CLAN100',bonus_activation:true,credited_pen:0,real_payments:0}],has_more:false};
 throw Error(path);
 }};
 fixture.page=document.querySelector('#page');fixture.clear=()=>fixture.page.replaceChildren();
 window.cc394InstallOAuthSession=async(auth)=>{fixture.oauthAuth=auth;};
}'''
async def main():
 async with async_playwright() as p:
  chrome='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None
  browser=await p.chromium.launch(**({'executable_path':chrome} if chrome else {}),headless=True,args=['--no-sandbox'])
  for name,w,h in [('pc',1280,900),('celular',390,844)]:
   page=await browser.new_page(viewport={'width':w,'height':h});page.set_default_timeout(10000)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   async def route(req):
    url=req.request.url
    if '/auth/v1/settings' in url:return await req.fulfill(json={'external':{'google':False,'apple':False}})
    if '/auth/v1/user' in url:
     assert req.request.method=='PUT'
     await page.evaluate('fixture.passwordCalls++')
     code=await page.evaluate('fixture.passwordCode')
     if code:return await req.fulfill(status=422,json={'error_code':code,'msg':'Verificación requerida'})
     assert len(req.request.post_data_json['password'])>=12
     return await req.fulfill(json={'id':'ADMIN'})
    if '/auth/v1/reauthenticate' in url:return await req.fulfill(json={})
    assert url.startswith('https://www.clancartan.com/'),url
    path=url.removeprefix('https://www.clancartan.com').split('?')[0]
    if path=='/':return await req.fulfill(body=HTML,content_type='text/html; charset=utf-8')
    target=(ROOT/path.lstrip('/')).resolve();assert target.is_relative_to(ROOT)
    if target.exists():return await req.fulfill(body=target.read_bytes(),content_type='text/css' if path.endswith('.css') else 'application/javascript')
    await req.abort()
   await page.route('**/*',route)
   await page.goto('https://www.clancartan.com/')
   await page.evaluate(BOOT)
   # Profile password change: mismatch, successful save, one request, accessible close.
   await page.evaluate('cc394OpenPassword()')
   await page.get_by_label('Nueva contraseña',exact=True).fill('ClaveLocalNueva394!Segura')
   await page.get_by_label('Confirmar nueva contraseña').fill('DistintaNoValida394!')
   await page.get_by_role('button',name='Guardar contraseña').click()
   await page.get_by_text('Las contraseñas deben coincidir',exact=False).wait_for()
   assert await page.evaluate('fixture.passwordCalls')==0
   await page.get_by_label('Confirmar nueva contraseña').fill('ClaveLocalNueva394!Segura')
   await page.get_by_role('button',name='Guardar contraseña').click()
   await page.get_by_text('Contraseña actualizada correctamente.',exact=False).wait_for()
   assert await page.get_by_label('Nueva contraseña',exact=True).input_value()==''
   await page.get_by_role('button',name='Cerrar',exact=True).click()
   await page.wait_for_function("!document.querySelector('.cc394-dialog')")
   # Server-requested nonce is not ignored.
   await page.evaluate("fixture.passwordCode='reauthentication_needed';cc394OpenPassword()")
   await page.get_by_label('Nueva contraseña',exact=True).fill('ClaveLocalNueva394!Segura')
   await page.get_by_label('Confirmar nueva contraseña').fill('ClaveLocalNueva394!Segura')
   await page.get_by_role('button',name='Guardar contraseña').click()
   await page.get_by_label('Código recibido en tu correo').wait_for()
   await page.get_by_role('button',name='Enviar código de verificación').click()
   await page.get_by_text('Revisa el correo de tu cuenta',exact=False).wait_for()
   await page.keyboard.press('Escape')
   await page.wait_for_function("!document.querySelector('.cc394-dialog')")
   # Compact directory searches all server pages and opens owner-scoped records.
   await page.evaluate("fixture.clear();cc394AdminDirectory(fixture.page,p=>{const row=document.createElement('article');row.className='cc171-person';row.textContent=p.registry_code+' · '+p.registry_alias;const b=document.createElement('button');b.textContent='Ver actividad';b.onclick=()=>cc394OpenRecords(p);row.append(b);return row;})")
   await page.get_by_text('300 usuarios registrados',exact=False).wait_for()
   await page.get_by_label('Buscar cuenta').fill('maria ultima')
   await page.wait_for_timeout(400)
   assert await page.evaluate("fixture.calls.some(x=>x.body?.p_search==='maria ultima')")
   await page.get_by_role('button',name='Siguiente',exact=True).click()
   await page.get_by_text('Página 2',exact=True).wait_for()
   await page.get_by_role('button',name='Ver actividad').click()
   await page.get_by_text('Bono compartido: S/ 15.00',exact=False).wait_for()
   await page.get_by_label('Sección de la ficha').select_option('cobra_clients')
   await page.locator('.cc394-record summary').filter(has_text='Cliente Ficticio').wait_for()
   await page.keyboard.press('Escape')
   await page.wait_for_function("!document.querySelector('.cc394-dialog')")
   # Shared gift: no service selector/activation; double submission is blocked.
   await page.evaluate('fixture.clear();cc394AdminBonus(fixture.page,fixture.person)')
   await page.get_by_label('Destinatario del bono').select_option('CLIENT')
   assert await page.locator('select').count()==1
   assert 'Activar con bono' not in await page.locator('#page').inner_text()
   await page.get_by_role('button',name='Aceptar',exact=True).dblclick()
   await page.get_by_text('Bono compartido disponible: S/ 15.00',exact=False).wait_for()
   assert await page.evaluate('fixture.grantCalls')==1
   assert await page.get_by_role('button',name='Bono entregado').is_disabled()
   assert not await page.evaluate("fixture.calls.some(x=>/activate_membership/.test(x.path))")
   await page.screenshot(path=str(OUT/f'bono-compartido-{name}.png'),full_page=True)
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   # Referral explanation reflects the existing rule and never invents a reward.
   await page.evaluate('fixture.clear();cc394RenderReferrals(fixture.page)')
   await page.get_by_text('Activación con bono promocional',exact=False).wait_for()
   # Unconfigured social providers remain explicit and cannot pretend to sign in.
   await page.add_script_tag(url='https://www.clancartan.com/scripts/v394-social-auth.js')
   await page.get_by_text('pendiente de configuración.',exact=False).wait_for()
   assert await page.get_by_role('button',name='Continuar con Google').is_disabled()
   assert await page.get_by_role('button',name='Continuar con Apple').is_disabled()
   # Session switch must remove an open file containing the old account data.
   await page.evaluate("cc394OpenRecords(fixture.person);CC_V53_SESSION={userId:'OTHER',jwt:'OTHER'};document.dispatchEvent(new Event('cc192-session-ready'))")
   assert await page.get_by_role('dialog').count()==0
   assert not errors,errors
   print(f'PASS {name}: contraseña, nonce, paginación, ficha, bono sin duplicidad/activación, referidos, proveedores pendientes y cambio de sesión')
   await page.close()
  await browser.close()
asyncio.run(main())
