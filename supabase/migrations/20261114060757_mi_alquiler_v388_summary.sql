-- Read-only complete financial summaries; no existing financial function is replaced.
create function public.ma388_summary() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare u uuid:=auth.uid();r jsonb;d date:=(now() at time zone 'America/Lima')::date;
begin
 if u is null or not public.ma_can_use() then raise exception using errcode='42501',message='Activa o renueva MI ALQUILER para continuar.';end if;
 with balances as (
 select l.id,l.currency,coalesce(sum(m.amount_pen),0) balance,
 coalesce(sum(m.amount_pen) filter(where m.due_on<=d or m.kind='PAYMENT'),0) due,
 count(m.id) movement_count
 from public.ma_leases l left join public.ma_ledger m on m.lease_id=l.id and m.reseller_id=u
 where l.reseller_id=u group by l.id,l.currency
 ), held as(select lease_id,sum(case when action='RECEIVED' then amount_pen else -amount_pen end) amount from public.ma_guarantee_events where reseller_id=u group by lease_id),
 currencies as(select currency from balances union select currency from public.ma_expenses where reseller_id=u union select currency from public.ma_guarantee_events where reseller_id=u),
 grouped as(select c.currency,
 coalesce((select sum(greatest(0,b.balance)) from balances b where b.currency=c.currency),0)::text debt,
 coalesce((select -sum(amount_pen) from public.ma_ledger where reseller_id=u and currency=c.currency and kind='PAYMENT'),0)::text collected,
 coalesce((select sum(amount_pen) from public.ma_expenses where reseller_id=u and currency=c.currency),0)::text expenses,
 coalesce((select sum(case when action='RECEIVED' then amount_pen else -amount_pen end) from public.ma_guarantee_events where reseller_id=u and currency=c.currency),0)::text held
 from currencies c)
 select jsonb_build_object('summary',coalesce((select jsonb_agg(to_jsonb(grouped) order by currency) from grouped),'[]'::jsonb),
 'leases',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'currency',b.currency,'balance',b.balance::text,'due',b.due::text,'held',coalesce(h.amount,0)::text,'movement_count',b.movement_count)) from balances b left join held h on h.lease_id=b.id),'[]'::jsonb),'local_date',d) into r;
 return r;
end $$;
revoke all on function public.ma388_summary() from public,anon;
grant execute on function public.ma388_summary() to authenticated;
notify pgrst,'reload schema';
