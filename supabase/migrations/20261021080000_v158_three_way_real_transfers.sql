-- V158.3: permitir transferencias reales entre cualquier par de las TRES billeteras propias.
-- ÚNICA fuente de débito/abono: cc_real_service_wallets; NUNCA consume bonos promocionales.
-- Referencia idempotente, advisory lock, auditoría existente y sin retiros/otros usuarios.
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
    p_from=p_to then
    raise exception 'Solo puedes transferir entre tus tres billeteras reales del mismo titular';
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
