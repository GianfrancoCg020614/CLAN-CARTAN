-- V156.2: corregir concatenación en la fuente de cotización Binance.
-- No crea cotizaciones ni modifica saldos.
do $migration$
declare fn text;
begin
 select pg_get_functiondef(p.oid) into fn
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='cc_admin_publish_usdt_pen_quote'
   and pg_get_function_identity_arguments(p.oid)='p_market_rate numeric, p_available_usdt numeric, p_cost_pct numeric, p_margin_pct numeric, p_reference text, p_confirm_checked boolean';
 if fn is null then raise exception 'La función esperada de cotización no existe';end if;
 if position('''Binance P2P Perú · ''+trim(p_reference)' in fn)>0 then
  execute replace(fn,'''Binance P2P Perú · ''+trim(p_reference)', '''Binance P2P Perú · ''||trim(p_reference)');
 elsif position('''Binance P2P Perú · ''||trim(p_reference)' in fn)=0 then
  raise exception 'La forma de la función cambió; revisar antes de aplicar';
 end if;
end $migration$;