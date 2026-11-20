-- Local synthetic support398test database only. Never run fixtures in production.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$declare x jsonb;begin
 x:=public.cc_support398('purchases','{}');
 if (jsonb_array_length(x)<1 or jsonb_array_length(x)>20) or x->0->>'order_code'<>'ORD-PRUEBA-1' then raise exception 'Purchase isolation';end if;
 begin perform public.cc_support398('create','{"request_id":"50000000-0000-0000-0000-000000000002","reason":"Ayuda con mi compra","order_id":"40000000-0000-0000-0000-000000000002","body":"No debe guardarse"}');raise exception 'Foreign order accepted';exception when insufficient_privilege then null;end;
 begin perform public.cc_support398('create','{"request_id":"50000000-0000-0000-0000-000000000002","reason":"Ayuda con mi compra","body":"No debe guardarse"}');raise exception 'Missing order accepted';exception when insufficient_privilege then null;end;
 x:=public.cc_support398('create','{"request_id":"50000000-0000-0000-0000-000000000001","reason":"Ayuda con mi compra","order_id":"40000000-0000-0000-0000-000000000001","subject":"No confiar en este asunto","business":"MI_COCHERA","body":"Consulta de prueba"}');
 if x->>'business'<>'STREAM_BULLS' or x->>'order_title'<>'Producto controlado A' or position('ORD-PRUEBA-1' in x->>'subject')=0 then raise exception 'Purchase data not authoritative';end if;
 x:=public.cc_support398('create','{"request_id":"50000000-0000-0000-0000-000000000001","reason":"Ayuda con mi compra","order_id":"40000000-0000-0000-0000-000000000001","body":"Consulta de prueba"}');
 if jsonb_array_length(public.cc_support398('thread','{"ticket_id":"50000000-0000-0000-0000-000000000001"}')->'messages')<>1 then raise exception 'Duplicate purchase inquiry';end if;
 perform public.cc_support398('create','{"request_id":"50000000-0000-0000-0000-000000000003","reason":"Información de producto","business":"CLAN_CARTAN","body":"Información de prueba"}');
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$begin
 begin perform public.cc_support398('thread','{"ticket_id":"50000000-0000-0000-0000-000000000001"}');raise exception 'Foreign linked inquiry leak';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$declare x jsonb;begin
 if jsonb_array_length(public.cc_support398('purchases','{}'))<>0 then raise exception 'Admin my purchases leaks other customers';end if;
 x:=public.cc_support398('thread','{"ticket_id":"50000000-0000-0000-0000-000000000001"}');
 if x->'ticket'->>'order_code'<>'ORD-PRUEBA-1' then raise exception 'Admin cannot see linked purchase';end if;
end$$;
rollback;
