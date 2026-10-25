import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync('scripts/v1635-wallet-resumen.js', 'utf8');
const loader = fs.readFileSync('scripts/v1635-rescate-ui.js', 'utf8');

function browser() {
  const elements = new Map();
  let changed;
  class El {
    constructor(tag = 'div') {
      this.tag = tag; this.children = []; this.hidden = false;
      this.textContent = ''; this.events = {};
      this.classList = { add() {}, remove() {} };
    }
    set id(v) { this._id = v; elements.set(v, this); }
    get id() { return this._id; }
    set innerHTML(html) {
      this.html = html;
      for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) {
        const child = new El();
        child.id = id;
        this.children.push(child);
      }
    }
    setAttribute() {}
    addEventListener(event, callback) { this.events[event] = callback; }
    append(...nodes) { this.children.push(...nodes); }
    after(node) { this.afterNode = node; }
    replaceChildren(...nodes) { this.children = nodes; }
    remove() {
      if (this._id) elements.delete(this._id);
      if (this.html) for (const [, id] of this.html.matchAll(/\bid="([^"]+)"/g)) elements.delete(id);
    }
  }
  const root = new El(); root.id = 'cc77home';
  const user = new El(); user.id = 'cc95-user';
  const previous = new El(); previous.id = 'cc116-account-balances';
  const document = {
    readyState: 'complete',
    body: new El('body'),
    getElementById: id => elements.get(id) ?? null,
    createElement: tag => new El(tag),
    addEventListener() {}
  };
  const window = {
    CC_V53_SESSION: null,
    cc80: { api: async () => [] },
    addEventListener() {}
  };
  const sandbox = {
    document, window,
    MutationObserver: class { constructor(cb) { changed = cb; } observe() {} },
    requestAnimationFrame: cb => cb()
  };
  vm.runInNewContext(code, sandbox, { filename: 'v1635-wallet-resumen.js' });
  return {
    window, elements, previous,
    mutation: () => changed(),
    tick: () => new Promise(resolve => setImmediate(resolve))
  };
}

test('recuperación conserva el código visual y agrega solo consulta autenticada', () => {
  assert.match(loader, /v1635-wallet-resumen\.js\?v=1637/);
  assert.match(code, /cc_real_service_wallets\?select=service,balance_pen&user_id=eq\./);
  for (const forbidden of ['rpc/mc_transfer_real_balance', 'rpc/cc_', 'wallet_approve', 'service_role']) {
    assert.ok(!code.includes(forbidden), 'El resumen NO debe operar: ' + forbidden);
  }
  for (const service of ['STREAM_BULLS', 'COBRA_YA', 'MI_COCHERA', 'MI_ALQUILER'])
    assert.ok(code.includes(service), 'Falta ' + service);
});

test('una sola vista del saldo real, bonos no sumados y logout sin fuga de datos', async () => {
  const b = browser();
  const seen = [];
  b.window.cc80.api = async path => {
    seen.push(path);
    return [
      { service: 'COBRA_YA', balance_pen: '12.50' },
      { service: 'STREAM_BULLS', balance_pen: '3.00' },
      { service: 'MI_COCHERA', balance_pen: 5 },
      { service: 'MI_ALQUILER', balance_pen: 0 }
    ];
  };
  b.window.CC_V53_SESSION = { jwt: 'token1', userId: 'u1' };
  b.mutation();
  await b.tick();
  assert.equal(b.elements.get('cc164-total').textContent, 'S/ 20.50');
  assert.equal(b.elements.get('cc164-wallet-breakdown').children.length, 4);
  assert.equal(b.previous.hidden, true);
  assert.equal(seen.length, 1);
  assert.match(seen[0], /user_id=eq\.u1/);
  assert.match(b.elements.get('cc164-wallet').html, /Bonos de activación ADMIN/);
  b.window.CC_V53_SESSION = null;
  b.mutation();
  assert.equal(b.elements.has('cc164-wallet'), false);
  assert.equal(b.elements.has('cc164-total'), false);
  assert.equal(b.previous.hidden, false);
});

test('no inventa dinero ante respuestas inválidas y permite reintentar', async () => {
  const b = browser();
  b.window.cc80.api = async () => [
    { service: 'COBRA_YA', balance_pen: '4.001' }
  ];
  b.window.CC_V53_SESSION = { jwt: 'token2', userId: 'u2' };
  b.mutation();
  await b.tick();
  assert.equal(b.elements.get('cc164-total').textContent, 'No disponible');
  assert.equal(b.previous.hidden, false);
  b.window.cc80.api = async () => [{ service: 'COBRA_YA', balance_pen: '2.75' }];
  b.window.cc164RefreshRealWallet();
  await b.tick();
  assert.equal(b.elements.get('cc164-total').textContent, 'S/ 2.75');
  assert.equal(b.previous.hidden, true);
});

test('rechaza duplicados y descarta respuestas de una sesión anterior', async () => {
  const b = browser();
  b.window.cc80.api = async () => [
    { service: 'COBRA_YA', balance_pen: 1 },
    { service: 'COBRA_YA', balance_pen: 2 }
  ];
  b.window.CC_V53_SESSION = { jwt: 'old', userId: 'u3' };
  b.mutation();
  await b.tick();
  assert.equal(b.elements.get('cc164-total').textContent, 'No disponible');
  let release;
  b.window.cc80.api = () => new Promise(resolve => { release = resolve; });
  b.window.cc164RefreshRealWallet();
  b.window.CC_V53_SESSION = { jwt: 'new', userId: 'u4' };
  b.window.cc80.api = async () => [{ service: 'STREAM_BULLS', balance_pen: '6.00' }];
  b.mutation();
  await b.tick();
  assert.equal(b.elements.get('cc164-total').textContent, 'S/ 6.00');
  release([{ service: 'STREAM_BULLS', balance_pen: 9000 }]);
  await b.tick();
  assert.equal(b.elements.get('cc164-total').textContent, 'S/ 6.00');
});


test('al cambiar de sesión borra inmediatamente el saldo y desglose previos', async () => {
  const b = browser();
  b.window.cc80.api = async () => [{ service: 'COBRA_YA', balance_pen: '50.00' }];
  b.window.CC_V53_SESSION = { jwt: 'first', userId: 'u-first' };
  b.mutation();
  await b.tick();
  assert.equal(b.elements.get('cc164-total').textContent, 'S/ 50.00');
  assert.equal(b.elements.get('cc164-wallet-breakdown').children.length, 4);
  let finish;
  b.window.cc80.api = () => new Promise(resolve => { finish = resolve; });
  b.window.CC_V53_SESSION = { jwt: 'second', userId: 'u-second' };
  b.mutation();
  assert.equal(b.elements.get('cc164-total').textContent, 'Consultando…');
  assert.equal(b.elements.get('cc164-wallet-breakdown').children.length, 0);
  assert.equal(b.previous.hidden, false);
  finish([{ service: 'COBRA_YA', balance_pen: '2.00' }]);
  await b.tick();
  assert.equal(b.elements.get('cc164-total').textContent, 'S/ 2.00');
});
