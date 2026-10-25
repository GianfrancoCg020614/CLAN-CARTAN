import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activationWindow, serviceActivationWindow, canAutoPublish,
  allowedSelfRegistrationRoles, parsePenCents, calculateSaleSettlement,
  reserveAvailableStock, whatsappSellerLink, summarizeSellerEarnings,
  normalizeSmartSearch, matchesSmartSearch,
  STREAM_BULLS_ANNUAL_PEN_CENTS, EXTERNAL_ACCOUNT_ADDON_PEN_CENTS,
  DEFAULT_SUPER_RESELLER_COMMISSION_BPS, SERVICE_CATEGORIES
} from './streambulls-marketplace-rules.mjs';

test('STREAM BULLS: S/25 suscripción anual, inicio día 1, día 365 a las 23:59 Lima', () => {
  assert.equal(STREAM_BULLS_ANNUAL_PEN_CENTS, 2500);
  assert.deepEqual(serviceActivationWindow('STREAM_BULLS', '2026-10-24'), {
    startDate: '2026-10-24', endDate: '2027-10-23',
    displayEndsAt: '2027-10-23 23:59',
    expiresAtExclusiveLima: '2027-10-24 00:00',
    durationDays: 365, timezone: 'America/Lima'
  });
});

test('otros tres negocios: día de activación = día 1 y día 30 a las 23:59', () => {
  for (const service of ['COBRA_YA', 'MI_COCHERA', 'MI_ALQUILER']) {
    const w = serviceActivationWindow(service, '2026-10-02');
    assert.equal(w.endDate, '2026-10-31');
    assert.equal(w.displayEndsAt, '2026-10-31 23:59');
    assert.equal(w.expiresAtExclusiveLima, '2026-11-01 00:00');
  }
});

test('fecha calendario respeta meses de 28, 29, 30 y 31 días', () => {
  assert.equal(activationWindow('2026-02-01', 30).endDate, '2026-03-02');
  assert.equal(activationWindow('2028-02-01', 30).endDate, '2028-03-01');
  assert.throws(() => activationWindow('2026-02-30', 30));
  assert.throws(() => activationWindow('2026-10-02', 0));
});

test('un usuario se registra solo como AFILIADO o RESELLER, nunca SUPER_RESELLER', () => {
  assert.deepEqual(allowedSelfRegistrationRoles(), ['AFFILIATE', 'RESELLER']);
  assert.ok(!allowedSelfRegistrationRoles().includes('SUPER_RESELLER'));
});

test('solo nombramiento administrativo vigente habilita publicación sin validación individual', () => {
  const active = { role: 'SUPER_RESELLER', assignedByAdmin: true,
    membershipStart: '2026-10-24', referenceDay: '2027-10-23' };
  assert.equal(canAutoPublish(active), true);
  assert.equal(canAutoPublish({ ...active, referenceDay: '2027-10-24' }), false);
  assert.equal(canAutoPublish({ ...active, assignedByAdmin: false }), false);
  assert.equal(canAutoPublish({ ...active, role: 'RESELLER' }), false);
  assert.equal(canAutoPublish({ ...active, role: 'AFFILIATE' }), false);
  assert.equal(canAutoPublish({ ...active, suspended: true }), false);
});

test('comisión ADMIN del 20% sobre ganancia, no sobre bruto, con costo recuperado', () => {
  const sale = calculateSaleSettlement({unitPriceCents: 5000, unitCostCents: 3000});
  assert.equal(DEFAULT_SUPER_RESELLER_COMMISSION_BPS, 2000);
  assert.equal(sale.grossCents, 5000);
  assert.equal(sale.supplierCostCents, 3000);
  assert.equal(sale.grossProfitCents, 2000);
  assert.equal(sale.adminCommissionCents, 400);
  assert.equal(sale.sellerNetProfitCents, 1600);
  assert.equal(sale.sellerPayableCents, 4600);
});

test('tasa ADMIN variable por vendedor, aplicada a todas sus ventas', () => {
  const one = calculateSaleSettlement({unitPriceCents: 5000,unitCostCents: 3000,commissionBps: 3000});
  const second = calculateSaleSettlement({unitPriceCents: 1500,unitCostCents: 500,quantity: 3,commissionBps: 3000});
  assert.equal(one.adminCommissionCents, 600);
  assert.equal(second.adminCommissionCents, 900);
  assert.equal(one.sellerPayableCents + one.adminCommissionCents, one.grossCents);
  assert.equal(second.sellerPayableCents + second.adminCommissionCents, second.grossCents);
});

