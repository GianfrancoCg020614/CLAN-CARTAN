-- Consulta completa; no modifica pagos, alquileres ni billeteras.
create or replace function public.mc_my_cart_balances_v328()
returns jsonb language sql stable security invoker set search_path='' as $$
 with totals as (
  select m.cart_id,sum(m.amount_local) as balance_local
  from public.mc_movements m where m.reseller_id=(select auth.uid())
  group by m.cart_id
 )
 select coalesce(jsonb_agg(jsonb_build_object('cart_id',c.id,
  'balance_local',coalesce(t.balance_local,0)) order by c.id),'[]'::jsonb)
 from public.mc_carts c left join totals t on t.cart_id=c.id
 where c.reseller_id=(select auth.uid());
$$;
revoke all on function public.mc_my_cart_balances_v328() from public,anon,authenticated;
grant execute on function public.mc_my_cart_balances_v328() to authenticated;
