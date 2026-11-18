#!/usr/bin/env bash
# Disposable Auth only. Never connect this test to a hosted Supabase project.
set -euo pipefail
root_dir=$(pwd)
name="clan394-auth-${GITHUB_RUN_ID:-local}-$$"
cleanup(){ docker rm -f "$name-api" "$name-db" >/dev/null 2>&1 || true; docker network rm "$name-net" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker network create "$name-net" >/dev/null
docker run --name "$name-db" --network "$name-net" -e POSTGRES_PASSWORD=ci-fixture-only -d postgres:17 >/dev/null
for attempt in {1..30}; do
 if docker exec "$name-db" psql -U postgres -c 'select 1' >/dev/null 2>&1; then break; fi
 sleep 1
done
docker exec -i "$name-db" psql -U postgres -v ON_ERROR_STOP=1 <<'SQL'
create schema auth;
alter role postgres in database postgres set search_path to auth,public;
SQL
docker run --name "$name-api" --network "$name-net" -p 127.0.0.1:55431:9999 \
 -e GOTRUE_API_HOST=0.0.0.0 -e GOTRUE_API_PORT=9999 -e API_EXTERNAL_URL=http://127.0.0.1:55431 \
 -e GOTRUE_SITE_URL=http://127.0.0.1:55431 -e GOTRUE_DB_DRIVER=postgres \
 -e "GOTRUE_DB_DATABASE_URL=postgres://postgres:ci-fixture-only@$name-db:5432/postgres?sslmode=disable" \
 -e GOTRUE_DB_NAMESPACE=auth -e GOTRUE_JWT_SECRET=ci-fixture-only-v394-jwt-secret-never-production \
 -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true -e GOTRUE_MAILER_AUTOCONFIRM=true \
 -d public.ecr.aws/supabase/gotrue:v2.197.0 >/dev/null
for attempt in {1..30}; do
 if curl -fsS http://127.0.0.1:55431/health >/dev/null; then break; fi
 sleep 1
done
node "$root_dir/scripts/test-v394-password-local.mjs"
