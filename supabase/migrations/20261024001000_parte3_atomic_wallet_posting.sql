-- Parte 3/7: misma rutina aplicada en STAGING; solo uso backend.
create or replace function public.cc_clan_post_wallet_operation(
 p_user_id uuid, p_wallet_kind text, p_service text, p_amount_pen numeric, p_operation_key text
) returns numeric
language plpgsql security invoker set search_path = ''
as $$
declare v_balance numeric; v_existing public.cc_clan_wallet_operations%rowtype;
begin
 if p_user_id is null or p_wallet_kind not in ('REAL','ACTIVATION_BONUS')
    or p_service not in ('STREAM_BULLS','COBRA_YA','MI_COCHERA','MI_ALQUILER')
    or p_amount_pen is null or p_amount_pen = 0
    or p_amount_pen <> round(p_amount_pen,2)
    or p_operation_key is null or length(trim(p_operation_key)) < 12 or length(p_operation_key)>200
    or (p_wallet_kind='ACTIVATION_BONUS' and p_service='STREAM_BULLS') then
   raise exception 'Invalid wallet operation';
 end if;
 if p_wallet_kind='REAL' then
  insert into public.cc_clan_real_wallets(user_id) values(p_user_id) on conflict(user_id) do nothing;
  select balance_pen into v_balance from public.cc_clan_real_wallets where user_id=p_user_id for update;
 else
  insert into public.cc_clan_activation_bonus_wallets(user_id,service)
   values(p_user_id,p_service) on conflict(user_id,service) do nothing;
  select balance_pen into v_balance from public.cc_clan_activation_bonus_wallets
   where user_id=p_user_id and service=p_service for update;
 end if;
 select * into v_existing from public.cc_clan_wallet_operations where operation_key=p_operation_key;
 if found then
  if v_existing.user_id <> p_user_id or v_existing.wallet_kind <> p_wallet_kind
    or v_existing.service <> p_service or v_existing.amount_pen <> p_amount_pen then
    raise exception 'Idempotency key reused for different operation';
  end if;
  return v_balance;
 end if;
 if v_balance + p_amount_pen < 0 then raise exception 'Insufficient funds'; end if;
 insert into public.cc_clan_wallet_operations(user_id,wallet_kind,service,amount_pen,operation_key)
 values(p_user_id,p_wallet_kind,p_service,p_amount_pen,p_operation_key);
 if p_wallet_kind='REAL' then
  update public.cc_clan_real_wallets set balance_pen=v_balance+p_amount_pen,updated_at=now() where user_id=p_user_id;
 else
  update public.cc_clan_activation_bonus_wallets set balance_pen=v_balance+p_amount_pen,updated_at=now()
  where user_id=p_user_id and service=p_service;
 end if;
 return v_balance+p_amount_pen;
end $$;
revoke all on function public.cc_clan_post_wallet_operation(uuid,text,text,numeric,text) from public, anon, authenticated;
grant execute on function public.cc_clan_post_wallet_operation(uuid,text,text,numeric,text) to service_role;
