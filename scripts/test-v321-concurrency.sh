#!/usr/bin/env bash
# Solo CI efímero, sin credenciales de producción.
set -euo pipefail
psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users(id,email) values('80000000-0000-4000-8000-000000000001','admin@rec.invalid'),('80000000-0000-4000-8000-000000000002','buyer@rec.invalid'),('80000000-0000-4000-8000-000000000003','buyer2@rec.invalid');
insert into public.cc_admins values('80000000-0000-4000-8000-000000000001');
insert into public.cc_user_details values('80000000-0000-4000-8000-000000000002','Comprador 1'),('80000000-0000-4000-8000-000000000003','Comprador 2');
set request.jwt.claim.sub='80000000-0000-4000-8000-000000000002';
select public.cc_recharge_create('81000000-0000-4000-8000-000000000001',20,'MANUAL_BANK');
set request.jwt.claim.sub='80000000-0000-4000-8000-000000000003';
select public.cc_recharge_create('81000000-0000-4000-8000-000000000002',20,'MANUAL_BANK');
SQL
query="set request.jwt.claim.sub='80000000-0000-4000-8000-000000000001';select public.cc_recharge_admin('approve',jsonb_build_object('rec_code',(select rec_code from cc_internal.recharge_registry where user_id='80000000-0000-4000-8000-000000000002'),'transaction_reference','CONCURRENT-BANK-123456','source_bank','Banco ficticio','reason','Ingreso real ficticio confirmado','confirmed_received',true));"
psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -c "$query" >/tmp/cc321-a.txt &
pid_a=$!
psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -c "$query" >/tmp/cc321-b.txt &
pid_b=$!
wait "$pid_a"
wait "$pid_b"
psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 <<'SQL'
do $$begin
 if (select sum(balance_pen) from public.cc_real_service_wallets where user_id='80000000-0000-4000-8000-000000000002')<>20 then raise exception 'Doble crédito';end if;
 if (select count(*) from public.cc_real_wallet_ledger where user_id='80000000-0000-4000-8000-000000000002')<>1 then raise exception 'Doble asiento';end if;
 if (select coalesce(sum(balance_pen),0) from public.cc_real_service_wallets where user_id='80000000-0000-4000-8000-000000000003')<>0 then raise exception 'Usuario equivocado';end if;
 raise notice 'PASS aprobaciones simultáneas: un asiento y un único titular';
end;$$;
SQL
# Dos titulares y el mismo depósito: solo una transacción puede reservar el recibo.
psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 <<'SQL'
set request.jwt.claim.sub='80000000-0000-4000-8000-000000000002';
select public.cc_recharge_create('81000000-0000-4000-8000-000000000003',20,'MANUAL_BANK');
SQL
query_for(){ printf "set request.jwt.claim.sub='80000000-0000-4000-8000-000000000001';select public.cc_recharge_admin('approve',jsonb_build_object('rec_code',(select rec_code from cc_internal.recharge_registry where user_id='%s' and status='PENDING'),'transaction_reference','SECOND-CONCURRENT-123456','source_bank','Banco ficticio','reason','Ingreso real ficticio confirmado','confirmed_received',true));" "$1"; }
psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -c "$(query_for '80000000-0000-4000-8000-000000000002')" >/tmp/cc321-c.txt 2>&1 &
pid_c=$!
psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -c "$(query_for '80000000-0000-4000-8000-000000000003')" >/tmp/cc321-d.txt 2>&1 &
pid_d=$!
status_c=0
status_d=0
wait "$pid_c" || status_c=$?
wait "$pid_d" || status_d=$?
if { [ "$status_c" -eq 0 ] && [ "$status_d" -eq 0 ]; } || { [ "$status_c" -ne 0 ] && [ "$status_d" -ne 0 ]; }; then
  cat /tmp/cc321-c.txt /tmp/cc321-d.txt
  exit 1
fi
psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 <<'SQL'
do $$begin
 if (select count(*) from cc_internal.cc_verified_payment_receipts where canonical_reference='secondconcurrent123456')<>1 then raise exception 'Recibo reutilizado';end if;
 if (select sum(balance_pen) from public.cc_real_service_wallets where user_id in('80000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000003'))<>40 then raise exception 'Depósito acreditado dos veces';end if;
 raise notice 'PASS un depósito entre dos titulares: solo uno puede conciliarse';
end;$$;
SQL
