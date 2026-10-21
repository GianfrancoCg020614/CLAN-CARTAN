-- V158.2 · Tercera billetera REAL MI COCHERA, sin mezclar bono promocional.
-- Conserva íntegramente el procedimiento histórico COBRA YA ⇄ STREAM BULL'S.
alter table public.cc_real_service_wallets drop constraint cc_real_service_wallets_service_check;
alter table public.cc_real_service_wallets add constraint cc_real_service_wallets_service_check check (service in ('COBRA_YA','STREAM_BULLS','MI_COCHERA'));
alter table public.cc_real_wallet_transfers drop constraint cc_real_wallet_transfers_from_service_check;
alter table public.cc_real_wallet_transfers add constraint cc_real_wallet_transfers_from_service_check check(from_service in ('COBRA_YA','STREAM_BULLS','MI_COCHERA'));
alter table public.cc_real_wallet_transfers drop constraint cc_real_wallet_transfers_to_service_check;
alter table public.cc_real_wallet_transfers add constraint cc_real_wallet_transfers_to_service_check check(to_service in ('COBRA_YA','STREAM_BULLS','MI_COCHERA'));
-- Sin permitir ingreso a saldo REAL por comprobantes, fotos o clics YA PAGUE.
create table if not exists public.mc_real_transfer_requests(
 request_id uuid primary key,
 user_id uuid not null references auth.users(id),
 from_service text not null,
 to_service text not null,
 amount_pen numeric(12,2) not null check(amount_pen>0),
 transfer_id uuid not null unique references public.cc_real_wallet_transfers(id),
 created_at timestamptz not null default now()
);
alter table public.mc_real_transfer_requests enable row level security;
grant select on public.mc_real_transfer_requests to authenticated;
revoke insert,update,delete on public.mc_real_transfer_requests from anon,authenticated;
create policy mc_real_transfers_owner on public.mc_real_transfer_requests for select to authenticated using (user_id=(select auth.uid()) or exists(select 1 from public.cc_admins a where a.user_id=(select auth.uid())));
create or replace function public.mc_transfer_real_balance(
 p_from text,p_to text,p_amount numeric,p_request uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid();
 source_amount numeric;
 old public.mc_real_transfer_requests%rowtype;
 new_id uuid;
begin
 if uid is null then raise exception 'Requiere iniciar sesion';end if;
 if p_request is null or p_amount is null or p_amount<0.01 or p_amount>100000 or p_amount<>round(p_amount,2) then raise exception 'Monto o referencia incorrectos';end if;
 if p_from not in ('MI_COCHERA','COBRA_YA','STREAM_BULLS') or
    p_to not in ('MI_COCHERA','COBRA_YA','STREAM_BULLS') or
    p_from=p_to or
    (p_from<>'MI_COCHERA' and p_to<>'MI_COCHERA') then
    raise exception 'Solo se permiten transferencias entre MI COCHERA y tus otras billeteras';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text||':CC_REAL_WALLET_TRANSFER',0));
 select * into old from public.mc_real_transfer_requests where request_id=p_request;
 if found then
  if old.user_id<>uid or old.from_service<>p_from or old.to_service<>p_to or old.amount_pen<>p_amount then raise exception 'Referencia ya utilizada por otra operacion';end if;
  return old.transfer_id;
 end if;
 insert into public.cc_real_service_wallets(user_id,service,balance_pen)
 values(uid,'COBRA_YA',0),(uid,'STREAM_BULLS',0),(uid,'MI_COCHERA',0)
 on conflict(user_id,service) do nothing;
 perform 1 from public.cc_real_service_wallets
 where user_id=uid and service in ('COBRA_YA','STREAM_BULLS','MI_COCHERA') order by service for update;
 select balance_pen into source_amount from public.cc_real_service_wallets where user_id=uid and service=p_from;
 if coalesce(source_amount,0)<p_amount then raise exception 'Saldo real verificado insuficiente (bonos no transferibles)';end if;
 update public.cc_real_service_wallets set balance_pen=balance_pen-p_amount,updated_at=now()
 where user_id=uid and service=p_from;
 update public.cc_real_service_wallets set balance_pen=balance_pen+p_amount,updated_at=now()
 where user_id=uid and service=p_to;
 insert into public.cc_real_wallet_transfers(user_id,from_service,to_service,amount_pen)
 values(uid,p_from,p_to,p_amount) returning id into new_id;
 insert into public.mc_real_transfer_requests(request_id,user_id,from_service,to_service,amount_pen,transfer_id)
 values(p_request,uid,p_from,p_to,p_amount,new_id);
 return new_id;
end $$;
revoke all on function public.mc_transfer_real_balance(text,text,numeric,uuid) from public,anon,authenticated;
grant execute on function public.mc_transfer_real_balance(text,text,numeric,uuid) to authenticated;
