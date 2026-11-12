-- LOCAL ONLY: never execute test fixtures against production.
\set ON_ERROR_STOP on
insert into auth.users values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into cc_internal.test_access(user_id,active) select id,true from auth.users;
grant usage on schema public,auth to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$declare c uuid;l uuid;l2 uuid;p uuid;r uuid:=gen_random_uuid();d jsonb;v jsonb;begin
 c:=public.cy371_mutate('client',gen_random_uuid(),'{"full_name":"Juan Carlos Rodríguez Pérez","alias":"Juanca","document_number":"12345678","phone":"+51987654321","alternate_phones":["+51911223344"],"search_references":["Referencia autorizada"]}');
 foreach d in array array[to_jsonb('Juan'::text),to_jsonb('Rodriguez'::text),to_jsonb('Juanca'::text),to_jsonb('987654321'::text),to_jsonb('654321'::text),to_jsonb('Pérez Juan'::text),to_jsonb('12345678'::text),to_jsonb('911223344'::text)] loop
  if jsonb_array_length(public.cy371_search(d#>>'{}'))<>1 then raise exception 'Búsqueda falló: %',d;end if;
 end loop;
 d:=jsonb_build_object('client_id',c,'principal','1000.00','monthly_rate','10','months',3,'installments',3,'final_due',current_date+90,'currency','PEN','collateral','Equipo');
 l:=public.cy371_mutate('loan',r,d);
 if public.cy371_mutate('loan',r,d)<>l then raise exception 'Préstamo repetido';end if;
 v:=public.cy371_loan(l);
 if v->>'loan_code'<>'PR-0001' or (v->>'total_due')::numeric<>1300 then raise exception 'Código/cálculo incorrecto %',v;end if;
 if jsonb_array_length(public.cy371_search('PR-0001'))<>1 then raise exception 'Código no encontrado';end if;
 l2:=public.cy371_mutate('loan',gen_random_uuid(),d||'{"currency":"USD"}');
 v:=public.cy371_dashboard();
 if jsonb_array_length(v->'portfolios')<>2 then raise exception 'Se mezclaron monedas';end if;
 r:=gen_random_uuid();d:=jsonb_build_object('loan_id',l,'currency','PEN','amount','100.01','paid_on',current_date,'payment_method','Efectivo','memo','Prueba local');
 p:=public.cy371_mutate('payment',r,d);
 if public.cy371_mutate('payment',r,d)<>p then raise exception 'Abono duplicado';end if;
 v:=public.cy371_loan(l);
 if (v->>'balance')::numeric<>1199.99 or jsonb_array_length(v->'payments')<>1 or v#>>'{payments,0,payment_method}'<>'Efectivo' then raise exception 'Saldo/metadata incorrectos';end if;
 begin perform public.cy371_mutate('payment',r,d||'{"amount":"1"}');raise exception 'FAIL duplicated payload';exception when raise_exception then if sqlerrm='FAIL duplicated payload' then raise;end if;end;
 begin perform public.cy371_mutate('payment',gen_random_uuid(),d||'{"currency":"USD"}');raise exception 'FAIL currency';exception when raise_exception then if sqlerrm='FAIL currency' then raise;end if;end;
 begin perform public.cy371_mutate('payment',gen_random_uuid(),d||'{"amount":"1200"}');raise exception 'FAIL overpayment';exception when raise_exception then if sqlerrm='FAIL overpayment' then raise;end if;end;
 begin perform public.cy371_mutate('payment',gen_random_uuid(),d||'{"amount":"1.001"}');raise exception 'FAIL decimals';exception when raise_exception then if sqlerrm='FAIL decimals' then raise;end if;end;
 -- Existing extension changes dates, not financial amounts.
 perform public.cy371_mutate('extend',gen_random_uuid(),jsonb_build_object('loan_id',l,'months',1,'reason','Prueba local'));
 v:=public.cy371_loan(l);if (v->>'balance')::numeric<>1199.99 then raise exception 'Cambió regla de prórroga';end if;
 perform public.cy371_mutate('correct',gen_random_uuid(),jsonb_build_object('loan_id',l,'principal','1000','monthly_rate','10','months',3,'final_due',current_date+120,'reason','Corrección local'));
 v:=public.cy371_loan(l);if (v->>'balance')::numeric<>1199.99 then raise exception 'Cambió saldo corregido';end if;
 perform public.cy371_mutate('payment',gen_random_uuid(),d||'{"amount":"1199.99"}');
 perform public.cy371_mutate('close',gen_random_uuid(),jsonb_build_object('loan_id',l));
 v:=public.cy371_loan(l);if v->>'status'<>'CLOSED' then raise exception 'Cierre falló';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
do $$declare c uuid;l uuid;begin
 if jsonb_array_length(public.cy371_search('Juan'))<>0 or (public.cy371_dashboard()->>'clients')::int<>0 then raise exception 'Fuga entre propietarios';end if;
 c:=public.cy371_mutate('client',gen_random_uuid(),'{"full_name":"Segundo propietario"}');
 l:=public.cy371_mutate('loan',gen_random_uuid(),jsonb_build_object('client_id',c,'principal','200','monthly_rate','0','months',1,'installments',1,'final_due',current_date+30,'currency','EUR'));
 if public.cy371_loan(l)->>'loan_code'<>'PR-0001' then raise exception 'Numeración no independiente';end if;
end $$;
reset role;
update cc_internal.test_access set active=false where user_id='00000000-0000-4000-8000-000000000002';
set role authenticated;
do $$begin
 begin perform public.cy371_dashboard();raise exception 'FAIL expiry read';exception when insufficient_privilege then null;end;
 begin perform public.cy371_mutate('client',gen_random_uuid(),'{"full_name":"No autorizado"}');raise exception 'FAIL expiry write';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$declare f record;begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'cy371_%' loop
  if has_function_privilege('anon',f.oid,'execute') then raise exception 'RPC anónima';end if;
 end loop;
 if (select count(*) from public.cy_payments)<>2 then raise exception 'Historial alterado';end if;
end $$;
select 'PASS: búsqueda, monedas, importes, idempotencia, aislamiento, vencimiento e historial' result;
