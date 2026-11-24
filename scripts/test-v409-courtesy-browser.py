"""Production panel with synthetic RPC responses and accounts only."""
import os
from pathlib import Path
import shutil

from playwright.sync_api import expect, sync_playwright

HOST = os.environ.get('COURTESY_TEST_URL', 'http://127.0.0.1:8000')
OUT = Path('artifacts/v409')
OUT.mkdir(parents=True, exist_ok=True)
SERVICES = ('COBRA_YA', 'MI_COCHERA', 'MI_ALQUILER')
CUSTOMER = '10000000-0000-4000-8000-000000000002'

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=shutil.which('chromium') or shutil.which('google-chrome')
    )
    for width in (1366, 390, 320):
        page = browser.new_page(viewport={'width': width, 'height': 900})
        page.set_default_timeout(12000)
        enabled = dict.fromkeys(SERVICES, True)
        individual = dict.fromkeys(SERVICES, False)
        mutations = []
        errors = []
        admin = [True]

        def respond(route):
            request = route.request
            name = request.url.split('/rest/v1/')[-1].split('?')[0]
            if name == 'cc_admins':
                return route.fulfill(json=[{'user_id': 'fixture-admin'}] if admin[0] else [])
            if name == 'rpc/cc394_admin_directory':
                return route.fulfill(json={'rows': [{
                    'user_id': CUSTOMER, 'registry_code': 'CLAN-FIXTURE',
                    'registry_alias': 'Cliente de prueba', 'email': 'cliente@example.test',
                }], 'has_more': False, 'registered_users': 1})
            if name == 'rpc/cc409_admin_courtesy':
                data = request.post_data_json
                action = data['p_action']
                service = data.get('p_service')
                if action != 'read':
                    mutations.append(data)
                if action == 'registration':
                    enabled[service] = data['p_enabled']
                elif action in ('grant', 'revoke'):
                    individual[service] = action == 'grant'
                return route.fulfill(json=[{
                    'service': code, 'registration_enabled': enabled[code],
                    'active': individual[code] if data['p_user'] else False,
                    'ends_at': None,
                } for code in SERVICES])
            if name == 'rpc/cc_finance_wallet':
                return route.fulfill(json={'available_pen': '0.00'})
            if name == 'rpc/cc_finance_rates':
                return route.fulfill(json=[{'service': code, 'amount_pen': 15} for code in SERVICES])
            if name == 'rpc/cc_portal_my_business_access_v316':
                return route.fulfill(json={'business_access': [
                    {'service': code, 'status': 'INACTIVE' if admin[0] or code == 'STREAM_BULLS' else 'ACTIVE',
                     'active_until': None, 'funding': None if admin[0] or code == 'STREAM_BULLS' else 'COURTESY'}
                    for code in (*SERVICES, 'STREAM_BULLS')
                ]})
            assert not any(word in name for word in ('pay_membership', 'grant_bonus', 'activate_membership'))
            return route.fulfill(json=[])

        page.route('**/rest/v1/**', respond)
        page.route('**/functions/v1/**', lambda route: route.fulfill(json={}))
        page.route('**/auth/v1/**', lambda route: route.fulfill(json={'external': {}}))
        page.on('dialog', lambda dialog: dialog.accept())
        page.on('pageerror', lambda exception: errors.append(str(exception)))
        page.goto(HOST, wait_until='domcontentloaded')
        page.wait_for_function('window.cc166ReturnToBusinesses && window.cc409Courtesy')
        page.evaluate("""(url)=>{window.CC_V53_SESSION={root:url,key:'fixture',jwt:'fixture-admin',
                         userId:'fixture-admin',isAdmin:true};cc166ReturnToBusinesses()}""", HOST)
        page.get_by_role('button', name='Gestionar cortesías', exact=True).click()
        cards = page.locator('.cc409-card')
        expect(cards).to_have_count(3)
        cobra = cards.filter(has=page.get_by_role('heading', name='COBRA YA', exact=True))
        cobra.get_by_role('button', name='Desactivar para nuevos registros').click()
        expect(cobra.get_by_text('Nuevos registros: requieren pago')).to_be_visible()
        cobra.get_by_text('Finalizar cortesías ya otorgadas').click()
        cobra.locator('input[type=date]').fill('2099-12-31')
        cobra.get_by_role('button', name='Confirmar fin de cortesías').click()
        expect(page.get_by_text('Fin de cortesías guardado')).to_be_visible()
        assert mutations[-1]['p_until'] == '2100-01-01T05:00:00.000Z'
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        if width in (390,1366):
            page.screenshot(path=str(OUT / f'negocios-{width}.png'), animations='disabled')
        page.get_by_role('button', name='Buscar un cliente').click()
        page.locator('.cc246-user-details > summary').click()
        page.get_by_text('Cortesía por negocio', exact=True).click()
        expect(cards).to_have_count(3)
        cobra.get_by_role('button', name='Otorgar cortesía').click()
        expect(cobra.get_by_text('Cortesía activa sin vencimiento')).to_be_visible()
        assert mutations[-1]['p_user'] == CUSTOMER
        assert mutations[-1]['p_until'] is None
        if width in (390,1366):
            cobra.scroll_into_view_if_needed()
            page.screenshot(path=str(OUT / f'cliente-{width}.png'), animations='disabled')
        cobra.get_by_role('button', name='Retirar cortesía').click()
        expect(cobra.get_by_text('Sin cortesía activa')).to_be_visible()
        assert [change['p_action'] for change in mutations] == ['registration','end_existing','grant','revoke']
        admin[0] = False
        page.evaluate("""(url)=>{window.CC_V53_SESSION={root:url,key:'fixture',jwt:'fixture-customer',
                         userId:'fixture-customer'};cc166ReturnToBusinesses()}""", HOST)
        expect(page.get_by_role('button', name='Ingresar a COBRA YA', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Gestionar cortesías')).to_have_count(0)
        expect(page.get_by_text('Cortesía activa.', exact=False).first).to_be_visible()
        assert not errors, errors
        print('PASS cortesía ADMIN y cliente', width, flush=True)
        page.close()
    browser.close()
