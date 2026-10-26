-- V195: movimientos manuales independientes de la billetera CLAN CARTAN.
create table if not exists public.sb_oper_payments(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 contract_id uuid not null references public.sb_oper_contracts(id),
 amount_pen numeric(12,2) not null check(amount_pen>0),
 method text not null check(method in('YAPE','PLIN','TRANSFERENCIA','EFECTIVO','OTRO')),
 reference text not null check(length(btrim(reference)) between 3 and 120),
 recorded_at timestamptz not null default now(),
 unique(contract_id,reference)
);
alter table public.sb_oper_payments enable row level security;
revoke all on public.sb_oper_payments from public,anon,authenticated;
grant select on public.sb_oper_payments to authenticated;
drop policy if exists sb195_payment_own on public.sb_oper_payments;
create policy sb195_payment_own on public.sb_oper_payments for select to authenticated
 using (owner_id=(select auth.uid()) and public.sb_oper_has_access_v195());
create index if not exists sb_oper_payment_by_contract on public.sb_oper_payments(contract_id,recorded_at desc);

CREATE OR REPLACE FUNCTION public.sb_oper_edit_client(p_client uuid, p_name text, p_phone text, p_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();client public.sb_oper_clients%rowtype;
begin
 if u is null or not public.sb_oper_has_access_v195() then raise exception 'No autorizado' using errcode='42501';end if;
 if length(btrim(coalesce(p_name,''))) not between 1 and 100
 or (p_phone is not null and p_phone<>'' and p_phone !~ '^\+[1-9][0-9]{7,14}$')
 or length(coalesce(p_email,''))>160
 then raise exception 'Datos de contacto inválidos';end if;
 select * into client from public.sb_oper_clients where id=p_client and owner_id=u for update;
 if not found then raise exception 'Cliente inexistente';end if;
 update public.sb_oper_clients set alias=btrim(p_name),phone_e164=nullif(p_phone,''),
 email=nullif(btrim(p_email),'') where id=p_client;
 insert into public.sb_oper_events(owner_id,actor,action,payload)
 values(u,u,'CONTACT_UPDATED',jsonb_build_object('client_id',client.id));
 return true;
end $function$;
revoke all on function public.sb_oper_edit_client(uuid,text,text,text) from public,anon;
grant execute on function public.sb_oper_edit_client(uuid,text,text,text) to authenticated;

CREATE OR REPLACE FUNCTION public.sb_oper_extend_contract(p_contract uuid, p_days integer, p_price_add numeric DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();c public.sb_oper_contracts%rowtype;updated_end timestamptz;
begin
 if u is null or not public.sb_oper_has_access_v195() then raise exception 'Sin permiso' using errcode='42501';end if;
 select * into c from public.sb_oper_contracts where id=p_contract and owner_id=u for update;
 if not found then raise exception 'Contrato inexistente';end if;
 if p_days is null or p_days not between 1 and 366 or p_price_add is null or
 p_price_add<0 or p_price_add<>round(p_price_add,2)
 then raise exception 'Plazo o precio inválidos';end if;
 updated_end=greatest(c.end_at,now())+make_interval(days=>p_days);
 update public.sb_oper_contracts set end_at=updated_end,price_pen=price_pen+p_price_add,
 status='ACTIVE' where id=c.id;
 update public.sb_oper_assignments set state='ACTIVE'
 where contract_id=c.id and state='PENDING_RELEASE';
 insert into public.sb_oper_events(owner_id,contract_id,actor,action,payload)
 values(u,c.id,u,'RENEWAL',jsonb_build_object('previous_end',c.end_at,'new_end',updated_end,
 'added_price',p_price_add,'original_price',c.price_pen));
 return jsonb_build_object('end_at',updated_end,'price_pen',c.price_pen+p_price_add);
end $function$;
revoke all on function public.sb_oper_extend_contract(uuid,integer,numeric) from public,anon;
grant execute on function public.sb_oper_extend_contract(uuid,integer,numeric) to authenticated;

CREATE OR REPLACE FUNCTION public.sb_oper_manage_account(p_account uuid, p_action text, p_days integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();a public.sb_oper_accounts%rowtype;new_end timestamptz;
begin
 if u is null or not public.sb_oper_has_access_v195() then raise exception 'Sin permiso' using errcode='42501';end if;
 select * into a from public.sb_oper_accounts where id=p_account and owner_id=u for update;
 if not found then raise exception 'Cuenta inexistente';end if;
 if p_action='RENEW' then
  if p_days is null or p_days not between 1 and 366 then raise exception 'Días inválidos';end if;
  new_end=greatest(a.end_at,now())+make_interval(days=>p_days);
  update public.sb_oper_accounts set end_at=new_end,state='ACTIVE' where id=a.id;
 elsif p_action='SUSPEND' then
  update public.sb_oper_accounts set state='SUSPENDED' where id=a.id;
 elsif p_action='REACTIVATE' then
  if a.end_at<=now() then raise exception 'Renueva primero la cuenta principal';end if;
  update public.sb_oper_accounts set state='ACTIVE' where id=a.id;
 elsif p_action='END' then
  if exists(select 1 from public.sb_oper_slots s join public.sb_oper_assignments x on x.slot_id=s.id
    where s.account_id=a.id and x.state in('ACTIVE','PENDING_RELEASE'))
  then raise exception 'Retira y libera todos los accesos antes de finalizar';end if;
  update public.sb_oper_accounts set state='ENDED' where id=a.id;
 else raise exception 'Operación desconocida';end if;
 insert into public.sb_oper_events(owner_id,actor,action,payload)
 values(u,u,'ACCOUNT_'||p_action,jsonb_build_object('account',a.id,'days',p_days));
 return jsonb_build_object('done',true,'action',p_action);
end $function$;
revoke all on function public.sb_oper_manage_account(uuid,text,integer) from public,anon;
grant execute on function public.sb_oper_manage_account(uuid,text,integer) to authenticated;

CREATE OR REPLACE FUNCTION public.sb_oper_record_payment(p_contract uuid, p_amount numeric, p_method text, p_reference text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();c public.sb_oper_contracts%rowtype;out_id uuid;
begin
 if u is null or not public.sb_oper_has_access_v195() then raise exception 'Acceso no autorizado' using errcode='42501';end if;
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2)
 or p_method not in ('YAPE','PLIN','TRANSFERENCIA','EFECTIVO','OTRO')
 or length(btrim(coalesce(p_reference,''))) not between 3 and 120
 then raise exception 'Pago inválido';end if;
 select * into c from public.sb_oper_contracts where id=p_contract and owner_id=u for update;
 if not found then raise exception 'Contrato no encontrado';end if;
 if p_amount>c.price_pen-c.paid_pen then raise exception 'Importe superior al saldo';end if;
 insert into public.sb_oper_payments(owner_id,contract_id,amount_pen,method,reference)
 values(u,c.id,p_amount,p_method,btrim(p_reference)) returning id into out_id;
 update public.sb_oper_contracts set paid_pen=paid_pen+p_amount where id=c.id;
 insert into public.sb_oper_events(owner_id,contract_id,actor,action,payload)
 values(u,c.id,u,'MANUAL_PAYMENT_RECORDED',jsonb_build_object('amount',p_amount,'method',p_method,'reference',p_reference));
 return jsonb_build_object('id',out_id,'new_paid_pen',c.paid_pen+p_amount);
end $function$;
revoke all on function public.sb_oper_record_payment(uuid,numeric,text,text) from public,anon;
grant execute on function public.sb_oper_record_payment(uuid,numeric,text,text) to authenticated;

CREATE OR REPLACE FUNCTION public.sb_oper_update_contract(p_contract uuid, p_action text, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();c public.sb_oper_contracts%rowtype;
begin
 if u is null or not public.sb_oper_has_access_v195() then raise exception 'No autorizado' using errcode='42501';end if;
 select * into c from public.sb_oper_contracts where id=p_contract and owner_id=u for update;
 if not found then raise exception 'Contrato inexistente';end if;
 if p_action='SUSPEND' then
  update public.sb_oper_contracts set status='SUSPENDED' where id=c.id;
 elsif p_action='REACTIVATE' then
  update public.sb_oper_contracts set status='ACTIVE' where id=c.id;
 elsif p_action='CONNECTION' then
  update public.sb_oper_contracts set connected_at=now() where id=c.id;
 elsif p_action='DEVICES' then
  if length(coalesce(p_notes,''))>300 then raise exception 'Notas demasiado largas';end if;
  update public.sb_oper_contracts set device_notes=coalesce(p_notes,'') where id=c.id;
 else raise exception 'Acción inválida';end if;
 insert into public.sb_oper_events(owner_id,contract_id,actor,action,payload)
 values(u,c.id,u,p_action,case when p_action='DEVICES'
 then jsonb_build_object('detail','Notas de dispositivos actualizadas')
 else '{}'::jsonb end);
 return true;
end $function$;
revoke all on function public.sb_oper_update_contract(uuid,text,text) from public,anon;
grant execute on function public.sb_oper_update_contract(uuid,text,text) to authenticated;
