-- LOCAL/CI ONLY. Read-only workspace and isolation against >2000 synthetic movements.
\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$declare r jsonb;p jsonb;q jsonb;v text;s jsonb;begin
 r:=public.mc373_workspace();if (r->>'total')::integer<>67 then raise exception 'Cartera incompleta';end if;
 if (r->'selected'->>'balance_local')::numeric<>1507.50 then raise exception 'Saldo truncado por límite de movimientos';end if;
 select value into s from jsonb_array_elements(r->'summary') where value->>'currency'='PEN';
 if (s->>'debt')::numeric<>1507.50 or (s->>'rent_today')::numeric<>5 or (s->>'product_today')::numeric<>2.50 or (s->>'paid_today')::numeric<>1000 then raise exception 'Resumen PEN incorrecto: %',s;end if;
 select value into s from jsonb_array_elements(r->'summary') where value->>'currency'='USD';if (s->>'debt')::numeric<>17 then raise exception 'Monedas mezcladas';end if;
 foreach v in array array['Paisa','Rodriguez','Perez Juan','12345678','987654321','654321','C-001','C001'] loop
  r:=public.mc373_workspace(p_query=>v);if (r->>'total')::int<1 or not exists(select 1 from jsonb_array_elements(r->'rows') x where x->>'id'='1') then raise exception 'Búsqueda falló %',v;end if;
 end loop;
 r:=public.mc373_workspace(p_due=>true);if (r->>'total')::int<>2 then raise exception 'Filtro de cobros incorrecto';end if;
 r:=public.mc373_workspace(p_state=>'RETIRED');if (r->>'total')::int<>1 then raise exception 'Filtro de retirados incorrecto';end if;
 p:=public.mc373_workspace(p_limit=>1000);q:=public.mc373_workspace(p_limit=>50,p_offset=>50);
 if jsonb_array_length(p->'rows')<>50 or jsonb_array_length(q->'rows')<>17 then raise exception 'Paginación incorrecta';end if;
 if exists(select 1 from jsonb_array_elements(p->'rows') a join jsonb_array_elements(q->'rows') b on a->>'id'=b->>'id') then raise exception 'Páginas superpuestas';end if;
 r:=public.mc373_workspace(p_cart=>3);if r->'selected'->>'reseller_id'='00000000-0000-4000-8000-000000000002' then raise exception 'Ficha de otro propietario expuesta';end if;
 if exists(select 1 from public.mc_carts where reseller_id='00000000-0000-4000-8000-000000000002') then raise exception 'RLS incorrecto';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
do $$begin if (public.mc373_workspace()->>'total')::int<>1 then raise exception 'Aislamiento incorrecto';end if;end $$;
reset role;
update public.mc_accounts set subscription_until=now()-interval '1 day' where user_id='00000000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$begin begin perform public.mc373_workspace();raise exception 'Acceso vencido permitido';exception when insufficient_privilege then null;end;end $$;
reset role;
update public.mc_accounts set subscription_until=now()+interval '30 days' where user_id='00000000-0000-4000-8000-000000000001';
do $$begin if has_function_privilege('anon','public.mc373_workspace(text,text,boolean,integer,integer,bigint)','EXECUTE') or (select prosecdef from pg_proc where oid='public.mc373_workspace(text,text,boolean,integer,integer,bigint)'::regprocedure) then raise exception 'Permisos incorrectos';end if;if (select count(*) from public.mc_movements)<>2510 then raise exception 'La consulta modificó movimientos';end if;end $$;
select 'PASS MC373: complete balances, currencies, search, pagination, RLS, expiry and no financial writes' result;
