"""Browser checks using production components, isolated synthetic API responses.
Requires Python Playwright and Chromium. No connection to production services.
"""
import asyncio, json, mimetypes, os
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('CC_CAPTURE_DIR', '/tmp/clan-v393-captures'))
OUT.mkdir(parents=True, exist_ok=True)
HTML = '''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prueba controlada Binance V393</title><link rel="stylesheet" href="/styles/v166-portal-roles.css"><link rel="stylesheet" href="/styles/v177-panel-unico.css"><link rel="stylesheet" href="/styles/v321-recharges.css"><style>body{margin:0}#cc166-panel{display:block}#cc166-panel .cc166-workspace{height:100vh}dialog{box-sizing:border-box;font:14px/1.5 system-ui}dialog .cc321-note{overflow-wrap:anywhere}input,select{box-sizing:border-box}</style><div id="cc166-panel"><main class="cc166-workspace"><header class="cc166-top"><div><small>CLAN CARTAN · PRUEBA CONTROLADA</small><h1>Billetera única</h1><p>Datos ficticios · sin operaciones reales</p></div></header><div id="page" class="cc166-page"></div></main></div><script src="/scripts/v321-recharges.js"></script>'''
BOOT = '''() => {
 window.CC_V53_SESSION={userId:'FIXTURE-OWNER',jwt:'FIXTURE-JWT'};
 window.fixture={rows:[],quotes:[],mode:'automatic',quoteError:false};
 const q={payer_name:'Cliente Prueba',payer_verified:false,usdt:5,pen:17.11,net_rate:3.42125,cost_pct:0.25,margin_pct:2,source:'Referencia USD/PEN ExchangeRate-API y USDT/USD Coinbase; tasa neta de plataforma',source_at:new Date().toISOString(),expires_at:new Date(Date.now()+900000).toISOString(),review_receipts:[{event_id:'EVENT-FIXTURE',payer_name:'Cliente-Prueba',usdt:5,paid_at:'2030-01-01T12:00:00Z',reason:'PAYER_REQUIRES_ADMIN'}]};
 window.fixture.q=q;
 window.fixture.context={uid:'FIXTURE-OWNER',jwt:'FIXTURE-JWT',root:'https://fixture.invalid',key:'FIXTURE-PUBLIC',admin:false,api:async(path,method,payload)=>{
 fixture.quotes.push({path,payload});
 if(path==='rpc/cc_recharge_my_requests')return{requests:fixture.rows};
 if(path==='rpc/cc393_quote_details')return q;
 if(path==='rpc/cc_recharge_admin')return{requests:fixture.rows,events:[]};
 if(path==='rpc/cc393_manual_binance_credit')return{status:'CREDITED'};
 if(path==='rpc/cc_recharge_cancel'){fixture.rows=[];return{cancelled:true};}
 if(path==='rpc/cc_recharge_create'){const r={id:'fixture-rec',rec_code:'REC-100000',requested_pen:5,amount_pen:5,status:'PENDING',receiver:'LEMON_DALE',created_at:new Date().toISOString(),expires_at:q.expires_at};fixture.rows=[r];return r;}
 throw Error(path);
 }};
 window.fixture.render=(mode='automatic')=>{document.querySelector('#page').replaceChildren();cc321Render(document.querySelector('#page'),mode,fixture.context);};
 fixture.render();
}'''
async def run():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for name,width,height in [('pc',1280,900),('mobile',390,844)]:
   page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
   page.set_default_timeout(7000)
   errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   async def route(req):
    path=req.request.url.removeprefix('https://fixture.invalid').split('?')[0]
    if path=='/':return await req.fulfill(body=HTML,content_type='text/html')
    if path=='/functions/v1/cc-recharge-mail':
     data=req.request.post_data_json
     assert data['action']=='binance_quote'
     if await page.evaluate('fixture.quoteError'):return await req.fulfill(status=409,json={'error':'MARKET_UNAVAILABLE'})
     r=await page.evaluate('''() => {const q=fixture.q,r={rec_code:'REC-100000',status:'PENDING',receiver:'BINANCE_PERSONAL',requested_pen:q.pen,amount_pen:q.pen,payment_currency:'USDT',payment_amount:q.usdt,created_at:new Date().toISOString(),expires_at:q.expires_at};fixture.rows=[r];return r;}''')
     return await req.fulfill(json=r)
    target=(ROOT/path.lstrip('/')).resolve()
    assert target.is_relative_to(ROOT)
    if target.is_file():return await req.fulfill(body=target.read_bytes(),content_type=mimetypes.guess_type(str(target))[0] or 'text/plain')
    await req.abort()
   await page.route('**/*',route)
   await page.goto('https://fixture.invalid/')
   await page.evaluate(BOOT)
   await page.locator('.cc321-method-fold summary').click()
   await page.get_by_role('combobox').select_option('BINANCE_PERSONAL')
   assert await page.get_by_label('Importe a enviar · USDT').get_attribute('step')=='0.00000001'
   await page.get_by_role('button',name='Generar REC y ver QR',exact=True).click()
   await page.get_by_role('dialog').wait_for()
   assert '5 USDT' in await page.get_by_role('dialog').inner_text()
   assert '17.11' in await page.get_by_role('dialog').inner_text()
   assert 'Primera vinculación' in await page.get_by_role('dialog').inner_text()
   await page.screenshot(path=str(OUT/f'binance-v393-{name}.png'),full_page=True)
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   await page.get_by_role('dialog').get_by_role('button',name='Cerrar',exact=True).click()
   assert await page.get_by_role('dialog').count()==0
   assert await page.get_by_role('button',name='Ver QR de esta REC').count()==1
   await page.get_by_role('button',name='Ver QR de esta REC').click()
   await page.get_by_role('dialog').wait_for()
   await page.keyboard.press('Escape')
   assert await page.get_by_role('dialog').count()==0
   await page.evaluate("fixture.rows=[];fixture.quoteError=true;fixture.render()")
   await page.locator('.cc321-method-fold summary').click()
   await page.get_by_role('combobox').select_option('BINANCE_PERSONAL')
   await page.get_by_role('button',name='Generar REC y ver QR',exact=True).click()
   await page.get_by_text('No se pudo verificar el tipo de cambio.',exact=False).wait_for()
   assert await page.get_by_role('dialog').count()==0
   # Lemon keeps PEN input and its original endpoint/QR.
   await page.evaluate('fixture.rows=[];fixture.quoteError=false;fixture.render()')
   assert await page.get_by_label('Importe (S/)').get_attribute('step')=='0.01'
   await page.get_by_role('button',name='Generar REC y ver QR',exact=True).click()
   await page.get_by_role('dialog').wait_for()
   assert 'qr-dale' in await page.get_by_role('dialog').locator('img').get_attribute('src')
   await page.keyboard.press('Escape')
   # ADMIN view selects the parsed original UTC receipt rather than inventing an ID.
   await page.evaluate("fixture.context.admin=true;fixture.rows=[{...fixture.rows[0],mode:'AUTOMATIC',receiver:'BINANCE_PERSONAL',payment_currency:'USDT',payment_amount:5,full_name:'Cliente Prueba'}];fixture.render('recharges')")
   await page.get_by_text('Revisar comprobación del ingreso',exact=True).click()
   await page.get_by_role('option',name='Cliente-Prueba · 5 USDT · 2030-01-01T12:00:00Z · PAYER_REQUIRES_ADMIN').wait_for(state='attached')
   assert not await page.get_by_label('Referencia bancaria o del proveedor · única').is_visible()
   assert await page.get_by_label('Aviso de correo relacionado · opcional, no confirma pago').get_attribute('required') is not None
   assert not errors,errors
   print(f'PASS {name}: fixed USDT/PEN, original QR, reload, close/Escape, error without QR, Lemon PEN, ADMIN receipt, no overflow')
   await page.close()
  await browser.close()
asyncio.run(run())
