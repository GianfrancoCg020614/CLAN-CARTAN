-- V387: restrict the existing historical RPC to signed-in callers.
-- No function body, financial rule, table or customer record changes.
-- Conditional because earlier installations may not yet contain this optional RPC.
do $$begin
 if to_regprocedure('public.mc384_historical(bigint,date,date,date,numeric,text)') is not null then
  revoke all on function public.mc384_historical(bigint,date,date,date,numeric,text) from public,anon;
  grant execute on function public.mc384_historical(bigint,date,date,date,numeric,text) to authenticated;
 end if;
end $$;
notify pgrst,'reload schema';
