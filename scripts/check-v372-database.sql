-- LOCAL/CI ONLY. Real RPCs run on synthetic identities; no production data.
\set ON_ERROR_STOP on
update cc_internal.test_access set active=true;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$declare c uuid;l uuid;late uuid;paid uuid;p uuid;r jsonb;d date;before_count integer;after_count integer;begin
 perform public.cy372_set_timezone('Europe/Madrid');
 if public.cy372_context()->>'timezone'<>'Europe/Madrid' then raise exception 'Preferencia horaria no persistida';end if;
 perform public.cy372_set_timezone('America/Lima',true);
 if public.cy372_context()->>'timezone'<>'Europe/Madrid' then raise exception 'Otro dispositivo sobrescribió la preferencia inicial';end if;
 begin update public.cy372_settings set owner_id='00000000-0000-4000-8000-000000000002';raise exception 'Cambio de propietario permitido';exception when insufficient_privilege then null;end;
 perform public.cy372_set_timezone('America/Lima');
 d:=(public.cy372_context()->>'local_date')::date;
 c:=public.cy371_mutate('client',gen_random_uuid(),'{"full_name":"Ana Agenda","alias":"Anita","phone":"+51999111222","document_number":"87654321"}');
 l:=public.cy371_mutate('loan',gen_random_uuid(),jsonb_build_object('client_id',c,'principal','300','monthly_rate','0','months',3,'installments',3,'final_due',d+90,'currency','EUR'));
 perform set_config('cy372.test_loan',l::text,false);perform set_config('cy372.test_client',c::text,false);
 late:=public.cy371_mutate('loan',gen_random_uuid(),jsonb_build_object('client_id',c,'principal','300','monthly_rate','0','months',3,'installments',3,'final_due',d+90,'currency','JPY'));
 perform set_config('cy372.test_late',late::text,false);
