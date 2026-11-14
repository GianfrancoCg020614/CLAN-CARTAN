# MI ALQUILER V388 — revisión, mejora y verificación

Baseline: `679573f953e69022b5206fd0ecb561d9f0c3c320`. Git source bundle `/workspace/clan-cartan-before-mi-alquiler-v388.bundle` verified recoverable. No staging; existing GitHub main / Cloudflare flow. No export of customer records or production test writes.

## Audit and scope

Existing four ma161 modules implement properties, units, tenants, leases, payment, fixed services, meters, guarantees, expenses and manual WhatsApp reminders. Reused their entry points, payloads, server permissions and financial rules. Existing ma tables have RLS; inspected financial policies require reseller_id=auth.uid() and ma_can_use(). Existing ma_guard validates activation and identity. ma_record_payment accepts a UUID and checks repeated requests; frontend previously generated a fresh UUID on every retry.

The old shell contained lengthy technical banners and wrapping navigation; finance repeated subscription/wallet content and summed capped ledger data. Some money labels used the global operating currency even for historical contracts. Core async loads compared against a mutable global owner and could accept a delayed response after account changes.

## Changes

- Single official original MI ALQUILER logo/header, visible CLAN CARTAN return, one search input, central wallet and profile links. PC sidebar/collapse; mobile drawer with inert/focus behavior. Existing five sections stay functional. Returning from wallet/profile retains the section.
- Scoped navy/gold premium styling; legacy shared themes explicitly exclude only the new ALQUILER root. Original home business card retained. Shared panel changes only recognize the ALQUILER active-module marker; other businesses keep their behavior.
- Search by normalized words, names, DNI, telephone and unit code in existing loaded lists; eight-item pages for properties, tenants, leases, finance and alerts. No duplicated alert search in the modern shell. Contract ledger history now queries 20-item pages and can reach older movements.
- Finance summary separated by original currency. Contract dialogs and history use each contract/movement currency. Guarantees remain separate from rent; central wallet is not inferred from rental receipts.
- Stable form request UUID on financial retries; same existing server RPCs. Core and finance/alerts discard stale account/session responses. Dialog errors remain visible and shared dialog helper owns Escape/X/focus.
- Existing DNI-first API Peru flow preserved. WhatsApp uses actual tenant consent/phone and opens a draft, never claims delivery. Excel and print preserved; recent export scope explicitly stated.

## Additive read-only migration

`ma388_summary()` is SECURITY INVOKER with empty search_path, auth.uid()/ma_can_use guards, existing RLS plus explicit owner filters and authenticated-only EXECUTE. It returns complete numeric ledger balances and per-currency totals rather than summing the latest batch. Payments with a null due date reduce the approximate amount due; no charge, rate, contract or transaction is changed. No existing function body, table or policy is replaced.

Rollback: revert V388 UI on main through the existing deploy flow. Leave the unused read function in place. It writes no records and the prior UI does not call it; no data restoration or destructive migration is needed. The source bundle is not claimed to be a personal-data snapshot.

## Tests and limits

Local PostgreSQL: 3,505 synthetic movements, two owners, PEN/USD/EUR, guarantees and expenses. Verify complete balances beyond 3,000 rows; currency separation; payments with no due date; isolation; expired activation; anonymous denial; invoker rights and no ledger writes.

Full local index in real Chromium at 1366/390/320: single logo/header, actual navigation, search with accents/word order, property/unit/tenant/contract form payloads, DNI autofill, currency selector, payment error/retry UUID, fixed service/meter/guarantee/expense forms, paginated ledger, consent-based WhatsApp, Excel download, return and blocked gate. All writes simulated, summary executed against local PostgreSQL. Existing 30 cross-module regression scenarios retained. Screenshots are real browser captures with controlled local data, not an authenticated production account.

Large base lists: if a base entity result reaches the API's 1,000-row ceiling, the module refuses an incomplete view rather than pretending it has all entries. A server-paginated universal search for exceptionally large property/tenant inventories remains a separate extension. Financial totals do not have that ledger ceiling. Meter/guarantee details and spreadsheet exports explicitly cover recent fetched entries; full ledger is paginated. Exports are private internal reports, not tax documents.

Existing financial server concurrency, activation payments and real customer submissions were not exercised in production. Their functions are preserved, and no real customer operation was created or modified for testing. Owner verification after release: sign in, open MI ALQUILER with a valid activation, inspect own properties/contracts, close a form with X, use the wallet return, and return to CLAN CARTAN.

Production migration applied as `20261114060757`. Metadata verification: SECURITY INVOKER=true; anon EXECUTE=false; authenticated EXECUTE=true; unauthenticated invocation rejected. Aggregate hash of every pre-existing ma_* function before/after is identical: `a9e5e1e26692fcb558d0a9276f9af619`. No customer records were read for the audit or changed by the migration.
