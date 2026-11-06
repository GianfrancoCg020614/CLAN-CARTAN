CREATE OR REPLACE FUNCTION public.mc_record_movement(p_cart bigint, p_kind text, p_label text, p_quantity numeric, p_unit numeric, p_amount numeric, p_method text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();c public.mc_carts%rowtype;mid uuid; debt numeric;
begin
 if u is null or not exists(select 1 from public.mc_accounts where user_id=u and not suspended and subscription_until>now()) then raise exception 'MI COCHERA no esta activa';end if;
 select * into c from public.mc_carts where id=p_cart and reseller_id=u for update;
 if c.id is null then raise exception 'Carrito inexistente';end if;
 if p_kind='PRODUCT' then
  if c.state<>'ACTIVE' or p_quantity is null or p_quantity<=0 or p_unit is null or p_unit<=0 or p_amount<>round(p_quantity*p_unit,2) or p_amount>100000 then raise exception 'Venta incorrecta';end if;
 elsif p_kind='PAYMENT' then
  if p_amount is null or p_amount>=0 or p_amount<>round(p_amount,2) then raise exception 'Pago incorrecto';end if;
  perform public.mc_sync_rents();
  select coalesce(sum(amount_local),0) into debt from public.mc_movements where cart_id=p_cart and reseller_id=u;
  if -p_amount>debt then raise exception 'El pago supera la deuda';end if;
 else raise exception 'Movimiento no admitido';end if;
 insert into public.mc_movements(cart_id,reseller_id,kind,label,quantity,unit_price,amount_local,currency,payment_method)
 values(p_cart,u,p_kind,left(trim(p_label),120),p_quantity,p_unit,p_amount,c.currency,case when p_kind='PAYMENT' then left(coalesce(p_method,''),40) else null end) returning id into mid;
 return mid;
end $function$
