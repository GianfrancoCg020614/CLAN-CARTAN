-- El aviso de agotamiento utiliza el mismo JWT moderno que la reserva de cupo.
do $$declare d text;begin
 d:=pg_get_functiondef('public.cc_mark_dni_provider_exhausted()'::regprocedure);
 if strpos(d,$old$current_setting('request.jwt.claim.role',true)$old$)=0 then raise exception 'Definición de agotamiento distinta de la auditada';end if;
 d:=replace(d,$old$current_setting('request.jwt.claim.role',true)$old$,$new$(auth.jwt()->>'role')$new$);
 execute d;
end;$$;
