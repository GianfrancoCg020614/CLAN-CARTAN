# MI COCHERA V373

Existing module only. Navy, blue and gold interface using the original project logo, a single header, visible CLAN CARTAN return, responsive sidebar/drawer, paginated carts, selected cart modal on phones, actual sales/history and currency-separated financial summaries. Existing central wallet, authentication, activation and financial RPCs remain authoritative.

## Audit and recovery

Baseline: 967bfdb31894f3e39907920ab4b51e5dc31c32a8 (COBRA YA V372).
Verified recoverable Git bundle: `/workspace/clan-cartan-before-mi-cochera-premium.bundle` (`git bundle verify` passed).
Found duplicate V151 dynamic MI COCHERA loader in addition to the index loader, hidden return header, nonfunctional menu entries and browser totals truncated to 2000 movements. Removed duplicate loader and obsolete CSS overrides; retained existing public entry points.

Automatic approval review rejected a bulk personal-data snapshot. No such export was made. This release does not update existing records, tables, policies or financial functions: the backup is the source bundle and baseline Git commit, not a claimed full database backup. Metadata and count-only checks are used instead of extracting personal rows.

Additive migration creates only `mc373_workspace`, a read-only SECURITY INVOKER function with an empty search_path, active-owner validation, existing RLS, explicit owner predicates, bounded pages and no anonymous execution. Aggregation uses PostgreSQL numeric over the full ledger. America/Lima follows the existing rent rule; no timezone or financial formula changed. No other business runtime is changed. Two shared integration conditions and cache URLs are scoped to MI COCHERA entry/return and duplicate-loader prevention.

Rollback: revert this release's UI commit through the existing main/Cloudflare flow, restoring the baseline source. Leave the unused additive read function in place; it changes no stored data and the old UI does not call it. No historical record restoration or destructive reverse migration is necessary.

## Verification

Local PostgreSQL synthetic dataset: two owners, 68 carts, 2510 ledger rows. Tests verify complete balances beyond 2000 rows; independent PEN/USD/EUR; exact daily ledger amounts; search by alias/name/document/phone/code; pagination; RLS; owner isolation; expiry; anonymous denial; invoker rights; no movement writes.

Real Chromium module fixtures at 1366, 390 and 320 pixels: 30 cases, covering original dialogs, focus, Escape/X, DNI races, no double submission, stale session isolation, menus, search, logo loading, all sections, return and horizontal overflow. Fixture writes are simulated and never reach production. Screenshots in artifacts/mc373 are real browser captures of controlled local data, not a logged-in production account.

Syntax/static checks: check-v158-mi-cochera, test-v304-inline-syntax, node --check and git diff --check.

## Limits and owner verification

No financial write RPC was changed. Their server-level retry idempotency was not redesigned. Double-tap protection is verified at the existing form boundary; tests do not claim real customer payments were submitted. Existing daily rent synchronization still runs on module opening/manual refresh. History is paginated rather than silently limited to a single batch.

After publication: sign in, open MI COCHERA with a valid activation; verify original logo, wallet amount, cart list and selected details; open and close a form (X stays in the module); use Volver a CLAN CARTAN. No real payment is required for this visual review. A complete authenticated production financial write test remains an owner-controlled step; no customer operations are modified for testing.

Production metadata verification: migration `20261113201834` applied successfully; invoker=true, anonymous execute=false, authenticated execute=true. Unauthenticated call rejected. All five MC table RLS flags remain enabled. Carts/people/stays/movements counts remained zero before and after; hashes of the five existing financial/activation functions are unchanged. No advisor specifically identifies the added function.
