-- V156: Binance personal USDT -> saldo interno PEN. Acreditación conservadora.
-- El QR personal no equivale a autorización comercial: NO habilitar el cobro al migrar.
create table if not exists public.cc_binance_personal_policy (
 id boolean primary key default true check (id=true),
 commercial_authorized boolean not null default false,
 authorization_evidence text,
 verified_at timestamptz,
 verified_by uuid references auth.users(id),
 updated_at timestamptz not null default now(),
 constraint cc_binance_personal_policy_evidence_required check
  (not commercial_authorized or (length(coalesce(authorization_evidence,''))>=15 and verified_at is not null and verified_by is not null))
);
insert into public.cc_binance_personal_policy (id) values (true) on conflict (id) do nothing;
alter table public.cc_binance_personal_policy enable row level security;
revoke all on public.cc_binance_personal_policy from public,anon,authenticated;
grant select on public.cc_binance_personal_policy to authenticated;
drop policy if exists cc_binance_policy_admin_read on public.cc_binance_personal_policy;
create policy cc_binance_policy_admin_read on public.cc_binance_personal_policy
 for select to authenticated using (exists(select 1 from public.cc_admins where user_id=(select auth.uid())));
alter table public.cc_admin_verified_personal_topups
 add column if not exists net_settled_pen numeric(14,2),
 add column if not exists settlement_reference text,
 add column if not exists quote_id bigint references public.cc_usdt_pen_reference_rates(id);
create unique index if not exists cc_personal_binance_unique_settlement
on public.cc_admin_verified_personal_topups(lower(btrim(settlement_reference)))
where provider='BINANCE_PERSONAL' and settlement_reference is not null;

create or replace function cc_internal.cc_validate_binance_personal_topup()
returns trigger
language plpgsql
security definer
set search_path=''
as $body$
declare q public.cc_usdt_pen_reference_rates%rowtype;
begin
 if new.provider<>'BINANCE_PERSONAL' then return new; end if;
 if not coalesce((select commercial_authorized from public.cc_binance_personal_policy where id=true),false) then
  raise exception 'Binance personal no autorizado para cobros comerciales: acreditación deshabilitada';
 end if;
 if new.net_settled_pen is null or new.net_settled_pen<=0
  or new.net_settled_pen<>round(new.net_settled_pen,2)
  or new.settlement_reference is null or length(btrim(new.settlement_reference)) not between 8 and 120
  or new.quote_id is null
 then raise exception 'Falta comprobación del importe neto PEN realmente liquidado';end if;
 select * into q from public.cc_usdt_pen_reference_rates where id=new.quote_id;
 if not found or q.valid_until<now()+interval '10 seconds'
   or q.observed_at<now()-interval '2 minutes'
   or q.rate_pen_per_usdt<=0 or q.gross_rate_pen_per_usdt is null
   or q.conversion_cost_pct<0.25 or q.protection_margin_pct<2
 then raise exception 'Cotización de mercado ausente o vencida';end if;
 if new.received_currency<>'USDT'
  or new.received_amount>q.available_usdt
  or new.rate_pen_per_unit<>q.rate_pen_per_usdt
  or new.credited_pen>trunc(new.received_amount*q.rate_pen_per_usdt,2)
  or new.credited_pen>new.net_settled_pen
 then raise exception 'Acreditación PEN superior al precio protegido o a lo liquidado';end if;
 return new;
end $body$;
revoke all on function cc_internal.cc_validate_binance_personal_topup() from public,anon,authenticated;
drop trigger if exists cc_personal_binance_net_settlement_guard on public.cc_admin_verified_personal_topups;
create trigger cc_personal_binance_net_settlement_guard
before insert on public.cc_admin_verified_personal_topups for each row
execute function cc_internal.cc_validate_binance_personal_topup();

create or replace function public.cc_admin_credit_verified_binance_personal(
 p_recipient_email text,
 p_service text,
 p_received_usdt numeric,
 p_transaction_reference text,
 p_net_settled_pen numeric,
 p_settlement_reference text,
 p_confirmed_received boolean,
 p_confirmed_settled boolean,
 p_note text default null
)
returns jsonb
language plpgsql security definer set search_path=''
as $body$
declare
 v_admin uuid:=auth.uid();v_recipient uuid;
 q public.cc_usdt_pen_reference_rates%rowtype;
 v_tx text:=lower(btrim(coalesce(p_transaction_reference,'')));
 v_settlement text:=lower(btrim(coalesce(p_settlement_reference,'')));
 v_usdt numeric(18,8);
 v_settled numeric(14,2);
 v_credit numeric(14,2);
 v_balance numeric(14,2);
 v_note text:=nullif(btrim(coalesce(p_note,'')),'');
