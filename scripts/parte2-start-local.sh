#!/usr/bin/env bash
set -euo pipefail
mkdir -p .parte2-local
pushd .parte2-local >/dev/null
supabase init --yes
python3 - <<'PY'
from pathlib import Path
import re
cfg=Path('supabase/config.toml')
s=cfg.read_text()
hook='''[auth.hook.before_user_created]\nenabled = true\nuri = "pg-functions://postgres/cc_internal/cc_part1_before_user_created"\n'''
section=r'(?ms)^\[auth\.hook\.before_user_created\]\s*.*?(?=^\[|\Z)'
s=re.sub(section,hook+'\n',s,count=1) if re.search(section,s) else s+'\n'+hook
s=s.replace('enable_confirmations = true','enable_confirmations = false')
cfg.write_text(s)
PY
mkdir -p supabase/migrations
cp ../docs/sql-propuestas/parte1-before-user-created.sql supabase/migrations/20261023000100_part1_validator.sql
cp ../docs/sql-propuestas/parte1-consent-audit-and-guard.sql supabase/migrations/20261023000200_part1_guard.sql
cp ../supabase/migrations/20261023225000_v172_clan_global_referrals.sql supabase/migrations/20261023000300_part2_clan.sql
supabase start --exclude studio,realtime,storage,functions,analytics,pooler
supabase status -o env > status.env
popd >/dev/null
node scripts/check-v172-clan-auth-local.mjs
