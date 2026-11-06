begin;
insert into public.cc_admins values('a0000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$declare r record;begin
 select * into r from public.cc_claim_dni_quota(null);
 if r.reason<>'not_authorized' then raise exception 'FAIL modern service JWT';end if;
 select * into r from public.cc_claim_dni_quota('a0000000-0000-4000-8000-000000000001');
 if not r.allowed or r.remaining<>99 then raise exception 'FAIL valid backend call';end if;
 if (select count(*) from public.cc_dni_quota_log)<>1 then raise exception 'FAIL quota log';end if;
end;$$;
select set_config('request.jwt.claim.role','service_role',true);
select set_config('request.jwt.claims','{"role":"authenticated","user_metadata":{"role":"service_role"}}',true);
do $$declare r record;begin select * into r from public.cc_claim_dni_quota('a0000000-0000-4000-8000-000000000001');if r.reason<>'forbidden' then raise exception 'FAIL forged role';end if;if(select count(*) from public.cc_dni_quota_log)<>1 then raise exception 'FAIL unauthorized consumed quota';end if;end;$$;
do $$begin
 begin perform public.cc_mark_dni_provider_exhausted();raise exception 'FAIL client exhaustion';exception when others then if sqlerrm<>'Forbidden' then raise;end if;end;
 if exists(select 1 from public.cc_dni_quota where external_exhausted) then raise exception 'FAIL forged exhaustion';end if;
end;$$;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$declare r record;i int;begin
 for i in 2..20 loop perform public.cc_claim_dni_quota('a0000000-0000-4000-8000-000000000001');end loop;
 select * into r from public.cc_claim_dni_quota('a0000000-0000-4000-8000-000000000001');if r.reason<>'daily_limit' then raise exception 'FAIL daily limit';end if;
 update public.cc_dni_quota set used=100;
 select * into r from public.cc_claim_dni_quota('a0000000-0000-4000-8000-000000000001');if r.reason<>'monthly_limit' then raise exception 'FAIL monthly limit';end if;
 perform public.cc_mark_dni_provider_exhausted();if not exists(select 1 from public.cc_dni_quota where external_exhausted) then raise exception 'FAIL provider exhaustion signal';end if;raise notice 'PASS service JWT, role forgery, counters, original limits and exhaustion signal';end;$$;
rollback;
