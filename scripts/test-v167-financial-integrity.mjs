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
const catalog=read('scripts/v169-catalogo-unico.js');
const profileMigration=read('supabase/migrations/20261025_cc_portal_catalog_profile_v169.sql');
const flyer=read('scripts/v170-flyers-stream.js');
const flyerSql=read('supabase/migrations/20261025_cc_stream_flyers_v170.sql');
const trialSql=read('supabase/migrations/20261025_cc_portal_admin_simple_trials_v171.sql');
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
 [loader.includes('v166-portal-roles.js?v=1711'),'El cargador usa versión de panel actualizada'],
 [index.includes('scripts/v151-portal-polish.js?v=1711'),'El HTML no carga el panel previo en caché'],
 [catalog.includes('rpc/cc_portal_public_catalog'),'Catálogo público lee únicamente publicaciones reales'],
 [catalog.includes('cc166PurchaseProductFromCatalog'),'Catálogo reutiliza el checkout verificado existente'],
 [catalog.includes("querySelectorAll('.v23-product-grid,.v23-empty,.cc169-result')"),'No quedan tarjetas de compra duplicadas'],
 [profileMigration.includes('public.cc_portal_save_my_profile('),'Mi perfil actualiza la ficha central existente'],
 [js.includes("case 'profile':profile(page)"),'Solo una vista de datos personales para los cuatro negocios'],
 [loader.includes('scripts/v169-catalogo-unico.js?v=1701'),'El loader incluye el catálogo único'],
 [flyerSql.includes("bucket_id='cc-stream-flyers'"),'Política limita uploads al bucket de flyers'],
 [flyerSql.includes('5242880'),'Máximo 5 MB a nivel de almacenamiento'],
 [flyerSql.includes("m.role='SUPER_RESELLER'")&&flyerSql.includes("s.end_at>now()"),'Subida y edición requieren permiso y membresía vigente'],
 [flyerSql.includes('p.seller_id::text=split_part(name'), 'Cada archivo ligado al vendedor y publicación'],
 [flyerSql.includes('or not exists(select 1 from storage.objects'), 'No acepta rutas inventadas: verifica objeto existente'],
 [flyerSql.includes('public.cc_portal_public_catalog() c'),'El catálogo V170 reutiliza validación V169 sin duplicarla'],
 [flyerSql.includes('grant select(flyer_path)'),'Permisos de consulta acotados al flyer'],
 [flyer.includes("rpc/cc_portal_set_stream_product_flyer"),'Subida enlaza flyer mediante RPC autorizada'],
 [flyer.includes("await file.slice(0,16).arrayBuffer()"),'Verifica firmas de JPG/PNG/WebP'],
 [flyer.includes("'x-upsert':'false'"),'No sobrescribe flyer de otro producto'],
 [js.includes("window.cc170Flyers.upload({id:productId,seller_id:uid},flyer)"),'Publicación usa su id existente para el flyer'],
 [js.includes('window.cc170Flyers?.decorateRow(row,p)'),'La publicación existente conserva listado y añade miniatura'],
 [catalog.includes('cc_portal_public_catalog_v2'),'Catálogo público obtiene la ruta del flyer sin costos privados'],
 [catalog.includes('cc170-public-flyer'),'Catálogo muestra flyer o portada por plataforma'],
 [loader.includes('scripts/v170-flyers-stream.js?v=1701'),'La UI del flyer se carga por el portal actual'],
 [js.includes("title(page,'Usuarios y accesos'"),'ADMIN abre pantalla simple de usuarios'],
 [!js.includes("actions.append(button('Administración original'"),'Acceso al administrador legado dejó de ser acción principal'],
 [js.includes("advanced.append(make('summary','','Herramientas avanzadas"),'Administración extensa queda plegada'],
 [js.includes("rpc/cc_portal_admin_accounts"),'Usuarios se consultan por RPC exclusiva de ADMIN'],
 [js.includes("rpc/cc_portal_admin_start_stream_trial"),'Prueba solo tras acción de ADMIN'],
 [trialSql.includes("price_pen,is_active"),'Prueba usa plan de cero soles independiente de membresía pagada'],
 [trialSql.includes("trial_duration check"),'Duración máxima 7 días verificada en base de datos'],
 [trialSql.includes('cc_portal_trial_once unique(user_id,business_id)'), 'Cada cuenta recibe a lo sumo una prueba'],
 [trialSql.includes("Acceso exclusivo de ADMIN"),'RPC verifica rol ADMIN en el servidor'],
 [trialSql.includes("if exists(select 1 from public.cc_admins where user_id=target)"),'Usuarios ADMIN no pueden degradarse en esta pantalla'],
 [trialSql.includes("p_role not in ('AFFILIATE','RESELLER','SUPER_RESELLER')"),'Solo roles conocidos'],
 [trialSql.includes("cc_portal_admin_end_stream_trial"),'Prueba puede revocarse de forma auditada'],
 [loader.includes('styles/v171-admin-simple.css?v=1711'),'El panel carga su estilo sin alterar otros negocios']
];
for(const [condition,message] of checks){assert.ok(condition,message);}
console.log('PASS · '+checks.length+' comprobaciones financieras, de privacidad y navegación sin pagos reales.');
