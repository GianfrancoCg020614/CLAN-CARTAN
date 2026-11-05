-- SOLO CI: transacción revertida, datos y dinero ficticios.
begin;
create function pg_temp.ok(v boolean,msg text) returns void language plpgsql as $$begin if v is not true then raise exception 'FAIL %',msg;end if;raise notice 'PASS %',msg;end;$$;
insert into auth.users(id,email) select ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'fixture-'||i||'@example.invalid' from generate_series(1,6)i;
insert into public.cc_admins values('00000000-0000-4000-8000-000000000001');
insert into public.cc_clan_codes(user_id,code,code_number) select id,'CLAN'||row_number()over(order by id),row_number()over(order by id) from auth.users;
insert into public.cc_clan_attributions(referred_user_id,inviter_user_id) values('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003');
insert into public.cc_businesses(code) values('COBRA_YA'),('MI_COCHERA'),('MI_ALQUILER'),('STREAM_BULLS');
-- Migración se probó con negocios preexistentes en producción: añade el plan mensual al fixture.
insert into public.cc_plans(business_id,code,title,billing_type,price_pen,is_active) select id,'STREAM_MONTHLY','Mensual','MONTHLY',25,true from public.cc_businesses where code='STREAM_BULLS';
insert into public.cc_real_service_wallets values('00000000-0000-4000-8000-000000000002','COBRA_YA',40,now()),('00000000-0000-4000-8000-000000000002','STREAM_BULLS',460,now());
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $$declare service text;price numeric;i int:=0;req uuid;r jsonb;firstresult jsonb;begin foreach service in array array['COBRA_YA','MI_COCHERA','MI_ALQUILER','STREAM_BULLS'] loop
 i:=i+1;price:=case when service='STREAM_BULLS' then 25 else 20 end;req:=('10000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
 r:=public.cc_finance_pay_membership(service,req,price);perform pg_temp.ok((r->>'amount_pen')::numeric=price,service||' precio correcto');
 perform pg_temp.ok(public.cc_finance_pay_membership(service,req,price)->>'already_processed'='true','Idempotencia '||service);
 end loop;end;$$;
select pg_temp.ok((select sum(balance_pen)=415 from public.cc_real_service_wallets where user_id=auth.uid()),'Una billetera descuenta 20+20+20+25 una sola vez');
select pg_temp.ok((select sum(balance_pen)=20 from public.cc_real_service_wallets where user_id='00000000-0000-4000-8000-000000000003'),'Cuatro negocios generan 4 bonos de S/5');
select public.cc_finance_pay_membership('COBRA_YA','10000000-0000-4000-8000-000000000010',20);
select pg_temp.ok((select count(*)=1 from cc_internal.finance_membership_payments where user_id=auth.uid() and service='COBRA_YA' and kind='RENEWAL'),'Renovación mensual');
select pg_temp.ok((select sum(balance_pen)=25 from public.cc_real_service_wallets where user_id='00000000-0000-4000-8000-000000000003'),'Bono recurrente');
-- Reactivar tras vencer también es una renovación pagada elegible.
update public.mc_accounts set subscription_until=now()-interval '2 months' where user_id=auth.uid();
select public.cc_finance_pay_membership('MI_COCHERA','10000000-0000-4000-8000-000000000011',20);
select pg_temp.ok((select count(*)=2 from cc_internal.finance_membership_payments where kind='RENEWAL'),'Reactivación después de vencimiento');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
do $$begin begin perform public.cc_finance_pay_membership('COBRA_YA','10000000-0000-4000-8000-000000000020',20);raise exception 'FAIL accepted no balance';exception when others then if sqlerrm='FAIL accepted no balance' then raise;end if;end;end;$$;
insert into public.cc_real_service_wallets values(auth.uid(),'STREAM_BULLS',100,now());
select public.cc_finance_pay_membership('STREAM_BULLS','10000000-0000-4000-8000-000000000021',25);
select pg_temp.ok((select count(*)=6 from cc_internal.finance_referral_bonuses),'Sin referidor no se acredita bono');
-- Seguridad: cliente sin privilegios y administrador verificado en servidor.
select pg_temp.ok(not has_function_privilege('anon','public.cc_finance_pay_membership(text,uuid,numeric)','execute'),'Anon no puede pagar');
select pg_temp.ok(not has_table_privilege('authenticated','cc_internal.finance_settlement_payments','insert'),'Cliente no escribe liquidaciones');
do $$begin begin perform public.cc_finance_admin('overview');raise exception 'FAIL accepted nonadmin';exception when insufficient_privilege then null;end;end;$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
-- Reembolso completo y reversión del bono original.
do $$declare p uuid;beforebalance numeric;begin
 select id into p from cc_internal.finance_membership_payments where request_id='10000000-0000-4000-8000-000000000010';
 select sum(balance_pen) into beforebalance from public.cc_real_service_wallets where user_id='00000000-0000-4000-8000-000000000002';
 perform public.cc_finance_admin('refund_membership',jsonb_build_object('payment_id',p,'request_id','20000000-0000-4000-8000-000000000001','reason','Reembolso ficticio'));
 perform public.cc_finance_admin('refund_membership',jsonb_build_object('payment_id',p,'request_id','20000000-0000-4000-8000-000000000001','reason','Reembolso ficticio'));
 perform pg_temp.ok((select sum(balance_pen)=beforebalance+20 from public.cc_real_service_wallets where user_id='00000000-0000-4000-8000-000000000002'),'Reembolso único al saldo común');
 perform pg_temp.ok((select status='REVERSED' from cc_internal.finance_referral_bonuses where payment_id=p),'Bono reembolsado se revierte');
end;$$;
-- Tarifa cambia con historial y obliga a confirmar el precio nuevo.
select public.cc_finance_admin('set_rate','{"service":"COBRA_YA","amount_pen":21,"reason":"Cambio ficticio"}');
select pg_temp.ok((select count(*)=2 from cc_internal.finance_rates where service='COBRA_YA'),'Historial de tarifas');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$begin begin perform public.cc_finance_pay_membership('COBRA_YA','10000000-0000-4000-8000-000000000099',20);raise exception 'FAIL accepted old price';exception when others then if sqlerrm='FAIL accepted old price' then raise;end if;end;end;$$;
-- Ventas reales ficticias: precio 100, comisión snapshot 20, proveedor 80.
insert into public.cc_portal_super_resellers values('00000000-0000-4000-8000-000000000005',true,20);
insert into public.cc_portal_stream_products(id,seller_id,price_pen) values('30000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000005',100);
insert into public.cc_portal_stream_orders(id,checkout_key,buyer_id,seller_id,product_id,service,title,price_pen,cost_pen,admin_percent,admin_fee_pen,seller_payable_pen,status) values
 ('40000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001',auth.uid(),'00000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001','Netflix','Licencia ficticia',100,0,20,20,80,'FULFILLED');
-- Gasto original exigido para que el reembolso concilie contra el pago real.
insert into public.cc_real_wallet_spends(user_id,service,kind,amount_pen,reference,description) values(auth.uid(),'STREAM_BULLS','PURCHASE',100,'PORTAL-BUY-50000000-0000-4000-8000-000000000001-STREAM_BULLS','Compra ficticia');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.cc_finance_admin('set_commission','{"seller_id":"00000000-0000-4000-8000-000000000005","admin_percent":30,"reason":"Cambio ficticio"}');
select pg_temp.ok((select admin_percent=20 and admin_fee_pen=20 and seller_payable_pen=80 from public.cc_portal_stream_orders limit 1),'Cambiar comisión no altera venta anterior');
do $$declare r jsonb;n int;begin foreach n in array array[7,15,31] loop
 r:=public.cc_finance_report('00000000-0000-4000-8000-000000000005',now()-n*interval '1 day',now()+interval '1 day');perform pg_temp.ok((r->'totals'->>'supplier_pen')::numeric=80,'Reporte por rango '||n);end loop;
 r:=public.cc_finance_report('00000000-0000-4000-8000-000000000005',now()+interval '1 day',now()+interval '2 days');perform pg_temp.ok(jsonb_array_length(r->'rows')=0,'Rango personalizado sin ventas');end;$$;
select public.cc_finance_admin('approve_settlement',jsonb_build_object('request_id','60000000-0000-4000-8000-000000000001','seller_id','00000000-0000-4000-8000-000000000005','from',now()-interval '31 days','to',now()+interval '1 day','amount_pen',80));
insert into storage.objects(bucket_id,name) values('cc-financial-proofs','00000000-0000-4000-8000-000000000001/proof1.pdf'),('cc-financial-proofs','00000000-0000-4000-8000-000000000001/proof2.pdf');
do $$declare b uuid;r jsonb;begin
 select id into b from cc_internal.finance_settlements limit 1;
 r:=public.cc_finance_admin('record_payment',jsonb_build_object('request_id','70000000-0000-4000-8000-000000000001','settlement_id',b,'amount_pen',30,'method','YAPE','reference','TEST-001','proof_path','00000000-0000-4000-8000-000000000001/proof1.pdf'));
 r:=public.cc_finance_admin('record_payment',jsonb_build_object('request_id','70000000-0000-4000-8000-000000000001','settlement_id',b,'amount_pen',30,'method','YAPE','reference','TEST-001','proof_path','00000000-0000-4000-8000-000000000001/proof1.pdf'));
 perform pg_temp.ok((select count(*)=1 from cc_internal.finance_settlement_payments),'Pago idempotente y parcial');
 perform pg_temp.ok((select status='PARTIAL' from cc_internal.finance_settlements where id=b),'Liquidación parcial');
 r:=public.cc_finance_admin('record_payment',jsonb_build_object('request_id','70000000-0000-4000-8000-000000000002','settlement_id',b,'amount_pen',50,'method','TRANSFERENCIA','reference','TEST-002','proof_path','00000000-0000-4000-8000-000000000001/proof2.pdf'));
 perform pg_temp.ok((select status='PAID' from cc_internal.finance_settlements where id=b),'Liquidación pagada');
 r:=public.cc_finance_report('00000000-0000-4000-8000-000000000005',now()-interval '31 days',now()+interval '1 day');
 perform pg_temp.ok((r->'totals'->>'pending_pen')::numeric=0 and (r->'totals'->>'paid_pen')::numeric=80,'Conciliación liquidado y pendiente');
 begin perform public.cc_finance_admin('record_payment',jsonb_build_object('request_id','70000000-0000-4000-8000-000000000003','settlement_id',b,'amount_pen',1,'method','YAPE','reference','TEST-003','proof_path','00000000-0000-4000-8000-000000000001/proof2.pdf'));raise exception 'FAIL overpayment';exception when others then if sqlerrm='FAIL overpayment' then raise;end if;end;
end;$$;
-- Un reembolso posterior al pago crea saldo negativo del proveedor; no duplica liquidaciones.
select public.cc_finance_admin('refund_order',jsonb_build_object('request_id','80000000-0000-4000-8000-000000000001','order_code',(select order_code from public.cc_portal_stream_orders limit 1),'amount_pen',25,'reason','Devolución parcial ficticia'));
select pg_temp.ok((select sum(amount_pen)=25 and sum(commission_pen)=5 and sum(seller_pen)=20 from cc_internal.finance_order_adjustments),'Reembolso conserva proporción 20/80 histórica');
select pg_temp.ok((public.cc_finance_report('00000000-0000-4000-8000-000000000005',now()-interval '31 days',now()+interval '1 day')->>'global_pending_pen')::numeric=-20,'Deuda de proveedor ya liquidado queda trazable');
select pg_temp.ok((select count(*)=0 from cc_internal.finance_referral_bonuses where referred_id=beneficiary_id),'Sin autorreferidos');
-- La función real de compra toma la comisión actual sin modificar snapshots anteriores.
insert into public.cc_memberships(user_id,business_id,role,status) select '00000000-0000-4000-8000-000000000005',id,'SUPER_RESELLER','ACTIVE' from public.cc_businesses where code='STREAM_BULLS';
insert into public.cc_subscriptions(membership_id,plan_id,status,start_at,end_at) select m.id,p.id,'ACTIVE',now()-interval '1 day',now()+interval '1 month' from public.cc_memberships m join public.cc_plans p on p.business_id=m.business_id where m.user_id='00000000-0000-4000-8000-000000000005' and p.code='STREAM_MONTHLY';
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.cc_portal_purchase_stream_product('30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002',100);
select public.cc_portal_purchase_stream_product('30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002',100);
select pg_temp.ok((select count(*)=1 from public.cc_portal_stream_orders where checkout_key='50000000-0000-4000-8000-000000000002' and admin_percent=30 and admin_fee_pen=30 and seller_payable_pen=70),'Compra real idempotente toma nueva comisión 30/70');
select pg_temp.ok((select count(*)=6 from cc_internal.finance_referral_bonuses),'Comprar un producto no genera bono de membresía');
select pg_temp.ok(cc_internal.sb_delivery_is_seller('00000000-0000-4000-8000-000000000005'),'Proveedor mensual conserva permisos de cuentas y correos');
select pg_temp.ok(exists(select 1 from jsonb_array_elements(cc_internal.cc_business_access_v316('00000000-0000-4000-8000-000000000002')) r where r->>'service'='STREAM_BULLS' and r->>'status'='ACTIVE'),'Rol por plataforma reconoce mensualidad STREAM');
-- Bono gastado: deuda explícita, disponible neto y recuperación antes de una nueva mensualidad.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
update public.cc_real_service_wallets set balance_pen=0 where user_id='00000000-0000-4000-8000-000000000003';
select public.cc_finance_admin('refund_membership',jsonb_build_object('payment_id',(select id from cc_internal.finance_membership_payments where request_id='10000000-0000-4000-8000-000000000001'),'request_id','20000000-0000-4000-8000-000000000002','reason','Bono ya gastado ficticio'));
select pg_temp.ok((select count(*)=1 from cc_internal.finance_referral_bonuses where status='REVERSAL_PENDING'),'Bono gastado queda pendiente, no crea saldo negativo');
update public.cc_real_service_wallets set balance_pen=25 where user_id='00000000-0000-4000-8000-000000000003' and service='STREAM_BULLS';
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select pg_temp.ok((public.cc_finance_wallet()->>'available_pen')::numeric=20,'Disponible descuenta reversión pendiente');
select public.cc_finance_pay_membership('MI_ALQUILER','10000000-0000-4000-8000-000000000030',20);
select pg_temp.ok((select sum(balance_pen)=0 from public.cc_real_service_wallets where user_id=auth.uid()),'Recupera bono pendiente y paga con el resto');
select pg_temp.ok((select count(*)=0 from cc_internal.finance_referral_bonuses where status='REVERSAL_PENDING'),'Reversión recuperada se cierra');
-- Las rutas antiguas sin precio/duración explícitos no pueden cobrar una tarifa diferente.
do $$begin begin perform public.mc_activate_real_wallet_v193('10000000-0000-4000-8000-000000000040');raise exception 'FAIL legacy amountless';exception when others then if sqlerrm='FAIL legacy amountless' then raise;end if;end;end;$$;
-- Cerrar un pago parcial libera solo el remanente, conserva el dinero ya pagado.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
update public.cc_portal_stream_orders set status='FULFILLED' where checkout_key='50000000-0000-4000-8000-000000000002';
select public.cc_finance_admin('approve_settlement',jsonb_build_object('request_id','60000000-0000-4000-8000-000000000002','seller_id','00000000-0000-4000-8000-000000000005','from',now()-interval '31 days','to',now()+interval '1 day','amount_pen',50));
insert into storage.objects(bucket_id,name) values('cc-financial-proofs','00000000-0000-4000-8000-000000000001/proof3.pdf');
do $$declare b uuid;r jsonb;begin
 select id into b from cc_internal.finance_settlements where request_id='60000000-0000-4000-8000-000000000002';
 perform public.cc_finance_admin('record_payment',jsonb_build_object('request_id','70000000-0000-4000-8000-000000000004','settlement_id',b,'amount_pen',20,'method','YAPE','reference','TEST-004','proof_path','00000000-0000-4000-8000-000000000001/proof3.pdf'));
 perform public.cc_finance_admin('close_settlement',jsonb_build_object('settlement_id',b,'reason','Cierre parcial ficticio'));
 perform pg_temp.ok((select status='CLOSED' from cc_internal.finance_settlements where id=b),'Cierre parcial conserva estado separado');
 r:=public.cc_finance_report('00000000-0000-4000-8000-000000000005',now()-interval '31 days',now()+interval '1 day');
 perform pg_temp.ok((r->'totals'->>'paid_pen')::numeric=100 and (r->>'approval_available_pen')::numeric=30,'Cierre libera remanente y compensa devolución ya pagada');
end;$$;
rollback;
