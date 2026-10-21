-- MI ALQUILER V162: auditoría idempotente por contrato y teléfono
create or replace function public.ma_log_notice(p_lease uuid,p_due_on date,p_phone text,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $fn$
declare u uuid:=public.ma_guard(); r record; p public.ma_whatsapp_notice_events%rowtype; v uuid;
begin
 if p_request is null or p_due_on is null or p_phone is null then raise exception 'Datos incompletos'; end if;
 select l.id as lease_id,l.tenant_id,l.next_due_on,l.state,t.whatsapp,t.consent_whatsapp
 into r from public.ma_leases l join public.ma_tenants t on t.id=l.tenant_id and t.reseller_id=l.reseller_id
 where l.id=p_lease and l.reseller_id=u;
 if r.lease_id is null or r.state<>'ACTIVE' then raise exception 'Contrato no autorizado o cerrado'; end if;
 if not coalesce(r.consent_whatsapp,false) then raise exception 'Avisos no autorizados'; end if;
 if r.whatsapp is null or regexp_replace(r.whatsapp,'[^0-9]','','g')<>regexp_replace(p_phone,'[^0-9]','','g')
 then raise exception 'WhatsApp modificado'; end if;
 if r.next_due_on<>p_due_on then raise exception 'Vencimiento actualizado'; end if;
 select * into p from public.ma_whatsapp_notice_events where request_id=p_request;
 if p.id is not null then
  if p.reseller_id<>u or p.lease_id<>p_lease or p.tenant_id<>r.tenant_id or p.due_on<>p_due_on
   or regexp_replace(p.phone_snapshot,'[^0-9]','','g')<>regexp_replace(r.whatsapp,'[^0-9]','','g')
   then raise exception 'Referencia reutilizada para otro aviso'; end if;
  return p.id;
 end if;
 insert into public.ma_whatsapp_notice_events(request_id,reseller_id,lease_id,tenant_id,phone_snapshot,due_on,event_type)
 values(p_request,u,r.lease_id,r.tenant_id,r.whatsapp,r.next_due_on,'OPENED') returning id into v;
 return v;
end $fn$;
revoke all on function public.ma_log_notice(uuid,date,text,uuid) from public,anon,authenticated;
grant execute on function public.ma_log_notice(uuid,date,text,uuid) to authenticated;
comment on function public.ma_log_notice(uuid,date,text,uuid) is 'Apertura de enlace; no acredita envio/recepcion de WhatsApp';