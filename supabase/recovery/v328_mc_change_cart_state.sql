CREATE OR REPLACE FUNCTION public.mc_change_cart_state(p_cart bigint, p_new_state text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); old_state text;today_pe date:=(timezone('America/Lima',now()))::date;
begin
 if u is null or not exists(select 1 from public.mc_accounts where user_id=u and not suspended and subscription_until>now()) then raise exception 'MI COCHERA no esta activa';end if;
 if p_new_state not in ('ACTIVE','RETIRED') then raise exception 'Estado invalido';end if;
 select state into old_state from public.mc_carts where id=p_cart and reseller_id=u for update;
 if old_state is null then raise exception 'Carrito inexistente';end if;
 if old_state=p_new_state then return;end if;
 if p_new_state='RETIRED' then
  perform public.mc_sync_rents();
  update public.mc_stays set left_on=today_pe where cart_id=p_cart and reseller_id=u and left_on is null;
 else
  insert into public.mc_stays(cart_id,reseller_id,joined_on) values(p_cart,u,today_pe);
 end if;
 update public.mc_carts set state=p_new_state where id=p_cart and reseller_id=u;
end $function$
