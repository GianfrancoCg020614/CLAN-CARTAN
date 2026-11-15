CREATE OR REPLACE FUNCTION public.cc_recharge_mail_service(p_action text, p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare actor uuid;mail cc_internal.recharge_mail_connections%rowtype;st cc_internal.recharge_mail_oauth_states%rowtype;sid uuid;old_sid uuid;tokens jsonb;eventid uuid;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Solo servicio' using errcode='42501';end if;
 actor:=nullif(p_data->>'actor_id','')::uuid;
 if p_action='oauth_claim' then
  delete from cc_internal.recharge_mail_oauth_states where state_hash=p_data->>'state_hash' and provider=p_data->>'provider' returning * into st;
  if not found then raise exception 'Autorización inválida o utilizada';end if;
  select to_jsonb(decrypted_secret) into tokens from vault.decrypted_secrets where id=st.verifier_secret_id;
  delete from vault.secrets where id=st.verifier_secret_id;
  if st.expires_at<=now() or not exists(select 1 from public.cc_admins where user_id=st.owner_id) then return jsonb_build_object('expired',true);end if;
  return jsonb_build_object('actor_id',st.owner_id,'verifier',tokens);
 end if;
 if p_action in('mail_for_disconnect','mail_disconnect') then
  select * into mail from cc_internal.recharge_mail_connections where id=(p_data->>'connection_id')::uuid and owner_id=actor for update;
  if not found then raise exception 'Buzón no autorizado' using errcode='42501';end if;
  if p_action='mail_for_disconnect' then select decrypted_secret::jsonb into tokens from vault.decrypted_secrets where id=mail.token_secret_id;return jsonb_build_object('provider',mail.provider,'tokens',tokens);end if;
  update cc_internal.recharge_mail_connections set status='DISCONNECTED',token_secret_id=null,updated_at=now() where id=mail.id;
  if mail.token_secret_id is not null then delete from vault.secrets where id=mail.token_secret_id;end if;return jsonb_build_object('saved',true);
 end if;
 if actor is null or not exists(select 1 from public.cc_admins where user_id=actor) then raise exception 'Solo ADMIN' using errcode='42501';end if;
 if p_action='oauth_start' then
  if p_data->>'provider' not in('google','microsoft') or length(coalesce(p_data->>'state_hash',''))<>64 then raise exception 'Proveedor o estado inválido';end if;
  if (select count(*) from cc_internal.recharge_mail_oauth_states where owner_id=actor and created_at>now()-interval '10 minutes')>=10 then raise exception 'Demasiados intentos de conexión';end if;
  for sid in delete from cc_internal.recharge_mail_oauth_states where expires_at<now() returning verifier_secret_id loop delete from vault.secrets where id=sid;end loop;
  sid:=vault.create_secret(p_data->>'verifier');
  insert into cc_internal.recharge_mail_oauth_states(state_hash,owner_id,provider,verifier_secret_id,expires_at) values(p_data->>'state_hash',actor,p_data->>'provider',sid,now()+interval '10 minutes');return jsonb_build_object('saved',true);
 elsif p_action='oauth_save' then
  if p_data->>'provider' not in('google','microsoft') or coalesce(p_data->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(coalesce(p_data->>'subject','')) not between 1 and 320 then raise exception 'Perfil de correo inválido';end if;
  sid:=vault.create_secret((p_data->'tokens')::text);
  select token_secret_id into old_sid from cc_internal.recharge_mail_connections where owner_id=actor and provider=p_data->>'provider' and provider_subject=p_data->>'subject' for update;
  insert into cc_internal.recharge_mail_connections(owner_id,provider,provider_subject,email_address,status,token_secret_id) values(actor,p_data->>'provider',p_data->>'subject',p_data->>'email','CONNECTED',sid)
  on conflict(owner_id,provider,provider_subject) do update set email_address=excluded.email_address,status='CONNECTED',token_secret_id=excluded.token_secret_id,updated_at=now();
  if old_sid is not null then delete from vault.secrets where id=old_sid;end if;return jsonb_build_object('saved',true);
 end if;
 select * into mail from cc_internal.recharge_mail_connections where id=(p_data->>'connection_id')::uuid and owner_id=actor for update;
 if not found or mail.status<>'CONNECTED' or mail.token_secret_id is null then return jsonb_build_object('status','MAIL_DISCONNECTED');end if;
 if p_action='mail_scan_context' then
  if mail.scan_cursor is null then update cc_internal.recharge_mail_connections set scan_started_at=now(),scan_after=greatest(coalesce(last_scan_at-interval '5 minutes',now()-interval '1 day'),now()-interval '7 days') where id=mail.id returning * into mail;end if;
  select decrypted_secret::jsonb into tokens from vault.decrypted_secrets where id=mail.token_secret_id;
  return jsonb_build_object('status','READY','connection_id',mail.id,'provider',mail.provider,'tokens',tokens,'cursor',mail.scan_cursor,'after',mail.scan_after,
   'allowed_senders',coalesce((select to_jsonb(allowed_senders) from cc_internal.recharge_mail_settings where admin_id=actor),'[]'));
 elsif p_action='mail_tokens' then
  perform vault.update_secret(mail.token_secret_id,(p_data->'tokens')::text);return jsonb_build_object('saved',true);
 elsif p_action='mail_reauth' then
  update cc_internal.recharge_mail_connections set status='REAUTH_REQUIRED',updated_at=now() where id=mail.id;return jsonb_build_object('saved',true);
 elsif p_action='mail_notice' then
  if length(coalesce(p_data->>'message_id','')) not between 1 and 500 then raise exception 'Mensaje inválido';end if;
  insert into cc_internal.recharge_mail_events(connection_id,message_id,provider_hint,sender,subject,sender_authenticated,amount_hint,currency_hint,transaction_hint,rec_hint,payer_name_hint,received_at)
  values(mail.id,p_data->>'message_id',left(p_data->>'provider_hint',30),left(p_data->>'sender',320),left(p_data->>'subject',180),coalesce((p_data->>'sender_authenticated')::boolean,false),nullif(p_data->>'amount_hint','')::numeric,left(p_data->>'currency_hint',10),left(p_data->>'transaction_hint',128),left(p_data->>'rec_hint',30),left(nullif(btrim(p_data->>'payer_name_hint'),''),120),least(now(),(p_data->>'received_at')::timestamptz))
  on conflict(connection_id,message_id) do update set amount_hint=coalesce(cc_internal.recharge_mail_events.amount_hint,excluded.amount_hint),currency_hint=coalesce(cc_internal.recharge_mail_events.currency_hint,excluded.currency_hint),transaction_hint=coalesce(cc_internal.recharge_mail_events.transaction_hint,excluded.transaction_hint),payer_name_hint=coalesce(cc_internal.recharge_mail_events.payer_name_hint,excluded.payer_name_hint) where cc_internal.recharge_mail_events.status='UNIDENTIFIED' and cc_internal.recharge_mail_events.linked_rec_id is null and excluded.sender_authenticated=true and cc_internal.recharge_mail_events.sender_authenticated=true returning id into eventid;
  if eventid is not null then
   begin
    perform cc_internal.reconcile_lemon_notice(eventid);
   exception when others then
    update cc_internal.recharge_mail_events set note=left('Conciliación requiere revisión: '||sqlstate,300) where id=eventid;
   end;
  end if;
  return jsonb_build_object('recorded',eventid is not null);
 elsif p_action='mail_scan_done' then
  update cc_internal.recharge_mail_connections set scan_cursor=left(nullif(p_data->>'cursor',''),4096),last_scan_at=case when nullif(p_data->>'cursor','') is null then scan_started_at else last_scan_at end where id=mail.id;
  return jsonb_build_object('saved',true);
 end if;
 raise exception 'Acción de correo inválida';end;$function$

