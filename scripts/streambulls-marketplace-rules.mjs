/** CLAN CARTAN · STREAM BULL'S · contrato puro V163.5+ (24 OCT 2026).
 * Sin credenciales, llamadas de red ni operaciones sobre fondos.
 * Las reglas deben replicarse y verificarse en el servidor antes de habilitar ventas.
 */
export const STREAM_BULLS_ANNUAL_PEN_CENTS = 2500;
export const STREAM_BULLS_ANNUAL_DAYS = 365;
export const OTHER_BUSINESS_DAYS = 30;
export const EXTERNAL_ACCOUNT_ADDON_PEN_CENTS = 1000;
export const DEFAULT_SUPER_RESELLER_COMMISSION_BPS = 2000; // 20 % de margen.
export const SERVICE_CATEGORIES = Object.freeze([
  'NETFLIX', 'HBO_MAX', 'YOUTUBE', 'CHATGPT', 'PARAMOUNT_PLUS',
  'PRIME_VIDEO', 'CANVA', 'CRUNCHYROLL', 'OTROS'
]);
export const CORE_SERVICES = Object.freeze([
  'STREAM_BULLS', 'COBRA_YA', 'MI_COCHERA', 'MI_ALQUILER'
]);

function integer(value, label, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) {
    throw new RangeError(label + ' inválido');
  }
  return value;
}
export function parsePenCents(value) {
  const match = /^(0|[1-9]\d{0,11})(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) throw new TypeError('Importe PEN inválido, admite máximo 2 decimales');
  const cents = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
  return integer(cents, 'Importe');
}
export function formatPen(cents) {
  return 'S/ ' + (integer(cents, 'Saldo') / 100)
    .toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function addCalendarDays(startISO, extraDays) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startISO)) throw new TypeError('Fecha YYYY-MM-DD obligatoria');
  const [year, month, day] = startISO.split('-').map(Number);
  if (year < 2000 || year > 2099 || month < 1 || month > 12) throw new RangeError('Fecha inválida');
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== startISO) throw new RangeError('Fecha inexistente');
  date.setUTCDate(date.getUTCDate() + integer(extraDays, 'Días', 100000));
  return date.toISOString().slice(0, 10);
}

/** Día de inicio = 1, cierre día N a las 23:59 hora Perú (America/Lima).
 * La fecha siguiente a las 00:00 es el límite EXCLUSIVO para el backend.
 */
export function activationWindow(startISO, durationDays) {
  const days = integer(durationDays, 'Duración', 3660);
  if (days === 0) throw new RangeError('Duración debe ser mayor que cero');
  const endDate = addCalendarDays(startISO, days - 1);
  return Object.freeze({
    startDate: startISO,
    endDate,
    displayEndsAt: endDate + ' 23:59',
    expiresAtExclusiveLima: addCalendarDays(startISO, days) + ' 00:00',
    durationDays: days,
    timezone: 'America/Lima'
  });
}
export function serviceActivationWindow(service, startISO) {
  if (!CORE_SERVICES.includes(service)) throw new RangeError('Negocio desconocido');
  return activationWindow(startISO, service === 'STREAM_BULLS'
    ? STREAM_BULLS_ANNUAL_DAYS : OTHER_BUSINESS_DAYS);
}

/** Solo ADMIN puede marcar el nombramiento: este helper no sustituye la
 * autorización del servidor ni el chequeo de afiliación vigente.
 */
export function canAutoPublish({ assignedByAdmin, role, membershipStart, referenceDay, suspended = false }) {
  if (role !== 'SUPER_RESELLER' || assignedByAdmin !== true || suspended) return false;
  if (!membershipStart || !referenceDay) return false;
  const validity = serviceActivationWindow('STREAM_BULLS', membershipStart);
  return referenceDay >= validity.startDate && referenceDay <= validity.endDate;
}
export function allowedSelfRegistrationRoles() {
  return Object.freeze(['AFFILIATE', 'RESELLER']);
}

/** Comisión sobre GANANCIA / margen, no sobre el cobro bruto.
 * Lo recibe todo ADMIN; el vendedor recibe costo recuperado + 80% de margen.
 * Cada orden debe guardar tasa, precio y costo como snapshot firmado por backend.
 */
