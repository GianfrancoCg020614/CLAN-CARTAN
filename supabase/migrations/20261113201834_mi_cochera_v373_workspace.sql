-- MI COCHERA V373: read-only paginated presentation; existing financial RPCs unchanged.
create function public.mc373_workspace(p_query text default '',p_state text default 'ALL',p_due boolean default false,
 p_limit integer default 20,p_offset integer default 0,p_cart bigint default null) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare u uuid:=auth.uid();d date:=(current_timestamp at time zone 'America/Lima')::date;
 q text:=trim(regexp_replace(lower(translate(left(coalesce(p_query,''),120),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')),'[^a-z0-9]+',' ','g'));r jsonb;
begin
 if u is null or not exists(select 1 from public.mc_accounts where user_id=u and not suspended and subscription_until>now()) then
  raise exception using errcode='42501',message='Activa o renueva MI COCHERA para continuar.';
 end if;
 if p_state is null or p_state not in ('ALL','ACTIVE','RETIRED') then raise exception 'Estado inválido';end if;
 with totals as materialized(
  select m.cart_id,sum(m.amount_local) balance_local,
   coalesce(sum(m.amount_local) filter(where m.kind='RENT'),0) rent_total,
   coalesce(sum(m.amount_local) filter(where m.kind='PRODUCT'),0) product_total,
   coalesce(sum(m.amount_local) filter(where m.kind='RENT' and m.occurred_on=d),0) rent_today,
   coalesce(sum(m.amount_local) filter(where m.kind='PRODUCT' and m.occurred_on=d),0) product_today,
   coalesce(-sum(m.amount_local) filter(where m.kind='PAYMENT' and m.occurred_on=d),0) paid_today
  from public.mc_movements m where m.reseller_id=u group by m.cart_id
 ), base as materialized(
  select c.*,coalesce(t.balance_local,0)::text balance_local,coalesce(t.rent_total,0)::text rent_total,
   coalesce(t.product_total,0)::text product_total,coalesce(t.rent_today,0) rent_today,
   coalesce(t.product_today,0) product_today,coalesce(t.paid_today,0) paid_today,
   jsonb_build_object('id',o.id,'full_name',o.full_name,'document_number',o.document_number,'phone',o.phone) owner,
   jsonb_build_object('id',w.id,'full_name',w.full_name,'document_number',w.document_number,'phone',w.phone) worker,
   lower(translate(concat_ws(' ',c.alias,c.business_type,o.full_name,o.document_number,o.phone,regexp_replace(coalesce(o.phone,''),'[^0-9]','','g'),w.full_name,w.document_number,w.phone,regexp_replace(coalesce(w.phone,''),'[^0-9]','','g'),c.id,'c '||lpad(c.id::text,3,'0'),'c'||lpad(c.id::text,3,'0')),'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNaeiouun')) search_text
  from public.mc_carts c left join totals t on t.cart_id=c.id
  left join public.mc_people o on o.id=c.owner_person_id and o.reseller_id=u
  left join public.mc_people w on w.id=c.worker_person_id and w.reseller_id=u where c.reseller_id=u
 ), filtered as materialized(
  select * from base where (p_state='ALL' or state=p_state) and (not coalesce(p_due,false) or balance_local::numeric>0)
   and not exists(select 1 from unnest(regexp_split_to_array(q,' ')) token where position(token in search_text)=0)
 ), page as(select * from filtered order by id limit least(greatest(coalesce(p_limit,20),1),50) offset least(greatest(coalesce(p_offset,0),0),1000000)),
 selected as(select * from base where id=coalesce((select id from base where id=p_cart),(select id from page order by id limit 1))),
 groups as(select currency,count(*) carts,count(*) filter(where state='ACTIVE') active,
  sum(greatest(0,balance_local::numeric))::text debt,sum(rent_today)::text rent_today,
  sum(product_today)::text product_today,sum(paid_today)::text paid_today from base group by currency)
 select jsonb_build_object('total',(select count(*) from filtered),'cart_count',(select count(*) from base),
 'rows',coalesce((select jsonb_agg(to_jsonb(page)-'search_text' order by id) from page),'[]'::jsonb),
 'selected',(select to_jsonb(selected)-'search_text' from selected),
 'summary',coalesce((select jsonb_agg(to_jsonb(groups) order by currency) from groups),'[]'::jsonb),
 'local_date',d,'timezone','America/Lima') into r;
 return r;
end $$;
revoke all on function public.mc373_workspace(text,text,boolean,integer,integer,bigint) from public,anon;
grant execute on function public.mc373_workspace(text,text,boolean,integer,integer,bigint) to authenticated;
notify pgrst,'reload schema';
