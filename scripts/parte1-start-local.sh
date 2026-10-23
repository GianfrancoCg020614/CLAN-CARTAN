#!/usr/bin/env bash
set -euo pipefail
mkdir -p .parte1-local
pushd .parte1-local >/dev/null
supabase init --yes
python3 - <<'PY'
from pathlib import Path
cfg=Path('supabase/config.toml')
s=cfg.read_text()
import re
hook='''[auth.hook.before_user_created]\nenabled = true\nuri = "pg-functions://postgres/cc_internal/cc_part1_before_user_created"\n'''
section=r'(?ms)^\[auth\.hook\.before_user_created\]\s*.*?(?=^\[|\Z)'
if re.search(section,s):
    s=re.sub(section,hook+'\n',s,count=1)
else:
    s+='\n'+hook
s=s.replace('enable_confirmations = true','enable_confirmations = false')
cfg.write_text(s)
PY
mkdir -p supabase/migrations
cp ../docs/sql-propuestas/parte1-before-user-created.sql supabase/migrations/20261023000100_part1_before_user_created.sql
cp ../docs/sql-propuestas/parte1-consent-audit-and-guard.sql supabase/migrations/20261023000200_part1_consent_audit_and_guard.sql
echo "Iniciando SOLO Supabase local, nunca enlazar proyecto remoto."
supabase start --exclude studio,realtime,storage,functions,analytics,pooler
supabase status -o env > status.env
popd >/dev/null
node scripts/check-parte1-auth-local.mjs