export function calculateSaleSettlement({
  unitPriceCents, unitCostCents, quantity = 1,
  commissionBps = DEFAULT_SUPER_RESELLER_COMMISSION_BPS
}) {
  integer(unitPriceCents, 'Precio por unidad');
  integer(unitCostCents, 'Costo por unidad');
  integer(quantity, 'Cantidad', 1_000_000);
  integer(commissionBps, 'Comisión (bps)', 10_000);
  if (unitPriceCents === 0 || quantity === 0 || unitCostCents > unitPriceCents) {
    throw new RangeError('Precio/costo/cantidad incompatible');
  }
  const gross = unitPriceCents * quantity, expense = unitCostCents * quantity;
  if (!Number.isSafeInteger(gross) || !Number.isSafeInteger(expense)) {
    throw new RangeError('Monto total fuera del rango seguro');
  }
  const profit = gross - expense;
  // Céntimos redondeados al más cercano, medio hacia arriba; BigInt evita
  // decimales binarios al calcular tasas configuradas por ADMIN.
  const adminCommission = Number((BigInt(profit) * BigInt(commissionBps) + 5000n) / 10000n);
  const sellerPayable = gross - adminCommission;
  return Object.freeze({
    grossCents: gross,
    supplierCostCents: expense,
    grossProfitCents: profit,
    adminCommissionCents: adminCommission,
    sellerNetProfitCents: profit - adminCommission,
    sellerPayableCents: sellerPayable,
    commissionBps,
    quantity
  });
}

/** En inventario real la reserva y su liberación son transacciones SQL
 * atómicas: jamás confirmar una venta restando stock solo en el navegador.
 */
export function reserveAvailableStock(availableUnits, quantity) {
  integer(availableUnits, 'Stock');
  integer(quantity, 'Cantidad');
  if (quantity === 0 || quantity > availableUnits) throw new RangeError('Stock insuficiente');
  return availableUnits - quantity;
}

/** El WhatsApp pertenece al perfil comercial, NO queda fijado en cada producto.
 * Consultar al vendedor resuelve siempre el contacto actual del perfil.
 */
export function whatsappSellerLink(contact, productTitle = '') {
  let digits = String(contact ?? '').replace(/[+\s().-]/g, '');
  if (/^9\d{8}$/.test(digits)) digits = '51' + digits;
  if (!/^[1-9]\d{9,14}$/.test(digits)) throw new TypeError('WhatsApp debe incluir un número válido');
  const text = 'Hola, deseo consultar sobre ' + String(productTitle).trim().slice(0, 140);
  return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text);
}

/** Visibilidad de liquidaciones y solicitud de pagos: ningún resultado de este
 * helper autoriza movimientos financieros. Realizar pagos solo en backend.
 * Se evita doble cuenta de órdenes y de desembolsos mediante ID único.
 */
export function summarizeSellerEarnings(orders, payouts, sellerId) {
  if (!sellerId || !Array.isArray(orders) || !Array.isArray(payouts)) {
    throw new TypeError('Vendedor, órdenes y liquidaciones son obligatorios');
  }
  const seenOrders = new Set(), seenPayments = new Set();
  let revenueCents = 0, commissionCents = 0, payableEarnedCents = 0, heldCents = 0, paidOutCents = 0;
  for (const order of orders) {
    if (order.sellerId !== sellerId) continue;
    if (!order.id || seenOrders.has(order.id)) throw new Error('Orden duplicada o sin ID');
    seenOrders.add(order.id);
    if (order.status === 'PAID_AWAITING_DELIVERY') {
      heldCents += integer(order.grossCents, 'Cobro pendiente de entrega');
    } else if (order.status === 'DELIVERED_VERIFIED') {
      revenueCents += integer(order.grossCents, 'Venta');
      commissionCents += integer(order.adminCommissionCents, 'Comisión');
      payableEarnedCents += integer(order.sellerPayableCents, 'Por liquidar');
    } else if (!['CANCELLED', 'REFUNDED', 'CHARGEBACK', 'PENDING_PAYMENT'].includes(order.status)) {
      throw new RangeError('Estado de orden inválido');
    }
  }
  for (const payment of payouts) {
    if (payment.sellerId !== sellerId) continue;
    if (!payment.id || seenPayments.has(payment.id)) throw new Error('Liquidación duplicada o sin ID');
    seenPayments.add(payment.id);
    if (payment.status === 'EXECUTED_VERIFIED') {
      paidOutCents += integer(payment.amountCents, 'Monto liquidado');
    } else if (!['REQUESTED', 'PENDING', 'REJECTED'].includes(payment.status)) {
      throw new RangeError('Estado de liquidación inválido');
    }
  }
  const balance = payableEarnedCents - paidOutCents;
  return Object.freeze({
    sellerId, revenueCents, commissionCents, heldCents, payableEarnedCents,
    paidOutCents,
    availableForPayoutCents: Math.max(0, balance),
    amountToRecoverCents: Math.max(0, -balance)
  });
}

