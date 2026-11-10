-- Pruebas ficticias: sin movimientos reales.
begin;
insert into public.mc_accounts(user_id,subscription_until) values('32800000-0000-4000-8000-000000000001',now()+interval '1 month'),('32800000-0000-4000-8000-000000000002',now()+interval '1 month');
insert into public.cc_admins values('32800000-0000-4000-8000-000000000003');
insert into public.mc_carts values(1,'32800000-0000-4000-8000-000000000001'),(2,'32800000-0000-4000-8000-000000000001'),(3,'32800000-0000-4000-8000-000000000002');
insert into public.mc_movements(cart_id,reseller_id,amount_local) select 1,'32800000-0000-4000-8000-000000000001',1 from generate_series(1,2201);
insert into public.mc_movements(cart_id,reseller_id,amount_local) values(1,'32800000-0000-4000-8000-000000000001',-2000),(3,'32800000-0000-4000-8000-000000000002',999);
set local role authenticated;
select set_config('request.jwt.claim.sub','32800000-0000-4000-8000-000000000001',true);
do $$declare data jsonb:=public.mc_my_cart_balances_v328();begin
 if data<>'[{"cart_id":1,"balance_local":201},{"cart_id":2,"balance_local":0}]'::jsonb then raise exception 'Historial truncado o datos ajenos: %',data;end if;
 raise notice 'PASS más de 2000 movimientos, abono histórico, carrito vacío y aislamiento';end;$$;
select set_config('request.jwt.claim.sub','32800000-0000-4000-8000-000000000002',true);
do $$begin if public.mc_my_cart_balances_v328()<>'[{"cart_id":3,"balance_local":999}]'::jsonb then raise exception 'Aislamiento entre cocheras';end if;end;$$;
select set_config('request.jwt.claim.sub','32800000-0000-4000-8000-000000000003',true);
do $$begin if public.mc_my_cart_balances_v328()<>'[]'::jsonb then raise exception 'ADMIN no solicita datos de terceros mediante esta RPC personal';end if;end;$$;
reset role;
update public.mc_accounts set suspended=true where user_id='32800000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','32800000-0000-4000-8000-000000000001',true);
do $$begin if public.mc_my_cart_balances_v328()<>'[]'::jsonb then raise exception 'RLS suspensión';end if;end;$$;
reset role;
update public.mc_accounts set suspended=false,subscription_until=now()-interval '1 day' where user_id='32800000-0000-4000-8000-000000000001';
set local role authenticated;
do $$begin if public.mc_my_cart_balances_v328()<>'[]'::jsonb then raise exception 'RLS vencimiento';end if;end;$$;
reset role;
do $$begin
 if has_function_privilege('anon','public.mc_my_cart_balances_v328()','execute') then raise exception 'Anon con permisos';end if;
 if (select prosecdef from pg_proc where oid='public.mc_my_cart_balances_v328()'::regprocedure) then raise exception 'Debe conservar RLS del invocador';end if;
 if (select count(*) from public.mc_movements)<>2203 then raise exception 'La consulta modificó datos';end if;
 raise notice 'PASS rol, suspensión, vencimiento y consulta sin mutaciones';
end;$$;
rollback;
