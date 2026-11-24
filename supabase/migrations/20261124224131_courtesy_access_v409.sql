-- Los períodos de cortesía son independientes de las activaciones y del libro financiero.
create table cc_internal.courtesy_windows_v409 (
  service text not null check (service in ('COBRA_YA','MI_COCHERA','MI_ALQUILER')),
  registered_from timestamptz not null,
  registered_before timestamptz,
  access_until timestamptz not null default 'infinity',
  primary key (service, registered_from),
  check (registered_before is null or registered_before >= registered_from)
);
create unique index courtesy_open_window_v409
  on cc_internal.courtesy_windows_v409(service) where registered_before is null;

create table cc_internal.courtesy_exceptions_v409 (
  service text not null check (service in ('COBRA_YA','MI_COCHERA','MI_ALQUILER')),
  user_id uuid not null references auth.users(id) on delete cascade,
  access_until timestamptz not null,
  primary key (service,user_id)
);
create index courtesy_exception_user_v409 on cc_internal.courtesy_exceptions_v409(user_id);

create table cc_internal.courtesy_audit_v409 (
  id bigint generated always as identity primary key,
  service text not null check (service in ('COBRA_YA','MI_COCHERA','MI_ALQUILER')),
  request_id uuid not null unique,
  action text not null,
  actor uuid not null,
  target uuid,
  requested_until timestamptz,
  effective_at timestamptz not null,
  detail jsonb not null default '{}'
);
create index courtesy_audit_bulk_v409 on cc_internal.courtesy_audit_v409(service,id desc)
  where action='end_existing';

alter table cc_internal.courtesy_windows_v409 enable row level security;
alter table cc_internal.courtesy_exceptions_v409 enable row level security;
alter table cc_internal.courtesy_audit_v409 enable row level security;
revoke all on cc_internal.courtesy_windows_v409, cc_internal.courtesy_exceptions_v409, cc_internal.courtesy_audit_v409
  from public, anon, authenticated;

insert into cc_internal.courtesy_windows_v409(service,registered_from)
select service, statement_timestamp() from unnest(array['COBRA_YA','MI_COCHERA','MI_ALQUILER']) service;

-- Una excepción individual prevalece sobre la cortesía que se obtuvo al registrarse.
create function cc_internal.courtesy_until_v409(p_user uuid,p_service text)
returns timestamptz language sql stable security definer set search_path='' as $$
  select coalesce(e.access_until,w.access_until)
  from auth.users u
  left join cc_internal.courtesy_exceptions_v409 e on e.user_id=u.id and e.service=p_service
  left join lateral (
    select x.access_until from cc_internal.courtesy_windows_v409 x
    where x.service=p_service and x.registered_from<=u.created_at
      and (x.registered_before is null or u.created_at<x.registered_before)
    order by x.registered_from desc limit 1
  ) w on true
  where u.id=p_user and not coalesce(u.is_anonymous,false)
    and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
    and case p_service
      when 'MI_COCHERA' then not exists(select 1 from public.mc_accounts a where a.user_id=u.id and a.suspended)
      when 'MI_ALQUILER' then not exists(select 1 from public.ma_accounts a where a.user_id=u.id and a.suspended)
      when 'COBRA_YA' then not exists(
        select 1 from public.cc_memberships m join public.cc_businesses b on b.id=m.business_id
        where m.user_id=u.id and b.code=p_service and m.status='SUSPENDED')
      else false end
$$;
revoke all on function cc_internal.courtesy_until_v409(uuid,text) from public,anon,authenticated;