begin
 if v_admin is null or not exists(select 1 from public.cc_admins where user_id=v_admin) then raise exception 'Solo ADMIN';end if;
 if p_confirmed_received is distinct from true or p_confirmed_settled is distinct from true
 then raise exception 'ADMIN debe confirmar ingreso USDT y conversión PEN liquidada';end if;
 if not coalesce((select commercial_authorized from public.cc_binance_personal_policy where id=true),false)
 then raise exception 'Cuenta Binance personal sin autorización comercial comprobada';end if;
 if p_service not in ('COBRA_YA','STREAM_BULLS') then raise exception 'Billetera inválida';end if;
 if p_received_usdt is null or p_received_usdt<=0 or p_received_usdt>1000 or p_received_usdt<>round(p_received_usdt,8)
 then raise exception 'USDT recibido inválido';end if;
 if p_net_settled_pen is null or p_net_settled_pen<1 or p_net_settled_pen>1000 or p_net_settled_pen<>round(p_net_settled_pen,2)
 then raise exception 'Ingreso neto PEN realmente liquidado inválido';end if;
 if length(v_tx) not between 8 and 120 or v_tx~'[<>]'
 or length(v_settlement) not between 8 and 120 or v_settlement~'[<>]'
 or length(coalesce(v_note,''))>200
 then raise exception 'Referencias o nota inválidas';end if;
 select id into v_recipient from auth.users
  where lower(email)=lower(btrim(p_recipient_email)) and email_confirmed_at is not null;
 if v_recipient is null or v_recipient=v_admin then raise exception 'Destinatario inválido';end if;
 if not exists(select 1 from public.cc_memberships m join public.cc_businesses b on b.id=m.business_id
  where m.user_id=v_recipient and b.code=p_service and m.status<>'SUSPENDED')
 then raise exception 'Destinatario no dispone de la billetera solicitada';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('CC:BINANCE:ADMIN:RATE',0));
 select * into q from public.cc_usdt_pen_reference_rates
  where valid_until>now()+interval '10 seconds'
   and observed_at>now()-interval '2 minutes'
   and observed_at<=now()+interval '15 seconds'
  order by observed_at desc,id desc limit 1;
 if not found then raise exception 'No existe cotización USDT/PEN reciente y protegida';end if;
 if p_received_usdt>q.available_usdt then raise exception 'Volumen USDT mayor al disponible para convertir';end if;
 v_usdt:=p_received_usdt; v_settled:=p_net_settled_pen;
 v_credit:=least(trunc(v_usdt*q.rate_pen_per_usdt,2),v_settled);
 if v_credit<1 or v_credit>1000 then raise exception 'Valor PEN a acreditar fuera de S/1 a S/1000';end if;
 insert into public.cc_admin_verified_personal_topups (
 recipient_id,service,provider,received_amount,received_currency,
 rate_pen_per_unit,credited_pen,provider_transaction_id,verified_by,note,
 net_settled_pen,settlement_reference,quote_id)
 values (v_recipient,p_service,'BINANCE_PERSONAL',v_usdt,'USDT',
 q.rate_pen_per_usdt,v_credit,v_tx,v_admin,v_note,v_settled,v_settlement,q.id);
 perform set_config('cc_audit.kind','BINANCE_USDT_SETTLED_TO_PEN',true);
 perform set_config('cc_audit.concept','USDT recibido y liquidación neta PEN cotejada por ADMIN',true);
 perform set_config('cc_audit.reference','PERSONAL-BINANCE-'||v_tx,true);
 perform set_config('cc_audit.payment','BINANCE-'||v_tx,true);
 perform set_config('cc_audit.reason','Neto comprobado: S/'||v_settled||'; liquidación '||v_settlement||'; fuente '||left(q.source,100),true);
 insert into public.cc_real_service_wallets(user_id,service,balance_pen)
  values(v_recipient,p_service,v_credit)
  on conflict(user_id,service) do update
    set balance_pen=public.cc_real_service_wallets.balance_pen+excluded.balance_pen,
        updated_at=now()
 returning balance_pen into v_balance;
 return jsonb_build_object('credited_pen',v_credit,'new_balance_pen',v_balance,
 'received_usdt',v_usdt,'net_settled_pen',v_settled,
 'effective_rate_pen_per_usdt',q.rate_pen_per_usdt,'quote_source',q.source,
 'quote_id',q.id,'conversion_cost_pct',q.conversion_cost_pct,
 'protection_margin_pct',q.protection_margin_pct);
end $body$;
revoke all on function public.cc_admin_credit_verified_binance_personal(text,text,numeric,text,numeric,text,boolean,boolean,text) from public,anon;
grant execute on function public.cc_admin_credit_verified_binance_personal(text,text,numeric,text,numeric,text,boolean,boolean,text) to authenticated;