test('importe usa céntimos exactos y evita costos ficticios mayores a precio', () => {
  assert.equal(parsePenCents('25.00'), 2500);
  assert.equal(parsePenCents('0.10'), 10);
  assert.throws(() => parsePenCents('19.999'));
  assert.throws(() => calculateSaleSettlement({unitPriceCents:100,unitCostCents:120}));
  assert.throws(() => calculateSaleSettlement({unitPriceCents:200,unitCostCents:100,commissionBps:12000}));
});

test('stock disminuye solo tras reserva confirmada; rechaza sobreventa', () => {
  assert.equal(reserveAvailableStock(8,1), 7);
  assert.equal(reserveAvailableStock(8,8), 0);
  assert.throws(() => reserveAvailableStock(8,9));
  assert.throws(() => reserveAvailableStock(8,-1));
});

test('WhatsApp se calcula del teléfono comercial vigente, no del producto', () => {
  const product = 'Canva Pro 30 días';
  const old = whatsappSellerLink('987654321', product);
  const changed = whatsappSellerLink('+51 912 345 678', product);
  assert.match(old, /^https:\/\/wa\.me\/51987654321\?/);
  assert.match(changed, /^https:\/\/wa\.me\/51912345678\?/);
  assert.notEqual(old, changed);
  assert.throws(() => whatsappSellerLink('555'));
});

test('informe ADMIN separa en espera, confirmados, comisiones, pagos y saldo', () => {
  const first = calculateSaleSettlement({unitPriceCents:5000,unitCostCents:3000});
  const second = calculateSaleSettlement({unitPriceCents:1500,unitCostCents:500});
  const result = summarizeSellerEarnings([
    {id:'o1',sellerId:'s1',status:'DELIVERED_VERIFIED',...first},
    {id:'o2',sellerId:'s1',status:'PAID_AWAITING_DELIVERY',...second},
    {id:'o3',sellerId:'s2',status:'DELIVERED_VERIFIED',...first},
    {id:'o4',sellerId:'s1',status:'REFUNDED',...first}
  ],[
    {id:'p1',sellerId:'s1',status:'EXECUTED_VERIFIED',amountCents:2000},
    {id:'p2',sellerId:'s1',status:'REQUESTED',amountCents:3000}
  ],'s1');
  assert.equal(result.revenueCents,5000);
  assert.equal(result.commissionCents,400);
  assert.equal(result.heldCents,1500);
  assert.equal(result.payableEarnedCents,4600);
  assert.equal(result.paidOutCents,2000);
  assert.equal(result.availableForPayoutCents,2600);
});

test('no duplica órdenes ni desembolsos verificados', () => {
  const order = {id:'x',sellerId:'s',status:'DELIVERED_VERIFIED',grossCents:500,
    adminCommissionCents:100,sellerPayableCents:400};
  assert.throws(() => summarizeSellerEarnings([order,order],[],'s'));
  assert.throws(() => summarizeSellerEarnings([],[{id:'p',sellerId:'s',status:'EXECUTED_VERIFIED',amountCents:100},
    {id:'p',sellerId:'s',status:'EXECUTED_VERIFIED',amountCents:100}],'s'));
});

test('sobregiro de liquidación no genera saldo negativo disponible', () => {
  const order = {id:'x',sellerId:'s',status:'DELIVERED_VERIFIED',grossCents:500,
    adminCommissionCents:100,sellerPayableCents:400};
  const r = summarizeSellerEarnings([order],
    [{id:'p',sellerId:'s',status:'EXECUTED_VERIFIED',amountCents:800}],'s');
  assert.equal(r.availableForPayoutCents,0);
  assert.equal(r.amountToRecoverCents,400);
});

test('buscador inteligente admite coincidencia por servicio, cliente, placa y tildes', () => {
  assert.equal(normalizeSmartSearch('  CRUNCHYRÓLL  '),'crunchyroll');
  assert.ok(matchesSmartSearch('netf cuenta', ['Netflix Premium','Cuenta P2']));
  assert.ok(matchesSmartSearch('aBc-123', ['Toyota', 'ABC-123']));
  assert.ok(matchesSmartSearch('garcia', ['Juan García']));
  assert.equal(matchesSmartSearch('disney', ['Netflix Premium']),false);
});

test('categorías extensibles y módulo externo optativo de S/10', () => {
  assert.equal(EXTERNAL_ACCOUNT_ADDON_PEN_CENTS,1000);
  for(const x of ['NETFLIX','HBO_MAX','YOUTUBE','CHATGPT','PARAMOUNT_PLUS','PRIME_VIDEO','CANVA','CRUNCHYROLL','OTROS'])
    assert.ok(SERVICE_CATEGORIES.includes(x));
});
