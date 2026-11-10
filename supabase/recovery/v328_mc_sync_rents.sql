CREATE OR REPLACE FUNCTION public.mc_sync_rents()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();n integer;
begin
 if u is null or not exists(select 1 from public.mc_accounts where user_id=u and not suspended and subscription_until>now()) then raise exception 'MI COCHERA no esta activa';end if;
 insert into public.mc_movements(cart_id,reseller_id,stay_id,kind,label,amount_local,currency,occurred_on)
 select c.id,u,s.id,'RENT','Alquiler diario',c.daily_rate,c.currency,g::date
 from public.mc_stays s join public.mc_carts c on c.id=s.cart_id and c.reseller_id=u
 cross join lateral generate_series(s.joined_on,least(coalesce(s.left_on,(timezone('America/Lima',now()))::date),(timezone('America/Lima',now()))::date),interval '1 day') g
 where s.reseller_id=u and s.joined_on>(timezone('America/Lima',now()))::date-interval '3650 days'
 on conflict do nothing;
 get diagnostics n=row_count;return n;
end $function$
