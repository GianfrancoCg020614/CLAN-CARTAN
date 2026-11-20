"""Shared appearance persistence on the actual local page; no account or writes."""
import shutil
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
 c=b.new_context(color_scheme='dark');c.route('**/rest/v1/**',lambda r:r.fulfill(json=[]))
 page=c.new_page();page.goto('http://127.0.0.1:8000/',wait_until='domcontentloaded');page.wait_for_function('window.CCTheme');assert page.evaluate('CCTheme.get()')=='dark'
 page.evaluate("CCTheme.set('light')");page.reload(wait_until='domcontentloaded');assert page.evaluate('CCTheme.get()')=='light'
 other=c.new_page();other.goto('http://127.0.0.1:8000/',wait_until='domcontentloaded');other.evaluate("CCTheme.set('dark')");page.wait_for_function("CCTheme.get()==='dark'");assert page.locator('#cc77home [data-cc-theme-toggle]').count()==1
 page.emulate_media(color_scheme='light');assert page.evaluate('CCTheme.get()')=='dark';c.close()
 c=b.new_context(color_scheme='light');c.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('Storage unavailable')}})");page=c.new_page();page.goto('http://127.0.0.1:8000/',wait_until='domcontentloaded');page.wait_for_function('window.CCTheme');assert page.evaluate('CCTheme.get()')=='light';page.evaluate("CCTheme.set('dark')");assert page.evaluate('CCTheme.get()')=='dark';c.close();b.close()
print('PASS theme OS default, explicit preference, reload, cross-tab sync, blocked storage')
