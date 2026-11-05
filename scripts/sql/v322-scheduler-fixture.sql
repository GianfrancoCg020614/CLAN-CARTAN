-- SOLO CI: no envía HTTP ni ejecuta cron real.
create schema net;create schema cron;
create table cron.job(jobid bigserial primary key,jobname text,schedule text,command text);
create function cron.schedule(text,text,text) returns bigint language plpgsql as $$declare j bigint;begin insert into cron.job(jobname,schedule,command) values($1,$2,$3) returning jobid into j;return j;end;$$;
create function net.http_post(url text,body jsonb default '{}',params jsonb default '{}',headers jsonb default '{}',timeout_milliseconds int default 2000) returns bigint language sql as $$select 1::bigint$$;

create function cron.unschedule(text) returns boolean language plpgsql as $$begin delete from cron.job where jobname=$1;return found;end;$$;