export function normalizeSmartSearch(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}
export function matchesSmartSearch(query, searchableFields) {
  const terms = normalizeSmartSearch(query).split(' ').filter(Boolean);
  const content = normalizeSmartSearch(Array.isArray(searchableFields)
    ? searchableFields.join(' ') : searchableFields);
  return terms.every(term => content.includes(term));
}


/** División comercial:
 * - SUPER_RESELLER: ventas y clientes del catálogo propio dentro del portal.
 * - RESELLER: compra en catálogo y revende por su cuenta FUERA del portal.
 * - Control externo privado de RESELLER requiere un complemento independiente.
 * Estos indicadores son presentación. Los permisos reales son de Supabase/RLS.
 */
export function streamBullsRoleCapabilities(role) {
  return Object.freeze({
    canPurchaseInMarketplace: ['AFFILIATE', 'RESELLER', 'SUPER_RESELLER'].includes(role),
    canPublishMarketplaceProducts: role === 'SUPER_RESELLER',
    canTrackOwnMarketplaceBuyers: role === 'SUPER_RESELLER',
    canResellPrivatelyOutsidePortal: role === 'RESELLER',
    canOfferPrivateExternalAccountAddon: role === 'RESELLER'
  });
}

/** Política de la pestaña separada RESELLER: S/10 por 30 días.
 * Día de autorización confirmada = día 1 y fin día 30 a las 23:59 Lima.
 * Renovar antes de expirar suma 30 días sin quitar los vigentes.
 * Backend calcula hoy con America/Lima, nunca confía en fecha del navegador.
 */
export function externalAddonRenewalWindow(today, currentAddonEndOn = null) {
  const todayChecked = addCalendarDays(today, 0);
  const oldEnd = currentAddonEndOn ? addCalendarDays(currentAddonEndOn, 0) : null;
  const start = oldEnd && oldEnd >= todayChecked
    ? addCalendarDays(oldEnd, 1) : todayChecked;
  return activationWindow(start, OTHER_BUSINESS_DAYS);
}

/** Si está vencido, se muestra SOLO CTA de reactivación, SIN datos privados.
 * Servidor DEBE denegar lectura/escritura/exportación de perfiles al estar vencido.
 * Ni siquiera exponemos el recuento de clientes como "preview" bloqueado.
 */
export function externalAddonAccessState({
  role, addonStartsOn, addonEndsOn, today, suspended = false
}) {
  let active = false;
  if (role === 'RESELLER' && !suspended && addonStartsOn && addonEndsOn && today) {
    const start = addCalendarDays(addonStartsOn, 0);
    const end = addCalendarDays(addonEndsOn, 0);
    const now = addCalendarDays(today, 0);
    active = start <= now && now <= end;
  }
  return Object.freeze({
    active, showPrivateExternalRecords: active,
    showActivationCard: role === 'RESELLER',
    canReadExternalRecords: active,
    canWriteExternalRecords: active,
    canExportExternalRecords: active,
    // La eliminación de datos JAMÁS se ejecuta por vencimiento de membresía.
    shouldDeleteStoredRecords: false
  });
}

/** PREVALIDACIÓN, NO un cargo efectivo. En backend, un RPC transaccional:
 * 1) comprueba sesión/rol, consentimiento explícito por intento y saldo REAL,
 * 2) utiliza un request_id único para impedir doble cargo al reintentar,
 * 3) debita S/10 y guarda/extiende vigencia atómicamente;
 * 4) si falla no realiza cargo ni cambia el permiso.
 * Nunca usar saldo de bonos para este add-on.
 */
export function externalAddonActivationQuote({
  role, mainMembershipActive, walletRealBalanceCents,
  consentedForThisPurchase, today, currentAddonEndOn = null,
  suspended = false
}) {
  const amountCents = EXTERNAL_ACCOUNT_ADDON_PEN_CENTS;
  if (role !== 'RESELLER' || !mainMembershipActive || suspended) {
    return Object.freeze({ permitted: false, reason: 'NOT_ELIGIBLE', amountCents });
  }
  integer(walletRealBalanceCents, 'Saldo REAL');
  if (consentedForThisPurchase !== true) {
    return Object.freeze({ permitted: false, reason: 'CONFIRMATION_REQUIRED', amountCents });
  }
  if (walletRealBalanceCents < amountCents) {
    return Object.freeze({ permitted: false, reason: 'INSUFFICIENT_REAL_BALANCE', amountCents });
  }
  return Object.freeze({
    permitted: true, reason: 'READY_FOR_SECURE_SERVER_CHARGE',
    amountCents, entitlementPeriod: externalAddonRenewalWindow(today, currentAddonEndOn),
    automaticRecurringCharge: false
  });
}
