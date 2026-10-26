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
const tierSql=read('supabase/migrations/20261025_cc_stream_public_distributor_v172.sql');
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
 [loader.includes('v166-portal-roles.js?v=178'),'El cargador usa versión de panel actualizada'],
 [index.includes('scripts/v151-portal-polish.js?v=178'),'El HTML no carga el panel previo en caché'],
 [catalog.includes('rpc/cc_portal_public_catalog'),'Catálogo público lee únicamente publicaciones reales'],
 [catalog.includes('cc166PurchaseProductFromCatalog'),'Catálogo reutiliza el checkout verificado existente'],
 [catalog.includes("querySelectorAll('.v23-product-grid,.v23-empty,.cc169-result')"),'No quedan tarjetas de compra duplicadas'],
 [profileMigration.includes('public.cc_portal_save_my_profile('),'Mi perfil actualiza la ficha central existente'],
 [js.includes("case 'profile':profile(page)"),'Solo una vista de datos personales para los cuatro negocios'],
 [loader.includes('scripts/v169-catalogo-unico.js?v=1731'),'El loader incluye el catálogo único'],
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
 [catalog.includes('cc_portal_public_catalog_v3'),'Catálogo público obtiene precios según rol, flyer sin costo privado'],
 [catalog.includes('cc170-public-flyer'),'Catálogo muestra flyer o portada por plataforma'],
 [loader.includes('scripts/v170-flyers-stream.js?v=1701'),'La UI del flyer se carga por el portal actual'],
 [js.includes("title(page,'Directorio de usuarios'"),'ADMIN abre pantalla simple de usuarios'],
 [!js.includes("actions.append(button('Administración original'"),'Acceso al administrador legado dejó de ser acción principal'],
 [!js.includes('Herramientas avanzadas')&&js.includes('function adminApprovals(page)')&&js.includes('function adminRecharges(page)')&&js.includes('function adminAudit(page)'), 'Autorizaciones Súper reseller, recargas y auditoría tienen espacios propios'],
 [js.includes("rpc/cc_portal_admin_accounts"),'Usuarios se consultan por RPC exclusiva de ADMIN'],
 [!js.includes("rpc/cc_portal_admin_start_stream_trial"),'No hay botones ni llamadas para pruebas gratuitas'],
 [tierSql.includes("update public.cc_plans set is_active=false"),'Plan de prueba gratuita mantenido inactivo'],
 [tierSql.includes('revoke all on function public.cc_portal_admin_start_stream_trial'),'RPC de prueba gratuita revocada'],
 [tierSql.includes('revoke all on function public.cc_portal_admin_end_stream_trial'),'RPC de finalizar prueba revocada'],
 [trialSql.includes("Acceso exclusivo de ADMIN"),'RPC verifica rol ADMIN en el servidor'],
 [trialSql.includes("if exists(select 1 from public.cc_admins where user_id=target)"),'Usuarios ADMIN no pueden degradarse en esta pantalla'],
 [trialSql.includes("p_role not in ('AFFILIATE','RESELLER','SUPER_RESELLER')"),'Solo roles conocidos'],
 [!js.includes('Probar 7 días')&&!js.includes('Finalizar prueba'),'Administrador sin oferta de prueba gratuita'],
 [loader.includes('styles/v171-admin-simple.css?v=177'),'El panel carga su estilo sin alterar otros negocios'],
 [tierSql.includes('distributor_price_pen numeric'),'Producto existente tiene precio distribuidor opcional para compatibilidad'],
 [tierSql.includes('cc_stream_distributor_eligible'),'Elegibilidad de distribuidor calculada por servidor'],
 [tierSql.includes("plan.code<>'STREAM_TEST_7' and plan.price_pen>0"),'Solo membresías pagadas dan descuento de distribuidor'],
 [tierSql.includes('p_distributor_price_pen<p_cost_pen'),'Prohibida publicación con tarifa menor al costo'],
 [tierSql.includes('cc_portal_public_catalog_v3'),'RPC única de catálogo expone tarifa efectiva según rol'],
 [tierSql.includes('else null end as distributor_price_pen'),'AFILIADO no recibe tarifa distribuidor'],
 [tierSql.includes('public.cc_portal_stream_price_for_me'),'Checkout consulta tarifa del comprador sin fiarse del navegador'],
 [tierSql.includes('effective_price<>p_expected_price_pen'),'El servidor rechaza compras con tarifa falsa'],
 [tierSql.includes('cc_internal.cc_portal_charge_unified(u,effective_price'),'Cargo bancario solo por tarifa verificada'],
 [tierSql.includes('round((effective_price-product.cost_pen)*percent/100,2)'),'Comisión calculada sobre margen de tarifa efectiva'],
 [tierSql.includes('revoke select(distributor_price_pen)'),'Columna del descuento no visible por SELECT público'],
 [js.includes("api('rpc/cc_portal_publish_stream_product_v2','POST'"),'Formulario publica ambas tarifas en el mismo producto'],
 [js.includes("api('rpc/cc_portal_stream_price_for_me','POST'"),'UI consulta tarifa verificada antes de pagar'],
 [js.includes("api('rpc/cc_portal_update_stream_prices','POST'"),'Editar dos precios en un producto sin duplicarlo'],
 [catalog.includes("price_tier==='DISTRIBUTOR'"),'Catálogo distingue tarifa pública y distribuidor'],
 [catalog.includes("headers.Authorization='Bearer '+jwt"),'Catálogo envía sesión auténtica para consultar tarifa'],
 [catalog.includes('cc_portal_public_catalog_v3'),'Catálogo consulta la RPC segura V3'],
 [loader.includes('scripts/v169-catalogo-unico.js?v=1731'),'Caché actualizado para RPC de tarifas'],
 [index.includes('scripts/v151-portal-polish.js?v=178'),'Portada publica nueva versión del catálogo'],
 [index.includes("function cc79StreamBenefits(){")&&index.includes("window.cc166OpenStreamMembership()"),'Beneficios abren membresía real'],
 [!index.includes('rpc/sb_pay_affiliation_test')&&!index.includes('rpc/cc_request_test_topup'),'Afiliación y recarga ficticias retiradas'],
 [index.includes("if(adminBtn)adminBtn.style.display='none'; // Accesible"),'ADMIN antiguo oculto de navegación principal'],
 [index.includes('Los visitantes y afiliados ven precios públicos.'),'Publicidad explica precio por rol'],
 [index.includes('S/ 25 por 365 días'),'Condiciones legales alineadas al plan anual'],
 [js.includes("if(s.userId===user){")&&js.includes("token=s.jwt;serial++;busy=false;verified=false;"),'Renovación JWT conserva pestaña y recarga permisos'],
 [js.includes("window.cc166OpenStreamMembership=()=>{"),'Membresía real accesible desde portada'],
 [catalog.includes('response.status===401||response.status===403'),'Sesión caducada permite catálogo público seguro'],
 [catalog.includes("p.price_tier!=='PUBLIC'||p.distributor_price_pen!=null"),'Fallback no acepta descuentos anónimos'],
 [catalog.includes("window.addEventListener('focus',refreshIfVisible)"),'Precios se actualizan al volver al catálogo']
];
for(const [condition,message] of checks){assert.ok(condition,message);}
console.log('PASS · '+checks.length+' comprobaciones financieras, de privacidad y navegación sin pagos reales.');
