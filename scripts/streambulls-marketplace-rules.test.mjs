import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activationWindow, serviceActivationWindow, canAutoPublish,
  streamBullsRoleCapabilities, externalAddonRenewalWindow,
  externalAddonAccessState, externalAddonActivationQuote,
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


test('RESELLER compra en la web y revende FUERA sin permisos de catálogo ni compradores propios del portal', () => {
  const r = streamBullsRoleCapabilities('RESELLER');
  assert.equal(r.canPurchaseInMarketplace, true);
  assert.equal(r.canPublishMarketplaceProducts, false);
  assert.equal(r.canTrackOwnMarketplaceBuyers, false);
  assert.equal(r.canResellPrivatelyOutsidePortal, true);
  assert.equal(r.canOfferPrivateExternalAccountAddon, true);
  const s = streamBullsRoleCapabilities('SUPER_RESELLER');
  assert.equal(s.canPublishMarketplaceProducts, true);
  assert.equal(s.canTrackOwnMarketplaceBuyers, true);
  assert.equal(s.canOfferPrivateExternalAccountAddon, false);
  const affiliate = streamBullsRoleCapabilities('AFFILIATE');
  assert.equal(affiliate.canPurchaseInMarketplace, true);
  assert.equal(affiliate.canPublishMarketplaceProducts, false);
  assert.equal(affiliate.canOfferPrivateExternalAccountAddon, false);
});

test('pestaña externa independiente cuesta S/10 por 30 días, día del pago = día 1', () => {
  const r = externalAddonRenewalWindow('2026-10-24');
  assert.equal(r.startDate, '2026-10-24');
  assert.equal(r.endDate, '2026-11-22');
  assert.equal(r.displayEndsAt, '2026-11-22 23:59');
  assert.equal(r.expiresAtExclusiveLima, '2026-11-23 00:00');
  assert.equal(r.durationDays, 30);
});

test('al vencer la pestaña, ocultar registros sin borrar ninguna cuenta o cliente', () => {
  const before = externalAddonAccessState({ role:'RESELLER', addonStartsOn:'2026-10-24',
    addonEndsOn:'2026-11-22', today:'2026-11-22' });
  assert.equal(before.active, true);
  assert.equal(before.canReadExternalRecords, true);
  assert.equal(before.canWriteExternalRecords, true);
  const expired = externalAddonAccessState({role:'RESELLER', addonStartsOn:'2026-10-24',
    addonEndsOn:'2026-11-22', today:'2026-11-23'});
  assert.equal(expired.active, false);
  assert.equal(expired.showPrivateExternalRecords, false);
  assert.equal(expired.canReadExternalRecords, false);
  assert.equal(expired.canWriteExternalRecords, false);
  assert.equal(expired.canExportExternalRecords, false);
  assert.equal(expired.showActivationCard, true);
  assert.equal(expired.shouldDeleteStoredRecords, false);
});

test('pestaña de cuentas externas NO es visible para AFILIADO o SÚPER RESELLER', () => {
  for (const role of ['AFFILIATE','SUPER_RESELLER','ADMIN']) {
    const state = externalAddonAccessState({role, addonStartsOn:'2026-10-24',
      addonEndsOn:'2026-11-22', today:'2026-10-25'});
    assert.equal(state.active,false);
    assert.equal(state.showActivationCard,false);
    assert.equal(state.shouldDeleteStoredRecords,false);
  }
});

test('cobro S/10 requiere autorización explícita y fondos REALES suficientes', () => {
  const base={role:'RESELLER',mainMembershipActive:true,walletRealBalanceCents:1000,
    today:'2026-11-23'};
  const noConsent = externalAddonActivationQuote({...base,consentedForThisPurchase:false});
  assert.equal(noConsent.permitted,false);
  assert.equal(noConsent.reason,'CONFIRMATION_REQUIRED');
  const noFunds = externalAddonActivationQuote({...base,walletRealBalanceCents:999,
    consentedForThisPurchase:true});
  assert.equal(noFunds.permitted,false);
  assert.equal(noFunds.reason,'INSUFFICIENT_REAL_BALANCE');
  const confirmed = externalAddonActivationQuote({...base,consentedForThisPurchase:true});
  assert.equal(confirmed.permitted,true);
  assert.equal(confirmed.amountCents,1000);
  assert.equal(confirmed.automaticRecurringCharge,false);
  assert.equal(confirmed.entitlementPeriod.startDate,'2026-11-23');
  assert.equal(confirmed.entitlementPeriod.endDate,'2026-12-22');
});

test('complemento RESELLER no requiere revisión ADMIN pero nunca lo activa otro rol', () => {
  for (const role of ['AFFILIATE','SUPER_RESELLER','ADMIN']) {
    assert.equal(externalAddonActivationQuote({role,mainMembershipActive:true,
      walletRealBalanceCents:9000,consentedForThisPurchase:true,today:'2026-10-24'}).permitted,false);
  }
  assert.equal(externalAddonActivationQuote({role:'RESELLER',mainMembershipActive:false,
    walletRealBalanceCents:9000,consentedForThisPurchase:true,today:'2026-10-24'}).permitted,false);
});

test('renovación anticipada del add-on conserva días restantes y añade 30 nuevos', () => {
  const q = externalAddonActivationQuote({role:'RESELLER',mainMembershipActive:true,
    walletRealBalanceCents:3000,consentedForThisPurchase:true,today:'2026-11-20',
    currentAddonEndOn:'2026-11-22'});
  assert.equal(q.permitted,true);
  assert.equal(q.entitlementPeriod.startDate,'2026-11-23');
  assert.equal(q.entitlementPeriod.endDate,'2026-12-22');
  assert.throws(() => externalAddonRenewalWindow('2026-11-20','2026-02-30'));
});

test('rol suspendido no ve datos ni tiene derecho de comprar complemento', () => {
  const state = externalAddonAccessState({role:'RESELLER',addonStartsOn:'2026-10-24',
    addonEndsOn:'2026-11-22',today:'2026-10-25',suspended:true});
  assert.equal(state.active,false);
  assert.equal(state.shouldDeleteStoredRecords,false);
  const quote = externalAddonActivationQuote({role:'RESELLER',mainMembershipActive:true,
    walletRealBalanceCents:1000,consentedForThisPurchase:true,today:'2026-10-25',suspended:true});
  assert.equal(quote.permitted,false);
});
