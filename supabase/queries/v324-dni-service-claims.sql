-- Conserva límites y permisos; reconoce el JWT vigente del servidor.
do $$declare d text;begin
 d:=pg_get_functiondef('public.cc_claim_dni_quota(uuid)'::regprocedure);
 if strpos(d,$old$current_setting('request.jwt.claim.role',true)$old$)=0 then raise exception 'Definición del control de cuota distinta de la auditada';end if;
 d:=replace(d,$old$current_setting('request.jwt.claim.role',true)$old$,$new$(auth.jwt()->>'role')$new$);
 execute d;
end;$$;
