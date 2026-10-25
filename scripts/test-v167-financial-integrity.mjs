/* Prueba estática sin tocar base de datos ni crear operaciones de prueba.
   Verifica garantías esenciales del checkout y del panel único. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=file=>fs.readFileSync(file,'utf8');
const main=read('supabase/migrations/20261025_cc_portal_unico_compras_v167.sql');
const roles=read('supabase/migrations/20261025_cc_portal_role_panels.sql');
const fix=read('supabase/migrations/20261025_cc_portal_membership_role_v1672.sql');
const privateOrders=read('supabase/migrations/20261025_cc_portal_private_orders_v1673.sql');
const js=read('scripts/v166-portal-roles.js');
const loader=read('scripts/v151-portal-polish.js');
const index=read('index.html');
const checks=[
 [main.includes('checkout_key uuid not null unique'),'Idempotencia de órdenes'],
 [main.includes('for update'),'Bloqueo de stock/billetera antes de cargo'],
 [main.includes('cc_internal.cc_portal_charge_unified'),'Descuento atómico en subbilleteras reales'],
 [main.includes("if available<p_amount then raise exception 'Saldo real insuficiente'"),'Rechazo por saldo insuficiente'],
 [main.includes("if product.price_pen<>p_expected_price_pen"),'Confirmación de precio esperado'],
 [main.includes("p_checkout_key uuid,p_expected_price_pen numeric"),'Referencia única de checkout'],
 [main.includes('update public.cc_portal_stream_products set stock=stock-1'),'Stock descontado atómicamente'],
 [main.includes("p_amount<>round(p_amount,2)"),'Montos a dos decimales'],
 [main.includes("phone !~ '^[1-9][0-9]{7,14}$'"),'WhatsApp internacional validado'],
 [main.includes("round((product.price_pen-product.cost_pen)*percent/100,2)"),'Comisión sobre ganancia, no venta bruta'],
 [main.includes("'status','PAID_AWAITING_DELIVERY'"),'Registro de pedido pendiente de entrega'],
 [roles.includes('enable row level security'),'RLS activa para roles'],
 [fix.includes("when role='AFFILIATE' then 'RESELLER'"),'Conversión de membresía pagada'],
 [privateOrders.includes('revoke select on table public.cc_portal_stream_orders from authenticated'),'Órdenes privadas'],
 [privateOrders.includes('revoke select on table public.cc_portal_stream_products from authenticated'),'No divulgar costos ni WhatsApp antes de compra'],
 [privateOrders.includes('o.seller_id=c.uid then o.admin_fee_pen else null'), 'Solo vendedor o ADMIN ven comisión'],
 [privateOrders.includes('c.uid is not null and (o.buyer_id=c.uid or o.seller_id=c.uid or c.is_admin)'), 'Pedidos filtrados por titular/ADMIN'],
 [js.includes("api('rpc/cc_portal_my_stream_orders','POST'"),'Pedidos consultados mediante RPC segura'],
 [!js.includes("read('cc_portal_stream_orders?"),'No exponer tabla de pedidos al navegador'],
 [js.includes("api('rpc/cc_portal_purchase_stream_product','POST'"),'Compra invoca RPC transaccional'],
 [js.includes("window.confirm('¿Confirmas la compra"),'Consentimiento expreso para compra'],
 [js.includes("window.confirm('¿Activar o renovar STREAM"),'Consentimiento expreso para membresía'],
 [js.includes("lastReceipt={...response,buyer_id:uid}"),'No se reutiliza pedido ajeno en recibo'],
 [js.includes("const phone=String(order?.seller_whatsapp"),'WhatsApp solo se obtiene tras orden'],
 [js.includes("role.includes")===false,'No confiar en rol a partir de texto'],
 [js.includes("case 'shop':shop(page)")&&js.includes("case 'admin':admin(page)"),'Un panel con rutas por rol'],
 [js.includes('businessTabs(page)'),'Una barra de cuatro pestañas'],
 [loader.includes('v166-portal-roles.js?v=1671'),'El cargador usa versión de panel actualizada'],
 [index.includes('scripts/v151-portal-polish.js?v=1671'),'El HTML no carga el panel previo en caché']
];
for(const [condition,message] of checks){assert.ok(condition,message);}
console.log('PASS · '+checks.length+' comprobaciones financieras, de privacidad y navegación sin pagos reales.');
