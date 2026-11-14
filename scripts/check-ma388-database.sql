\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$declare r jsonb;p jsonb;b jsonb;begin
 r:=public.ma388_summary();if jsonb_array_length(r->'summary')<>2 or jsonb_array_length(r->'leases')<>2 then raise exception 'Isolation/count failed';end if;
 select x into p from jsonb_array_elements(r->'summary') x where x->>'currency'='PEN';
 if (p->>'debt')::numeric<>2501 or (p->>'collected')::numeric<>1000 or (p->>'held')::numeric<>80 or (p->>'expenses')::numeric<>9 then raise exception 'Full PEN totals incorrect: %',p;end if;
 select x into p from jsonb_array_elements(r->'summary') x where x->>'currency'='USD';if (p->>'debt')::numeric<>15 or (p->>'collected')::numeric<>5 or (p->>'expenses')::numeric<>7 then raise exception 'Currency mixing';end if;
 select x into b from jsonb_array_elements(r->'leases') x where x->>'id'='00000000-0000-4000-8000-000000000101';if (b->>'due')::numeric<>2501 or (b->>'movement_count')::integer<>3502 then raise exception 'Payments with null due date or >3000 ledger were omitted';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
do $$begin if jsonb_array_length(public.ma388_summary()->'leases')<>1 then raise exception 'Other-owner data exposed';end if;end $$;
reset role;
update public.ma_accounts set active=false where user_id='00000000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$begin begin perform public.ma388_summary();raise exception 'Expired owner allowed';exception when insufficient_privilege then null;end;end $$;
reset role;
update public.ma_accounts set active=true where user_id='00000000-0000-4000-8000-000000000001';
do $$begin if has_function_privilege('anon','public.ma388_summary()','EXECUTE') or (select prosecdef from pg_proc where oid='public.ma388_summary()'::regprocedure) then raise exception 'Unsafe function permissions';end if;if (select count(*) from public.ma_ledger)<>3505 then raise exception 'Ledger changed';end if;end $$;
select 'PASS MA388: full numeric totals, currencies, null-date payments, isolation, expiry and no writes' result;
