-- V159 · Los tres códigos se muestran juntos a cada cuenta autenticada.
-- Asignación perezosa, una sola vez, consecutiva por secuencia COCHERA;
-- sin otorgar suscripción, bonos, permisos o dinero.
CREATE OR REPLACE FUNCTION public.cc_my_invitation_codes()
RETURNS TABLE(code text,business text,affiliate_role text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $$
DECLARE u uuid:=auth.uid();
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Inicia sesión'; END IF;
 INSERT INTO public.mc_accounts(user_id) VALUES(u)
 ON CONFLICT (user_id) DO NOTHING;
 RETURN QUERY
 SELECT rows.code,rows.business,rows.affiliate_role
 FROM (
   SELECT c.code::text AS code,
     (CASE b.code WHEN 'COBRA_YA' THEN 'COBRA YA'
                  WHEN 'STREAM_BULLS' THEN 'STREAM BULL''S'
                  ELSE b.code END)::text AS business,
     coalesce(m.role,'USUARIO')::text AS affiliate_role,
     1 AS sort_priority, c.created_at AS created
   FROM public.cc_invitation_codes c
   JOIN public.cc_businesses b ON b.id=c.business_id
   LEFT JOIN LATERAL (
     SELECT mem.role FROM public.cc_memberships mem
     WHERE mem.user_id=c.owner_user_id AND mem.business_id=c.business_id
       AND mem.status='ACTIVE'
     ORDER BY mem.created_at DESC LIMIT 1
   ) m ON TRUE
   WHERE c.owner_user_id=u
   UNION ALL
   SELECT a.invite_code::text, 'MI COCHERA'::text,
          (CASE WHEN EXISTS(SELECT 1 FROM public.cc_admins adm WHERE adm.user_id=u)
                THEN 'ADMIN' ELSE 'RESELLER' END)::text,
          2 AS sort_priority,a.created_at
   FROM public.mc_accounts a WHERE a.user_id=u
 ) rows ORDER BY rows.sort_priority,rows.created;
END $$;
REVOKE ALL ON FUNCTION public.cc_my_invitation_codes() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cc_my_invitation_codes() TO authenticated;