end $$;
reset role;
-- Only local fixture dates are adjusted to hit deterministic calendar buckets.
update public.cy_installments set due_on=case installment_number when 1 then (public.cy372_context('America/Lima')->>'local_date')::date-2 when 2 then (public.cy372_context('America/Lima')->>'local_date')::date else (public.cy372_context('America/Lima')->>'local_date')::date+1 end where loan_id=current_setting('cy372.test_loan')::uuid;
update public.cy_installments set due_on=(public.cy372_context('America/Lima')->>'local_date')::date+case installment_number when 1 then -2 when 2 then -1 else 1 end where loan_id=current_setting('cy372.test_late')::uuid;
set role authenticated;
do $$declare c uuid:=current_setting('cy372.test_client')::uuid;l uuid:=current_setting('cy372.test_loan')::uuid;late uuid;paid uuid;p uuid;r jsonb;d date;before_count integer;n integer;a jsonb;b jsonb;begin
 d:=(public.cy372_context('America/Lima')->>'local_date')::date;
 p:=public.cy371_mutate('payment',gen_random_uuid(),jsonb_build_object('loan_id',l,'currency','EUR','amount','150','paid_on',d,'payment_method','Efectivo'));
 perform set_config('cy372.test_payment',p::text,false);
 r:=public.cy372_agenda('today','America/Lima','EUR');
 if (r->>'total')::int<>1 or (r->'rows'->0->>'amount')::numeric<>50 then raise exception 'Cuota parcial de hoy incorrecta: %',r;end if;
 if (public.cy372_agenda('late','America/Lima','EUR')->>'total')::int<>0 then raise exception 'Una cuota totalmente pagada aparece vencida';end if;
 if (public.cy372_agenda('tomorrow','America/Lima','EUR')->'rows'->0->>'amount')::numeric<>100 then raise exception 'Agenda de mañana incorrecta';end if;
 if (public.cy372_agenda('soon','America/Lima','EUR')->>'total')::int<>1 then raise exception 'Agenda de próximos 7 días incorrecta';end if;
 r:=public.cy372_agenda('late','America/Lima','JPY');
 if (r->>'total')::int<>1 or (r->'rows'->0->>'amount')::numeric<>200 or (r->'rows'->0->>'installments')::int<>2 then raise exception 'Agenda duplicó préstamo o importe: %',r;end if;
 r:=public.cy372_financials(d,d,'America/Lima');select value into r from jsonb_array_elements(r->'rows') where value->>'currency'='EUR';
 if (r->>'principal')::numeric<>300 or (r->>'collected')::numeric<>150 or (r->>'balance')::numeric<>150 or r->>'principal_recovered' is not null or r->>'interest_collected' is not null then raise exception 'Informe inventó asignación o mezcló monedas: %',r;end if;
 select count(*) into before_count from public.cy_payments;
 r:=public.cy372_receipt(p,'America/Lima');perform public.cy372_receipt(p,'America/Lima');
 if r->>'id'<>p::text or (r->>'amount')::numeric<>150 or (r->>'current_balance')::numeric<>150 then raise exception 'Comprobante incorrecto';end if;
 if (select count(*) from public.cy_payments)<>before_count then raise exception 'Consultar comprobante duplicó pagos';end if;
 paid:=public.cy371_mutate('loan',gen_random_uuid(),jsonb_build_object('client_id',c,'principal','10','monthly_rate','0','months',1,'installments',1,'final_due',d+30,'currency','GBP'));
 perform public.cy371_mutate('payment',gen_random_uuid(),jsonb_build_object('loan_id',paid,'currency','GBP','amount','10','paid_on',d,'payment_method','Efectivo'));
 if (public.cy372_agenda('paid','America/Lima','GBP')->>'total')::int<>1 then raise exception 'Préstamo pagado no aparece en agenda';end if;
 if (public.cy372_dashboard('America/Lima')->>'today')::int<1 then raise exception 'Indicador de hoy incorrecto';end if;
 begin perform public.cy372_context('Zona/No_existe');raise exception 'Zona inválida aceptada';exception when others then if sqlerrm='Zona inválida aceptada' then raise;end if;end;
 if public.cy372_context('Pacific/Kiritimati')->>'local_date'<>((current_timestamp at time zone 'Pacific/Kiritimati')::date)::text then raise exception 'Zona horaria incorrecta';end if;
 for n in 1..60 loop
  perform public.cy371_mutate('loan',gen_random_uuid(),jsonb_build_object('client_id',c,'principal','1','monthly_rate','0','months',1,'installments',1,'final_due',d+1,'currency','CHF'));
 end loop;
 a:=public.cy372_agenda('tomorrow','America/Lima','CHF',1000,0);b:=public.cy372_agenda('tomorrow','America/Lima','CHF',50,50);
 if (a->>'total')::int<>60 or jsonb_array_length(a->'rows')<>50 or jsonb_array_length(b->'rows')<>10 then raise exception 'Paginación de agenda incorrecta';end if;
 if exists(select 1 from jsonb_array_elements(a->'rows') x join jsonb_array_elements(b->'rows') y on x->>'id'=y->>'id') then raise exception 'Páginas de agenda superpuestas';end if;
end $$;
-- Another active owner cannot read the receipt or agenda rows of the first owner.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
do $$begin
 if exists(select 1 from public.cy372_settings where owner_id='00000000-0000-4000-8000-000000000001') then raise exception 'Preferencia horaria cruzó propietarios';end if;
 if (public.cy372_agenda('today','America/Lima')->>'total')::int<>0 then raise exception 'Agenda cruzó propietarios';end if;
 if exists(select 1 from public.cy_payments where id=current_setting('cy372.test_payment')::uuid) then raise exception 'RLS cruzó propietarios';end if;
 begin perform public.cy372_receipt(current_setting('cy372.test_payment')::uuid);raise exception 'Recibo cruzó propietarios';exception when others then if sqlerrm='Recibo cruzó propietarios' then raise;end if;end;
end $$;
reset role;
update cc_internal.test_access set active=false where user_id='00000000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$declare q text;begin
 foreach q in array array['select public.cy372_set_timezone(''America/Lima'')','select public.cy372_context()','select public.cy372_dashboard()','select public.cy372_agenda()','select public.cy372_financials(current_date,current_date)','select public.cy372_receipt('''||current_setting('cy372.test_payment')||''')'] loop
  begin execute q;raise exception 'Activación vencida permitió operación';exception when insufficient_privilege then null;end;
 end loop;
end $$;
reset role;
update cc_internal.test_access set active=true where user_id='00000000-0000-4000-8000-000000000001';
do $$begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'cy372_%' and (p.prosecdef or has_function_privilege('anon',p.oid,'EXECUTE'))) then raise exception 'Permisos de funciones V372 incorrectos';end if;
end $$;
select 'PASS V372: agenda, paid installments, partials, timezone, currency, receipts read-only, RLS, expired activation, invoker functions' result;
