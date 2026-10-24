# CLAN CARTAN | Integration contract for service fulfillment (STAGING)

## Deployed
Supabase STAGING project `szcplebbqhtcgxhvmxdv`, Edge Function `cc-clan-service-fulfillment` version 1, ACTIVE. Deployed only to STAGING. GitHub source `supabase/functions/cc-clan-service-fulfillment/index.ts`.

**Not live commerce.** STAGING has no native underlying STREAM BULL'S / COBRA YA / MI COCHERA / MI ALQUILER service-delivery tables or adapters. The function is a shared backend-only bridge but none of the four provider modules sends verified fulfillment events yet.

## Contract for each real service backend

Use server-to-server POST to `/functions/v1/cc-clan-service-fulfillment`; NEVER call from browser JS.

Raw JSON payload:
```json
{"service":"COBRA_YA","activation_key":"actual-immutable-order-id","user_id":"authenticated-user-uuid","amount_pen":15.00,"fulfillment_reference":"actual-provider-confirmation-id"}
```

Allowed service codes: `STREAM_BULLS`, `COBRA_YA`, `MI_COCHERA`, `MI_ALQUILER`. Same immutable `activation_key` for every retry. The service must attest that access/product was actually delivered to the identified user; do not emit for PENDING/FAILED orders or merely clicking an activation button.

For authentication, configure one **distinct random 32+ character HMAC secret per service** in the Supabase STAGING Edge Functions secret manager (not GitHub, not ChatGPT messages, not browser):

- `CLAN_FULFILLMENT_STREAM_BULLS_SECRET`
- `CLAN_FULFILLMENT_COBRA_YA_SECRET`
- `CLAN_FULFILLMENT_MI_COCHERA_SECRET`
- `CLAN_FULFILLMENT_MI_ALQUILER_SECRET`

Send `x-clan-timestamp` (13-digit Unix milliseconds, max 5 minutes deviation) and `x-clan-signature` (lowercase hex HMAC-SHA256 of exact UTF-8 `timestamp + '.' + raw_JSON_body`). Send signed raw body unchanged. No secrets in browser/local storage. Limit each service backend to its own secret.

On passing signature and schema validation, the function inserts a private fulfillment receipt (idempotent) and invokes `cc_clan_activate_with_real_wallet`: the database verifies receipt, debits REAL wallet, records activation and credits monthly S/5 inviter in the same database transaction. Existing event returns `ALREADY_ACTIVATED` with no second debit. Failed activation returns HTTP 409, retry safely after fixing insufficiency.

**Caution:** receipt write and activation RPC are two network steps; on failed debit, receipt can remain while no charge occurred. The trusted backend should use same `activation_key` to retry; reconciliation and stale-receipt recovery must be tested. An external service fulfillment operation itself is not part of the transaction and requires provider-specific compensation.

## Remaining work, requiring access to the real service backends
1. Locate each platform's server-side delivery operation; STAGING currently does not contain it.
2. Connect its successful delivery event to this signed endpoint, after confirming an actual real-wallet-funded purchase and the user/service/amount mapping.
3. Configure the per-service signing secrets in secure settings and rotate them appropriately.
4. Run live endpoint negative checks (unsigned, old timestamp, tampered body) and full staging E2E plus concurrence/rollback/refunds.
5. Only then consider production deployment. Existing financial production unchanged.

**Important:** The Edge Function is public at the network level (`verify_jwt=false`) for server-to-server calls; cryptographic HMAC verification is its authentication. It should reject missing/wrong signatures, but this has not yet been independently tested over external HTTP due limited outbound network access from this session.
