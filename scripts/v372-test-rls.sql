-- LOCAL/CI ONLY. Mirror production SELECT isolation for the reduced V371 bootstrap.
grant select on public.cy_clients,public.cy_loans,public.cy_payments,public.cy_installments,public.cy_loan_corrections to authenticated;
do $$declare t text;begin
 foreach t in array array['cy_clients','cy_loans','cy_payments','cy_installments','cy_loan_corrections'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy cy372_fixture_read on public.%I for select to authenticated using ((owner_id=auth.uid() and (public.cy371_access()->>''allowed'')::boolean) or (public.cy371_access()->>''admin'')::boolean)',t);
 end loop;
end $$;