create function public.cc409_my_courtesy(p_service text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('active',coalesce(expiry>now(),false),
    'ends_at',case when isfinite(expiry) then expiry end)
  from (select cc_internal.courtesy_until_v409(auth.uid(),p_service) expiry) q
$$;
revoke all on function public.cc409_my_courtesy(text) from public,anon;
grant execute on function public.cc409_my_courtesy(text) to authenticated;

create function public.cc409_admin_courtesy(
  p_action text default 'read', p_service text default null, p_user uuid default null,
  p_enabled boolean default null, p_until timestamptz default null, p_request uuid default null
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  changed_at timestamptz;
  new_until timestamptz;
  previous_until timestamptz;
  count_windows integer := 0;
  count_exceptions integer := 0;
  was_enabled boolean;
  result jsonb;
  previous_request cc_internal.courtesy_audit_v409%rowtype;
begin
  if actor is null or not cc_internal.is_admin() then
    raise exception 'Solo el administrador puede gestionar cortesías' using errcode='42501';
  end if;
  if p_user is not null and not exists(
     select 1 from auth.users where id=p_user and deleted_at is null and not coalesce(is_anonymous,false)
  ) then
    raise exception 'Selecciona un usuario registrado';
  end if;
  if p_action is distinct from 'read' then
    if p_service is null or p_service not in ('COBRA_YA','MI_COCHERA','MI_ALQUILER') then
      raise exception 'Ese negocio no admite cortesía';
    end if;
    if p_action is null or p_action not in ('registration','grant','revoke','end_existing') then
      raise exception 'Acción de cortesía no válida';
    end if;
    if ((p_action in ('grant','revoke')) <> (p_user is not null))
       or ((p_action='registration') <> (p_enabled is not null))
       or (p_until is not null and not isfinite(p_until)) or p_request is null then
      raise exception 'Datos de cortesía no válidos';
    end if;
    perform pg_advisory_xact_lock(hashtextextended('CC-COURTESY-V409:'||p_service,0));
    select * into previous_request from cc_internal.courtesy_audit_v409 a where a.request_id=p_request;
    if found then
      if previous_request.actor<>actor or previous_request.service<>p_service
        or previous_request.action<>p_action or previous_request.target is distinct from p_user
        or previous_request.requested_until is distinct from p_until
        or (previous_request.detail->>'enabled')::boolean is distinct from p_enabled then
        raise exception 'La referencia ya corresponde a otra operación';
      end if;
    else
      changed_at:=clock_timestamp();
      select exists(select 1 from cc_internal.courtesy_windows_v409 w where w.service=p_service and w.registered_before is null)
        into was_enabled;
      if p_action='registration' then
        if p_enabled is distinct from was_enabled then
          if p_enabled then
            insert into cc_internal.courtesy_windows_v409(service,registered_from) values(p_service,changed_at);
          else
            update cc_internal.courtesy_windows_v409 set registered_before=changed_at
              where service=p_service and registered_before is null;
          end if;
        end if;
      elsif p_action in ('grant','revoke') then
        if p_action='grant' and p_until<=changed_at then
          raise exception 'Elige una fecha futura';
        end if;
        select cc_internal.courtesy_until_v409(p_user,p_service) into previous_until;
        new_until:=case when p_action='revoke' then '-infinity'::timestamptz else coalesce(p_until,'infinity') end;
        insert into cc_internal.courtesy_exceptions_v409(service,user_id,access_until)
          values(p_service,p_user,new_until)
          on conflict(service,user_id) do update set access_until=excluded.access_until;
      else
        if p_until is not null and p_until<=changed_at then raise exception 'Elige una fecha futura'; end if;
        new_until:=coalesce(p_until,changed_at);
        -- Separar las altas ya registradas de las futuras sin apagar la política de altas.
        if was_enabled then
          update cc_internal.courtesy_windows_v409 set registered_before=changed_at
            where service=p_service and registered_before is null;
          insert into cc_internal.courtesy_windows_v409(service,registered_from) values(p_service,changed_at);
        end if;
        update cc_internal.courtesy_windows_v409 set access_until=new_until
          where service=p_service and registered_before is not null and access_until>new_until;
        get diagnostics count_windows=row_count;
        update cc_internal.courtesy_exceptions_v409 set access_until=new_until
          where service=p_service and access_until>new_until;
        get diagnostics count_exceptions=row_count;
      end if;
      insert into cc_internal.courtesy_audit_v409(request_id,service,action,actor,target,requested_until,effective_at,detail)
        values(p_request,p_service,p_action,actor,p_user,p_until,changed_at,
          jsonb_build_object('enabled_before',was_enabled,'enabled',p_enabled,
           'windows',count_windows,'exceptions',count_exceptions,'previous_until',previous_until,'new_until',new_until));
    end if;
  end if;
  select jsonb_agg(jsonb_build_object(
    'service',s.service,
    'registration_enabled',exists(select 1 from cc_internal.courtesy_windows_v409 w where w.service=s.service and w.registered_before is null),
    'active',coalesce(x.expiry>now(),false),
    'ends_at',case when isfinite(x.expiry) then x.expiry end,
    'last_bulk_end',case when p_user is null then (
      select a.detail->>'new_until' from cc_internal.courtesy_audit_v409 a
      where a.service=s.service and a.action='end_existing' order by a.id desc limit 1
    ) end
  ) order by s.ord) into result
  from unnest(array['COBRA_YA','MI_COCHERA','MI_ALQUILER']) with ordinality as s(service,ord)
  cross join lateral (select cc_internal.courtesy_until_v409(p_user,s.service) expiry) x;
  return result;
end;
$$;
revoke all on function public.cc409_admin_courtesy(text,text,uuid,boolean,timestamptz,uuid) from public,anon;
grant execute on function public.cc409_admin_courtesy(text,text,uuid,boolean,timestamptz,uuid) to authenticated;

-- La API de operaciones conserva la identidad del propietario y sus guardas existentes.
create or replace function cc_internal.can_manage_cy(p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select p_user=auth.uid() and (
    cc_internal.is_admin() or cc_internal.cobra_entitled(p_user)
    or coalesce(cc_internal.courtesy_until_v409(p_user,'COBRA_YA')>now(),false)
  )
$$;

create or replace function public.ma_can_use()
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (
    exists(select 1 from public.cc_admins x where x.user_id=auth.uid())
    or exists(select 1 from public.ma_accounts a where a.user_id=auth.uid() and not a.suspended and a.subscription_until>now())
    or coalesce(cc_internal.courtesy_until_v409(auth.uid(),'MI_ALQUILER')>now(),false)
  )
$$;

-- Añadir la cortesía a la proyección del portal. La fuente pagada conserva precedencia.
create function cc_internal.business_access_with_courtesy_v409(p_user uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_agg(case when x.row->>'status' not in ('ACTIVE','SUSPENDED') and c.expiry>now()
    then x.row || jsonb_build_object('status','ACTIVE','funding','COURTESY',
      'active_until',case when isfinite(c.expiry) then c.expiry end)
    else x.row end order by x.ord)
  from jsonb_array_elements(cc_internal.cc_business_access_v316(p_user)) with ordinality x(row,ord)
  cross join lateral (select cc_internal.courtesy_until_v409(p_user,x.row->>'service') expiry) c
$$;
revoke all on function cc_internal.business_access_with_courtesy_v409(uuid) from public,anon,authenticated;

-- Parches acotados. Un cambio inesperado en las guardas hace fallar toda la migración.
do $patch$
declare
  target regprocedure;
  sql text;
  old_guard text;
  new_guard text;
begin
  for target,old_guard,new_guard in
    select * from (values
      ('public.cc_portal_my_business_access_v316()'::regprocedure,
        'cc_internal.cc_business_access_v316(actor)','cc_internal.business_access_with_courtesy_v409(actor)'),
      ('public.cc_portal_admin_accounts_v2()'::regprocedure,
        'cc_internal.cc_business_access_v316(u.id)','cc_internal.business_access_with_courtesy_v409(u.id)'),
      ('public.cc394_admin_directory(text,integer)'::regprocedure,
        'cc_internal.cc_business_access_v316(u.id)','cc_internal.business_access_with_courtesy_v409(u.id)'),
      ('public.ma_ensure_account()'::regprocedure,
        'admin_role OR (NOT a.suspended AND a.subscription_until>now())','public.ma_can_use()'),
      ('public.cy371_access()'::regprocedure,
        '''expires_at'',s.expires_at','''expires_at'',case when cc_internal.courtesy_until_v409(u,''COBRA_YA'')=''infinity'' then null else greatest(s.expires_at,cc_internal.courtesy_until_v409(u,''COBRA_YA'')) end'),
      ('public.mc_create_cart(text,text,numeric,text,text,text,text,text,text,text,text)'::regprocedure,
        'a.subscription_until<=now() or a.subscription_until is null',
        'not (coalesce(a.subscription_until>now(),false) or coalesce(cc_internal.courtesy_until_v409(u,''MI_COCHERA'')>now(),false))'),
      ('public.mc_list_corrections(bigint)'::regprocedure,
        'a.subscription_until>now()','(a.subscription_until>now() or coalesce(cc_internal.courtesy_until_v409(auth.uid(),''MI_COCHERA'')>now(),false))')
    ) as changes(target,old_guard,new_guard)
  loop
    sql:=pg_get_functiondef(target);
    if (length(sql)-length(replace(sql,old_guard,'')))<>length(old_guard) then
      raise exception 'La guarda de % cambió',target;
    end if;
    execute replace(sql,old_guard,new_guard);
  end loop;
  foreach target in array array[
    'public.mc373_workspace(text,text,boolean,integer,integer,bigint)'::regprocedure,
    'public.mc384_historical(bigint,date,date,date,numeric,text)'::regprocedure,
    'public.mc_change_cart_state(bigint,text)'::regprocedure,
    'public.mc_record_movement(bigint,text,text,numeric,numeric,numeric,text)'::regprocedure,
    'public.mc_record_payment_once(bigint,numeric,text,uuid)'::regprocedure,
    'public.mc_retire_cart_retroactive(bigint,date,text)'::regprocedure,
    'public.mc_reverse_movement(uuid,text)'::regprocedure,
    'public.mc_sync_rents()'::regprocedure
  ] loop
    sql:=pg_get_functiondef(target);
    old_guard:='user_id=u and not suspended and subscription_until>now()';
    if (length(sql)-length(replace(sql,old_guard,'')))<>length(old_guard) then
      raise exception 'La guarda de % cambió',target;
    end if;
    -- Este RPC conserva SECURITY INVOKER; su evaluación se limita a auth.uid().
    if target='public.mc373_workspace(text,text,boolean,integer,integer,bigint)'::regprocedure then
      new_guard:='user_id=u and not suspended and (subscription_until>now() or (public.cc409_my_courtesy(''MI_COCHERA'')->>''active'')::boolean)';
    else
      new_guard:='user_id=u and not suspended and (subscription_until>now() or coalesce(cc_internal.courtesy_until_v409(u,''MI_COCHERA'')>now(),false))';
    end if;
    execute replace(sql,old_guard,new_guard);
  end loop;
end;
$patch$;

do $policies$
declare t text;
begin
  foreach t in array array['mc_people','mc_carts','mc_stays','mc_movements'] loop
    execute format($sql$
      alter policy %I on public.%I using (
        exists(select 1 from public.cc_admins a where a.user_id=(select auth.uid()))
        or (reseller_id=(select auth.uid()) and exists(
          select 1 from public.mc_accounts a where a.user_id=%I.reseller_id and not a.suspended
          and (a.subscription_until>now() or (select (public.cc409_my_courtesy('MI_COCHERA')->>'active')::boolean))
        ))
      )
    $sql$,t||'_read',t,t);
  end loop;
end;
$policies$;
