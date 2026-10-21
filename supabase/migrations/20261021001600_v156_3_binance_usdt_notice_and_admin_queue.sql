-- V156.3 · Registrar pagos personales Binance en USDT y mostrar estimación PEN.
alter table public.cc_manual_payment_notifications
 add column if not exists received_usdt numeric(18,8),
 add column if not exists quote_id bigint references public.cc_usdt_pen_reference_rates(id),
 add column if not exists quote_rate_pen_per_usdt numeric(18,6);
alter table public.cc_manual_payment_notifications
 drop constraint if exists cc_binance_notification_currency_checked;
alter table public.cc_manual_payment_notifications
 add constraint cc_binance_notification_currency_checked
 check ((method<>'BINANCE') or (received_usdt is not null and received_usdt>0 and quote_id is not null and quote_rate_pen_per_usdt>0));

create or replace function public.cc_notify_binance_personal_usdt(
 p_service text, p_received_usdt numeric,p_operation text)
returns table(request_id uuid, estimated_pen numeric, net_rate_pen_per_usdt numeric, rate_source text)
language plpgsql security definer set search_path=''
as $fn$
declare v_user uuid:=auth.uid();v_id uuid;v_usdt numeric;v_pen numeric;v_op text:=upper(btrim(coalesce(p_operation,'')));
 q public.cc_usdt_pen_reference_rates%rowtype;
begin
 if v_user is null then raise exception 'Inicia sesión';end if;
 if not coalesce((select commercial_authorized from public.cc_binance_personal_policy where id=true),false)
 then raise exception 'Binance personal todavía no está autorizado para cobros comerciales';end if;
 if p_service not in ('COBRA_YA','STREAM_BULLS') then raise exception 'Servicio inválido';end if;
 if p_received_usdt is null or p_received_usdt<=0 or p_received_usdt>1000
 or p_received_usdt<>round(p_received_usdt,8) then raise exception 'Importe USDT inválido';end if;
 if length(v_op) not between 8 and 120 or v_op~'[<>]' then raise exception 'Referencia de Binance inválida';end if;
 select * into q from public.cc_usdt_pen_reference_rates
 where valid_until>now()+interval '10 seconds'
 and observed_at>now()-interval '2 minutes'
 and observed_at<=now()+interval '15 seconds'
 order by observed_at desc,id desc limit 1;
 if not found or p_received_usdt>q.available_usdt then raise exception 'No hay cotización de mercado vigente para ese volumen';end if;
 v_usdt:=p_received_usdt;v_pen:=trunc(v_usdt*q.rate_pen_per_usdt,2);
 if v_pen<1 or v_pen>1000 then raise exception 'Saldo referencial PEN fuera de rango';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('BINANCE:NOTIFY:'||v_user::text,0));
 if (select count(*) from public.cc_manual_payment_notifications
  where user_id=v_user and created_at>now()-interval '24 hours')>=6
 then raise exception 'Máximo seis notificaciones por 24 horas';end if;
 insert into public.cc_manual_payment_notifications
 (user_id,service,method,amount_pen,operation_number,received_usdt,quote_id,quote_rate_pen_per_usdt)
 values (v_user,p_service,'BINANCE',v_pen,v_op,v_usdt,q.id,q.rate_pen_per_usdt)
 returning id into v_id;
 return query select v_id,v_pen,q.rate_pen_per_usdt,q.source;
exception when unique_violation then
 raise exception 'Esta operación Binance ya fue declarada';
end $fn$;
revoke all on function public.cc_notify_binance_personal_usdt(text,numeric,text) from public,anon;
grant execute on function public.cc_notify_binance_personal_usdt(text,numeric,text) to authenticated;

-- Impide seguir anotando Binance como si los USDT fueran PEN mediante el RPC heredado.
do $migration$
declare fn text;
begin
 select pg_get_functiondef(p.oid) into fn from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='cc_notify_manual_payment'
 and pg_get_function_identity_arguments(p.oid)='p_service text, p_method text, p_amount numeric, p_operation text';
 if fn is null then raise exception 'No existe la función de avisos anterior';end if;
 if position('''YAPE'',''PLIN'',''TRANSFERENCIA'',''BINANCE''' in fn)>0 then
 execute replace(fn,'''YAPE'',''PLIN'',''TRANSFERENCIA'',''BINANCE''','''YAPE'',''PLIN'',''TRANSFERENCIA''');
 else raise exception 'Revisar validación de avisos anterior';end if;
end $migration$;

create or replace function public.cc_admin_manual_notification_queue_v156(p_limit integer default 40)
returns table(
 request_id uuid,recipient_id uuid,recipient_email text,
 service text,method text,amount_pen numeric,operation_number text,
 status text,created_at timestamptz,
 received_usdt numeric,net_rate_pen_per_usdt numeric,rate_source text)
language plpgsql security definer set search_path=''
as $fn$
begin
 if auth.uid() is null or not exists(select 1 from public.cc_admins where user_id=auth.uid())
 then raise exception 'Solo ADMIN';end if;
 return query
 select n.id,n.user_id,u.email::text,n.service,n.method,n.amount_pen,
 n.operation_number,n.status,n.created_at,n.received_usdt,n.quote_rate_pen_per_usdt,
 q.source
 from public.cc_manual_payment_notifications n
 join auth.users u on u.id=n.user_id
 left join public.cc_usdt_pen_reference_rates q on q.id=n.quote_id
 order by n.created_at desc,n.id desc
 limit least(greatest(coalesce(p_limit,40),1),100);
end $fn$;
revoke all on function public.cc_admin_manual_notification_queue_v156(integer) from public,anon;
grant execute on function public.cc_admin_manual_notification_queue_v156(integer) to authenticated;

-- Conciliar avisos Binance por USDT realmente recibidos, no por importe PEN estimado.
create or replace function public.cc_mark_personal_manual_request_verified()
returns trigger
language plpgsql security definer set search_path=''
as $fn$
begin
 update public.cc_manual_payment_notifications n
 set status='VERIFIED'
 where n.user_id=new.recipient_id and n.service=new.service
 and n.status='PENDING'
 and upper(btrim(n.operation_number))=upper(btrim(new.provider_transaction_id))
 and (
   (new.provider='BINANCE_PERSONAL' and n.method='BINANCE'
       and n.received_usdt=new.received_amount)
   or
   (new.provider='LEMON_DALE_PERSONAL' and n.method in ('YAPE','PLIN','TRANSFERENCIA')
       and n.amount_pen=new.credited_pen)
 );
 return new;
end $fn$;
