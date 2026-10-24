-- CLAN CARTAN | STAGING only | Préstamos: 1-4 meses o días libres.
alter table public.cy_loans add column if not exists demo_term_unit text;
alter table public.cy_loans add column if not exists demo_term_value integer;
alter table public.cy_loans add column if not exists demo_final_due date;
alter table public.cy_loans drop constraint if exists cy_demo_term_consistency;
alter table public.cy_loans add constraint cy_demo_term_consistency
 check ((demo_term_unit is null and demo_term_value is null and demo_final_due is null)
 or (demo_term_unit='MONTHS' and demo_term_value between 1 and 4 and demo_final_due is not null)
 or (demo_term_unit='DAYS' and demo_term_value between 1 and 365 and demo_final_due is not null));
CREATE OR REPLACE FUNCTION public.cc_clan_cobra_create_demo_loan_with_term(p_user_id uuid, p_client_id uuid, p_request_id uuid, p_principal numeric, p_interest_percent numeric, p_installments integer, p_term_unit text, p_term_value integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 v_old public.cy_loans%rowtype;
 v_loan_id uuid;
 v_today date:=(now() at time zone 'America/Lima')::date;
 v_final date;
 v_due date;
 v_first_due date;
 v_total numeric(14,2);
 v_regular numeric(14,2);
 v_payment numeric(14,2);
 v_span integer;
 v_n integer;
begin
 if current_user<>'service_role' then raise exception 'Server-only demo loan';end if;
 if p_user_id is null or p_client_id is null or p_request_id is null
   or p_principal is null or p_principal<>round(p_principal,2)
   or p_principal<10 or p_principal>10000
   or p_interest_percent is null or p_interest_percent<>round(p_interest_percent,2)
   or p_interest_percent<0 or p_interest_percent>100
   or p_installments is null or p_installments not between 1 and 12
   or p_term_value is null
   or not ((p_term_unit='MONTHS' and p_term_value between 1 and 4)
           or (p_term_unit='DAYS' and p_term_value between 1 and 365))
 then raise exception 'Invalid demo loan duration or payment parameters';end if;
 if p_term_unit='MONTHS' then
   v_final:=(v_today+pg_catalog.make_interval(months=>p_term_value))::date;
 else
   v_final:=v_today+p_term_value;
 end if;
 v_span:=v_final-v_today;
 if p_installments>v_span then
  raise exception 'There cannot be more installments than duration days';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'clan-cobra-demo-loan:'||p_request_id::text,0));
 select * into v_old from public.cy_loans where demo_request_id=p_request_id for update;
 if found then
   if v_old.owner_id<>p_user_id or v_old.client_id<>p_client_id
     or v_old.principal<>p_principal
     or v_old.interest_rate<>p_interest_percent
     or v_old.term_installments<>p_installments
     or v_old.demo_term_unit is distinct from p_term_unit
     or v_old.demo_term_value is distinct from p_term_value
     or v_old.currency<>'PEN'
   then raise exception 'Demo request ID reused with other terms';end if;
   return pg_catalog.jsonb_build_object('loan_id',v_old.id,'final_due',v_old.demo_final_due);
 end if;
 if not exists(select 1 from public.cc_clan_cobra_access_periods
  where user_id=p_user_id and starts_at<=now() and ends_at>now())
 then raise exception 'Active COBRA YA subscription required';end if;
 if not exists(select 1 from public.cy_clients
  where id=p_client_id and owner_id=p_user_id and alias='DEMO')
 then raise exception 'Only your own fictitious client is permitted';end if;
 v_total:=round(p_principal*(1+p_interest_percent/100),2);
 v_regular:=trunc(v_total/p_installments,2);
 -- First due is derived from selected duration, never supplied by browser.
 v_first_due:=v_today+pg_catalog.ceil(v_span::numeric/p_installments)::integer;
 insert into public.cy_loans(
  owner_id,client_id,principal,interest_rate,term_installments,currency,
  issued_on,first_due_on,interval_months,calculation_method,total_due,
  demo_request_id,demo_origin,demo_term_unit,demo_term_value,demo_final_due
 ) values(
  p_user_id,p_client_id,p_principal,p_interest_percent,p_installments,'PEN',
  v_today,v_first_due,1,'FLAT_SIMPLE',v_total,
  p_request_id,'NEW_DEMO',p_term_unit,p_term_value,v_final
 ) returning id into v_loan_id;
 for v_n in 1..p_installments loop
   v_due:=v_today+pg_catalog.ceil((v_span::numeric*v_n)/p_installments)::integer;
   v_payment:=case when v_n=p_installments
     then v_total-v_regular*(p_installments-1) else v_regular end;
   insert into public.cy_installments(
     loan_id,owner_id,installment_number,due_on,amount,paid_total,status
   ) values(v_loan_id,p_user_id,v_n,v_due,v_payment,0,'PENDING');
 end loop;
 if (select count(*) from public.cy_installments
   where loan_id=v_loan_id and owner_id=p_user_id)<>p_installments
 then raise exception 'Incomplete installment schedule';end if;
 return pg_catalog.jsonb_build_object('loan_id',v_loan_id,'final_due',v_final);
end $function$

revoke all on function public.cc_clan_cobra_create_demo_loan_with_term(uuid,uuid,uuid,numeric,numeric,integer,text,integer) from public,anon,authenticated;
grant execute on function public.cc_clan_cobra_create_demo_loan_with_term(uuid,uuid,uuid,numeric,numeric,integer,text,integer) to service_role;
