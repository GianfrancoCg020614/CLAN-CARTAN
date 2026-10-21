-- La primera migración ya aplicada en Supabase creaba una FK a ma_accounts.
-- ADMIN puede tener contratos propios sin fila ma_accounts. Se preserva la auditoría del usuario.
alter table public.ma_whatsapp_notice_events drop constraint if exists ma_whatsapp_notice_events_reseller_id_fkey;
alter table public.ma_whatsapp_notice_events add constraint ma_whatsapp_notice_events_reseller_id_fkey foreign key(reseller_id) references auth.users(id);
