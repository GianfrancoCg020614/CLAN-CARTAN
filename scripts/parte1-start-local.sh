#!/usr/bin/env bash
set -euo pipefail
mkdir -p .parte1-local
pushd .parte1-local >/dev/null
supabase init --yes
python3 - <<'PY'
from pathlib import Path
cfg=Path('supabase/config.toml')
s=cfg.read_text()
if '[auth.hook.before_user_created]' in s:
    raise SystemExit('La configuración inicial no debe tener hook activo predefinido')
s+='''\n[auth.hook.before_user_created]\nenabled = true\nuri = "pg-functions://postgres/cc_internal/cc_part1_before_user_created"\n'''
s=s.replace('enable_confirmations = true','enable_confirmations = false')
cfg.write_text(s)
PY
mkdir -p supabase/migrations
cp ../docs/sql-propuestas/parte1-before-user-created.sql supabase/migrations/20261023000100_part1_before_user_created.sql
echo "Iniciando SOLO Supabase local, nunca enlazar proyecto remoto."
supabase start --exclude studio,realtime,storage,functions,analytics,pooler
supabase status -o env > status.env
popd >/dev/null
node scripts/check-parte1-auth-local.mjs
