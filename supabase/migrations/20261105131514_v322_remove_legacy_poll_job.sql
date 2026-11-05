-- El único programador activo de avisos es Cloudflare Workers.
do $$begin
 if exists(select 1 from cron.job where jobname='cc-recharge-mail-every-five-minutes') then
  perform cron.unschedule('cc-recharge-mail-every-five-minutes');
 end if;
end;$$;
