-- Migration applied ONLY to STAGING as parte34_verified_fulfillment_gate_staging.
-- Private proof of fulfillment: no REAL debit before verified service delivery.
create table if not exists public.cc_clan_service_fulfillment_receipts(
 activation_key text primary key,
 user_id uuid not null references auth.users(id),
 service text not null check(service in ('STREAM_BULLS','COBRA_YA','MI_COCHERA','MI_ALQUILER')),
 amount_pen numeric(14,2) not null check(amount_pen>0),
 fulfillment_reference text not null unique,
 fulfilled_at timestamptz not null,
 created_at timestamptz not null default now(),
 constraint fulfillment_reference_length check(length(fulfillment_reference) between 12 and 180)
);
alter table public.cc_clan_service_fulfillment_receipts enable row level security;
revoke all on public.cc_clan_service_fulfillment_receipts from public,anon,authenticated;
grant all on public.cc_clan_service_fulfillment_receipts to service_role;
create or replace function public.cc_clan_activate_with_real_wallet(
 p_referred_user_id uuid,p_service text,p_amount_pen numeric,
 p_activation_key text,p_receipt_key text
) returns text language plpgsql security invoker set search_path='' as $fn$
declare
 v_old public.cc_clan_verified_real_activations%rowtype;
 v_fulfill public.cc_clan_service_fulfillment_receipts%rowtype;
 v_balance numeric; v_debit_key text;
begin
 if current_user <> 'service_role' then raise exception 'Server-only activation'; end if;
 if p_referred_user_id is null or p_service not in ('STREAM_BULLS','COBRA_YA','MI_COCHERA','MI_ALQUILER')
 or p_amount_pen is null or p_amount_pen<=0 or p_amount_pen<>round(p_amount_pen,2)
 or p_activation_key is null or length(p_activation_key) not between 12 and 130
 or p_receipt_key is null or length(p_receipt_key) not between 12 and 130
 then raise exception 'Invalid activation payment'; end if;
 v_debit_key='activation-real:v1:'||p_activation_key;
 select * into v_old from public.cc_clan_verified_real_activations where activation_key=p_activation_key;
 if found then
  if v_old.referred_user_id<>p_referred_user_id or v_old.service<>p_service
  or v_old.verified_real_amount_pen<>p_amount_pen or v_old.source_receipt_id<>p_receipt_key
  then raise exception 'Activation replay changed original details'; end if;
  return 'ALREADY_ACTIVATED';
 end if;
 select * into v_fulfill from public.cc_clan_service_fulfillment_receipts
 where activation_key=p_activation_key for update;
 if not found or v_fulfill.user_id<>p_referred_user_id
 or v_fulfill.service<>p_service or v_fulfill.amount_pen<>p_amount_pen
 or v_fulfill.fulfillment_reference<>p_receipt_key
 then raise exception 'Service fulfillment not verified'; end if;
 v_balance:=public.cc_clan_post_wallet_operation(p_referred_user_id,'REAL',p_service,-p_amount_pen,v_debit_key);
 insert into public.cc_clan_verified_real_activations
 (activation_key,referred_user_id,service,verified_real_amount_pen,confirmed_at,source_receipt_id)
 values(p_activation_key,p_referred_user_id,p_service,p_amount_pen,now(),p_receipt_key);
 return 'ACTIVATED_REAL_AND_REFERRAL_SETTLED';
end $fn$;
revoke all on function public.cc_clan_activate_with_real_wallet(uuid,text,numeric,text,text) from public,anon,authenticated;
grant execute on function public.cc_clan_activate_with_real_wallet(uuid,text,numeric,text,text) to service_role;
