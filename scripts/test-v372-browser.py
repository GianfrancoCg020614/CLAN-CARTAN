"""Local browser integration tests. Routes V371 RPCs to isolated PostgreSQL, never production.
Run with the local server at :8000 and V372 test database. Never uses production APIs.
"""
import json, re, subprocess, pathlib, time, os, shutil
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'v372'
OUT.mkdir(parents=True,exist_ok=True)
OWNER='00000000-0000-4000-8000-000000000001'
EMPTY='00000000-0000-4000-8000-000000000003'
DB=os.environ.get('V371_PG_DATABASE','v372validated')
CONTAINER=os.environ.get('V371_PG_CONTAINER','cobra-v371-test')

def sql(query):
    run=subprocess.run(['docker','exec',CONTAINER,'psql','-U','postgres','-d',DB,'-qAt','-v','ON_ERROR_STOP=1','-c',query],capture_output=True,text=True)
    if run.returncode: raise RuntimeError(run.stderr)
    return run.stdout.strip()

def literal(v):
    if v is None:return 'null'
    if isinstance(v,bool):return 'true' if v else 'false'
    if isinstance(v,(int,float)):return str(v)
    raw=json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else str(v)
    return "'"+raw.replace("'","''")+"'"

sql("update cc_internal.test_access set active=true;")
sql("insert into auth.users values('"+EMPTY+"') on conflict do nothing;insert into cc_internal.test_access(user_id,active) values('"+EMPTY+"',true) on conflict(user_id) do update set active=true;")

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1280,'height':800},device_scale_factor=1)
    errors=[]
    context.add_init_script("window.print=()=>{window.__printed=true;}")
    context.on('weberror',lambda e: errors.append(str(e.error)))
    offline=False
    access_denied=False
    lost_payment=False
    requests=[]

    def route_api(route):
        nonlocal_dummy=None
        global lost_payment
        req=route.request
        name=req.url.split('/rest/v1/')[-1].split('?')[0]
        if name.startswith(('rpc/cy371_','rpc/cy372_')):
            if offline:
                route.abort('failed');return
            data=req.post_data_json or {}
            if not re.fullmatch(r'rpc/cy37[12]_[a-z_]+',name) or any(not re.fullmatch(r'p_[a-z_]+',k) for k in data):
                route.fulfill(status=400,json={'message':'Invalid local test RPC'});return
            if name=='rpc/cy371_access' and access_denied:
                route.fulfill(json={'allowed':False,'active':False,'authorized':True,'admin':False,'expires_at':None});return
            actor=EMPTY if req.headers.get('authorization')=='Bearer local-empty' else OWNER
            args=','.join(k+'=>'+literal(v) for k,v in data.items())
            query=f"begin;set local role authenticated;set local request.jwt.claim.sub='{actor}';select to_jsonb(public.{name[4:]}({args}));commit;"
            try:
                value=json.loads(sql(query))
                requests.append((name,data))
                if lost_payment and name=='rpc/cy371_mutate' and data.get('p_kind')=='payment':
                    lost_payment=False;route.abort('failed');return
                route.fulfill(json=value)
            except Exception as e:
                route.fulfill(status=400,json={'message':str(e),'code':'P0001'})
        elif name=='rpc/cc_finance_activate_membership':
            route.fulfill(json={'service':'COBRA_YA','status':'ACTIVE','amount_pen':15,'active_until':'2026-12-31T23:59:59Z'})
        elif name=='rpc/cc_finance_wallet':
            route.fulfill(json={'available_pen':'17.00'})  # Explicit LOCAL fixture; no wallet movement.
        else:
            route.fulfill(json=[])

    context.route('**/rest/v1/**',route_api)
    page=context.new_page()
    page.goto('http://127.0.0.1:8000/',wait_until='domcontentloaded')
    page.wait_for_function("document.querySelector('#cy53layer.cy371-layer')")
    page.evaluate("""() => {window.CC_V53_SESSION={root:location.origin,key:'local-test',jwt:'local-test',userId:'00000000-0000-4000-8000-000000000001',isReseller:true,isAdmin:false};return window.cy53.open();}""")
    page.wait_for_selector('.cy371-layout:not([hidden])')
    page.wait_for_selector('.cy371-table tbody tr')
    assert page.locator('.cy371-header').count()==1
    page.screenshot(path=str(OUT/'debug-desktop.png'));print('Module images:',page.locator('#cy53layer img').evaluate_all('(els)=>els.map(e=>({src:e.src.slice(0,100),parent:e.parentElement.className,visible:!!e.getClientRects().length}))'));assert page.locator('#cy53layer img:visible').count()==1
    assert page.locator('#cy368board,#cc154CobraBrand,.cy75quick').count()==0
    assert page.locator('.cy371-main').evaluate('(e)=>e.scrollWidth<=e.clientWidth')
    print('PASS desktop structure and multimoneda')
    for term in ['Juan','Rodríguez','Juanca','987654321','654321','Pérez Juan','12345678','PR-0001']:
        page.locator('#cy371search').fill(term)
        page.wait_for_timeout(270)
        page.wait_for_function("document.querySelector('#cy371results').textContent!=='Buscando…'")
        assert page.locator('#cy371results button').count()>0,(term,page.locator('#cy371results').inner_text())
    page.locator('#cy371results button').first.click()
    page.wait_for_selector('dialog[open]')
    assert page.locator('.cy371-dialog').inner_text()
    page.locator('[data-action=close-modal]').click()
    print('PASS live search with PostgreSQL')
    for action,title in [('new-loan','Nuevo préstamo · Seleccionar cliente'),('new-payment','Registrar abono · Buscar cliente')]:
        page.locator('.cy371-actions [data-action='+action+']').click()
        page.locator('#cy371pickClient').fill('Juanca')
        page.wait_for_selector('#cy371pickResults button')
        page.locator('#cy371pickResults button').first.click()
        page.wait_for_selector('.cy371-dialog')
        page.locator('[data-action=close-modal]').click()
    print('PASS quick-action client pickers')

    # Create a real LOCAL test client through the actual form, twice in quick succession.
    page.locator('.cy371-actions [data-action=new-client]').click()
    name='Cliente navegador '+str(int(time.time()))
    page.locator('.cy371-dialog input[name=full_name]').fill(name)
    page.locator('.cy371-dialog input[name=alias]').fill('Prueba responsive')
    page.locator('.cy371-dialog input[name=phone]').fill('987111222')
    page.locator('.cy371-dialog form').evaluate('(f)=>{f.requestSubmit();f.requestSubmit();}')
    page.wait_for_function("document.querySelector('#cy371dialogTitle')?.textContent==='Ficha del cliente'")
    assert int(sql("select count(*) from public.cy_clients where full_name="+literal(name)))==1
    page.locator('.cy371-dialog [data-action^="client-loan:"]').click()
    page.locator('.cy371-dialog input[name=principal]').fill('1000')
    page.locator('.cy371-dialog select[name=currency]').select_option('USD')
    page.locator('.cy371-dialog button[type=submit]').click()
    page.wait_for_function("document.querySelector('#cy371dialogTitle')?.textContent.startsWith('Préstamo PR-')")
    loan_id=sql('select id from public.cy_loans where client_id=(select id from public.cy_clients where full_name='+literal(name)+')')
    page.locator('.cy371-dialog [data-action="payment:'+loan_id+'"]').click()
    page.locator('.cy371-dialog input[name=amount]').fill('50.01')
    page.locator('.cy371-dialog select[name=payment_method]').select_option('Efectivo')
    page.locator('.cy371-dialog input[type=checkbox]').check()
    lost_payment=True
    page.locator('.cy371-dialog button[type=submit]').click()
    page.wait_for_function("document.querySelector('.cy371-dialog button[type=submit]')?.textContent==='Reintentar'")
    page.locator('.cy371-dialog button[type=submit]').click()
    page.wait_for_function("document.querySelector('#cy371dialogTitle')?.textContent==='Comprobante de abono'")
    assert int(sql("select count(*) from public.cy_payments where loan_id="+literal(loan_id)))==1
    assert sql("select sum(amount-paid_total) from public.cy_installments where loan_id="+literal(loan_id))=='1249.99'
    print('PASS forms, double submission and lost-response idempotency')
    # Receipt downloads/sharing are read-only and use the confirmed payment UUID.
    before=sql("select count(*) from public.cy_payments")
    assert page.locator('.cy372-receipt').inner_text().find('Comprobante interno')>=0
    assert 'www.ClanCartan.com' in page.locator('.cy372-receipt').inner_text()
    with page.expect_download() as receipt_download:
        page.locator('[data-action^="receipt-pdf:"]').click()
    receipt_path=OUT/'comprobante-local.pdf';receipt_download.value.save_as(str(receipt_path))
    reader=PdfReader(receipt_path)
    assert len(reader.pages)==1 and float(reader.pages[0].mediabox.width)==595
    assert reader.pages[0].images[0].image.size==(1190,1684)
    assert page.locator('dialog[open] a[href^="https://wa.me/"]').count()==1
    link=page.locator('dialog[open] a[href^="https://wa.me/"]').get_attribute('href')
    from urllib.parse import unquote
    assert 'www.ClanCartan.com' in unquote(link) and 'Abono registrado correctamente' in unquote(link)
    page.evaluate("""()=>{const open=window.open;window.open=(...args)=>{const popup=open.apply(window,args);if(popup)popup.print=()=>{popup.__printed=true;};return popup;};}""")
    with page.expect_popup() as print_popup:
        page.locator('[data-action^="receipt-print:"]').click()
    popup=print_popup.value
    try:popup.wait_for_function('window.__printed===true',timeout=5000)
    except Exception:
        print('PRINT DEBUG',popup.url,popup.locator('body').inner_text()[:600],page.locator('#cy371status').inner_text(),errors,popup.evaluate('({ready:document.readyState,printed:window.__printed,print:String(window.print)})'));raise
    assert 'Comprobante interno de abono' in popup.locator('body').inner_text();popup.close()
    assert sql("select count(*) from public.cy_payments")==before
    page.screenshot(path=str(OUT/'comprobante-pc-local.png'))
    print('PASS actual PDF parse/render dimensions, print document, WhatsApp receipt link and zero extra payments')

    # Atrás now restores prior dialogs instead of discarding their context.
    while page.locator('dialog[open]').count():
        page.locator('[data-action=close-modal]').click()

    page.locator('.cy371-sidebar [data-action="nav:clients"]').click()
    page.wait_for_selector('.cy371-table tbody tr')
    page.locator('.cy371-table [data-action^="client:"]').first.click()
    for tab in ['loans','payments','schedule','collateral','history','general']:
        page.locator(f'.cy371-dialog [data-action$=":{tab}"]').click()
        page.wait_for_selector('#cy371dossierBody')
        page.wait_for_timeout(120)
        assert 'Cargando…' not in page.locator('#cy371dossierBody').inner_text()
    page.locator('[data-action=close-modal]').click()
    page.locator('.cy371-sidebar [data-action="nav:reports"]').click()
    with page.expect_download() as download:
        page.locator('[data-action=export]').click()
    assert download.value.suggested_filename.endswith('.csv')
    page.locator('.cy371-sidebar [data-action="nav:home"]').click()
    page.wait_for_selector('.cy371-table tbody tr')
    page.locator('[data-action=attention]').click()
    page.locator('.cy371-dialog [data-action="attention-filter:today"]').click()
    page.wait_for_selector('.cy371-table tbody tr')
    print('PASS navigation, six tabs, attention and report export')
    page.locator('.cy371-sidebar [data-action="nav:due"]').click()
    page.wait_for_selector('#cy372bucket');page.locator('#cy372currency').select_option('EUR')
    page.wait_for_function("document.querySelector('.cy372-agenda')?.textContent.match(/50[.,]00/)")
    assert page.locator('.cy372-agenda tbody tr').count()==1
    page.locator('#cy372bucket').select_option('tomorrow')
    page.wait_for_function("document.querySelector('.cy372-agenda')?.textContent.match(/100[.,]00/)")
    page.locator('.cy372-agenda [data-action^="whatsapp:"]').click()
    page.wait_for_selector('textarea[aria-label="Mensaje"]')
    message=page.locator('textarea[aria-label="Mensaje"]').input_value()
    assert message.startswith('🐍 COBRA YA!') and message.endswith('www.ClanCartan.com')
    assert '€ 100.00 EUR' in message and '87654321' not in message
    page.locator('[data-action=close-modal]').click()
    page.locator('#cy372bucket').select_option('late');page.wait_for_selector('.cy371-empty')
    assert 'Sin registros' in page.locator('#cy371content').inner_text()
    page.locator('#cy372currency').select_option('JPY')
    page.wait_for_selector('.cy372-agenda');assert page.locator('.cy372-agenda tbody tr').count()==1
    page.screenshot(path=str(OUT/'agenda-pc-local.png'))
    page.locator('.cy371-sidebar [data-action="nav:reports"]').click()
    page.wait_for_selector('.cy372-financials article')
    assert 'Sin desglose registrado' in page.locator('.cy372-financials').inner_text()
    for cur in ['PEN','USD','EUR','GBP','JPY']:
        page.locator('#cy372reportcurrency').select_option(cur)
        assert page.locator('.cy372-financials article').count()==1
        assert page.locator('.cy372-financials h3').inner_text()==cur
    print('PASS agenda today/tomorrow/overdue without duplicates, exact WhatsApp amounts and financial currencies')
    # Existing modification dialogs now show a read-only preview before confirmation.
    corrections_before=sql("select count(*) from public.cy_loan_corrections where loan_id="+literal(loan_id))
    page.evaluate('id=>window.cy53.openDetail(id)',loan_id)
    page.wait_for_selector('.cy371-dialog [data-action^="actions:"]');page.locator('.cy371-dialog [data-action^="actions:"]').click()
    page.locator('.cy371-dialog [data-action^="extend:"]').click()
    page.wait_for_selector('form[data-preview-valid="true"]')
    assert 'Vista previa de condiciones' in page.locator('.cy371-preview').inner_text()
    page.locator('dialog[open] input[name=months]').fill('2')
    assert page.locator('form[data-preview-valid="true"]').count()==1
    page.locator('[data-action=close-modal]').click()
    page.locator('.cy371-dialog [data-action^="correct:"]').click()
    page.wait_for_selector('form[data-preview-valid="true"]')
    page.locator('dialog[open] input[name=principal]').fill('900')
    assert '1,170.00' in page.locator('.cy371-preview').inner_text()
    assert sql("select count(*) from public.cy_loan_corrections where loan_id="+literal(loan_id))==corrections_before
    while page.locator('dialog[open]').count():page.locator('[data-action=close-modal]').click()
    page.locator('.cy371-actions [data-action=new-loan]').click();page.locator('#cy371pickClient').fill('Anita')
    page.wait_for_selector('#cy371pickResults button');page.locator('#cy371pickResults button').first.click()
    page.locator('dialog[open] input[name=principal]').fill('0.01');page.locator('dialog[open] input[name=monthly_rate]').fill('0')
    assert '0.01' in page.locator('#cy371preview').inner_text()
    while page.locator('dialog[open]').count():page.locator('[data-action=close-modal]').click()
    print('PASS extension/correction previews without writes; one-cent loan preview')



    # Capture real browser-rendered UI with local fixtures (explicitly NOT production data).
    page.locator('.cy371-sidebar [data-action="nav:home"]').click()
    page.wait_for_timeout(300)
    page.locator('#cy371search').fill('');page.locator('#cy371search').blur();page.evaluate("document.getElementById('cy53layer').scrollTop=0");page.wait_for_timeout(150);page.screenshot(path=str(OUT/'pc-local.png'),full_page=False)
    for width,height in [(390,844),(320,740),(844,390)]:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(350)
        page.screenshot(path=str(OUT/f'debug-{width}.png'));print('Overflow',width,page.locator('#cy53layer').evaluate('(root)=>[...root.querySelectorAll("*")].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,w:e.getBoundingClientRect().width,r:e.getBoundingClientRect().right}))'));assert page.locator('#cy53layer').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),(width,height)
        page.locator('[data-action=menu]').first.click()
        if width<=1000:
            assert page.locator('.drawer-open').count()==1
            page.locator('.cy371-sidebar [data-action="nav:clients"]').click()
            assert page.locator('.drawer-open').count()==0
        else:
            page.locator('[data-action=menu]').first.click()
        page.locator('.cy371-tabs [data-action="nav:home"]').click()
        page.wait_for_timeout(180)
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate("document.getElementById('cy53layer').scrollTop=0");page.wait_for_timeout(350);page.screenshot(path=str(OUT/'celular-local.png'),full_page=False)
    page.locator('.cy371-actions [data-action=new-client]').click()
    assert page.locator('.cy371-dialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
    page.locator('[data-action=close-modal]').click()
    print('PASS mobile 390px, 320px, landscape, drawer and dialogs')
    page.locator('[data-action=attention]').click();page.locator('[data-action="attention-filter:today"]').click()
    page.wait_for_selector('#cy372currency');page.locator('#cy372currency').select_option('EUR')
    page.wait_for_selector('.cy372-agenda')
    assert page.locator('#cy53layer').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
    page.screenshot(path=str(OUT/'agenda-celular-local.png'))
    page.locator('.cy372-agenda [data-action^="whatsapp:"]').click();page.wait_for_selector('textarea[aria-label="Mensaje"]')
    assert '€ 50.00 EUR' in page.locator('textarea[aria-label="Mensaje"]').input_value()
    page.screenshot(path=str(OUT/'whatsapp-celular-local.png'));page.locator('[data-action=close-modal]').click()
    page.evaluate('id=>window.cy53.openDetail(id)',loan_id);page.wait_for_selector('dialog[open] details')
    page.locator('dialog[open] summary').filter(has_text='Pagos y abonos').click()
    page.locator('dialog[open] [data-action^="receipt:"]').click();page.wait_for_selector('.cy372-receipt')
    assert page.locator('dialog[open]').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
    page.screenshot(path=str(OUT/'comprobante-celular-local.png'))
    with page.expect_download() as mobile_pdf:page.locator('[data-action^="receipt-pdf:"]').click()
    mobile_pdf.value.save_as(str(OUT/'comprobante-celular-local.pdf'))
    assert len(PdfReader(OUT/'comprobante-celular-local.pdf').pages)==1
    while page.locator('dialog[open]').count():page.locator('[data-action=close-modal]').click()
    print('PASS mobile agenda, WhatsApp preview, popup close and actual PDF download')


    page.locator('[data-action="stat:loans"]').click();page.wait_for_selector('#cy371controls [data-action=refresh]')
    offline=True
    page.locator('#cy371controls [data-action=refresh]').click()
    page.wait_for_timeout(500)
    assert page.locator('#cy371status').inner_text()
    offline=False
    access_denied=True
    page.evaluate("window.dispatchEvent(new Event('focus'))")
    page.wait_for_selector('.cy371-gate:not([hidden])')
    assert page.locator('.cy371-layout').is_hidden()
    assert page.locator('#cy371content').inner_text()==''
    print('PASS network failure and fail-closed expired activation')
    access_denied=False
    page.locator('[data-action=check-access]').click()
    page.wait_for_selector('.cy371-layout:not([hidden])')
    page.locator('[data-action=back]').click()
    assert page.evaluate('!!window.CC_V53_SESSION?.jwt')
    assert page.locator('#cy53layer').is_hidden()
    print('PASS CLAN CARTAN return preserves session')
    # Existing account tools remain functional and preserve the shared session.
    page.evaluate('window.cy53.open()')
    page.wait_for_selector('.cy371-layout:not([hidden])')
    page.locator('[data-action=profile]').click()
    page.wait_for_selector('#cc166-panel:not([hidden])')
    page.evaluate('window.cy53.open()')
    page.wait_for_selector('.cy371-layout:not([hidden])')
    page.locator('.cy371-wallet [data-action=wallet]').click()
    page.wait_for_selector('#cc166-panel:not([hidden])')
    assert page.evaluate('!!window.CC_V53_SESSION?.jwt')
    print('PASS existing profile and wallet navigation')
    # Navigation after the EXISTING payment flow receives a confirmed server response.
    # The reply here is a LOCAL fixture, not a real membership purchase.
    page.evaluate("window.cc166OpenBusiness('COBRA_YA')")
    page.wait_for_selector('#cc345-business-modal')
    page.once('dialog',lambda d:d.accept())
    page.locator('#cc345-business-modal button',has_text='Pagar para activar').click()
    page.wait_for_selector('.cy371-layout:not([hidden])')
    assert page.locator('#cc166-panel').is_hidden()
    print('PASS automatic entry after confirmed Cobra activation (local reply fixture)')
    # A real empty local owner verifies empty-state layout and user-switch clearing.
    page.evaluate("() => {window.CC_V53_SESSION.userId='00000000-0000-4000-8000-000000000003';window.CC_V53_SESSION.jwt='local-empty';return window.cy53.open();}")
    page.wait_for_function("document.querySelector('#cy371content').textContent.includes('No hay préstamos')")
    assert 'Cliente navegador' not in page.locator('#cy371content').inner_text()
    for width,height,name in [(1280,800,'pc-vacio-local.png'),(390,844,'celular-vacio-local.png')]:
        page.set_viewport_size({'width':width,'height':height})
        page.evaluate("document.getElementById('cy53layer').scrollTop=0")
        page.wait_for_timeout(350)
        assert page.locator('#cy53layer').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
        page.screenshot(path=str(OUT/name),full_page=False)
    print('PASS empty data and clearing previous owner state')
    (OUT/'browser-results.json').write_text(json.dumps({'errors':errors,'rpc_calls':len(requests),'screenshots':'LOCAL fixtures; not production data'},ensure_ascii=False,indent=2))
    print('Uncaught page errors:',errors)
    browser.close()
