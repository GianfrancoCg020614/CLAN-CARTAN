# MI COCHERA V387 — revisión de V374–V386

Baseline Git: `59dcad36196769f733180fc78034f93f452dd2ad`. Recoverable source bundle `/workspace/clan-cartan-before-v387.bundle`, verified. No staging, new login, wallet or other business changes.

## Confirmed defects and corrections

- Navigation used an ID lookup helper with a CSS selector and threw before changing views. Correct DOM queries now run the existing loader; reselecting the active PC section does not make its sidebar inert.
- Retired-with-debt section omitted the state selector intentionally but called renderRows only when that selector existed. Rendering is independent of the selector now. Search retains that section.
- Payment/product dialogs showed account currency instead of the selected cart's original currency. Dialogs now use the selected cart and reject invalid/inactive sale targets. Server rules remain authoritative.
- Dialog errors were rendered behind the overlay. The active dialog status now receives them.
- Local Escape/focus handling duplicated the shared controller. The existing shared focus trap, X and focus restoration own dialog navigation again; existing busy behavior remains.
- Historical inputs now enable only the relevant fields, validate positive payment and date order, ignore disabled exit fields and ask for a review of entered data before the existing RPC. No financial calculation is changed.
- Calendar cannot substantiate per-day FIFO allocation when adjustments or leftover credits are present. Those cases show 'Requiere conciliación' rather than paid/unpaid assertions, while actual ledger and verified balance remain available. Month formatting uses Peru date parts. Corrections lookup fails closed when its audit query fails.
- V387 has fresh module JS/CSS cache URLs and deployment metadata. Original logo and approved layout retained.

## Supabase audit and permission fix

Read current function definitions and RLS metadata only; no customer records exported. Current `mc384_historical`, `mc_record_payment_once`, `mc_retire_cart_retroactive`, `mc_reverse_movement` validate activation/owner. All observed MC tables have RLS enabled. Historical function unnecessarily inherited anonymous EXECUTE, also identified by the security advisor.

Migration `20261114044925` only revokes PUBLIC/anon execution on the existing historical RPC and grants authenticated execution. No body/table/data changes. Production verified anonymous=false, authenticated=true. Historical body hash remained `95c2fab0ec981ac9ac58f0ab46195138`; normal payment `cbc10ac4af19f6121fbde0a4ccd419df`, retirement `00d8c379642ad085d59e27e1039aa273` and reversal `3a98112bb7cd9f008d799e78d9308fdf` unchanged. Initial connector resolution error made no change; subsequent verified application succeeded.

Rollback UI: revert this release on main and use existing Cloudflare deployment. Keep the safe ACL restriction: authenticated operation is compatible with the previous UI. No financial-data restore needed; this release performs no customer writes. Source backup is not a full personal-data dump.

## Tests

Existing 30 Chromium scenarios at 1366/390/320; actual heading changes now asserted rather than merely nonempty content. Updated synthetic fixtures for current cart-specific actions. New regression suite tests retired-debt rows/search, desktop menu re-selection, USD payment/product labels, visible dialog errors, stable normal-payment request UUID on retry, historical field state/controlled payload, correction lookup failure and calendar adjustment uncertainty.

Local PostgreSQL tests verify complete ledger sums, multiple currencies, two-owner isolation, expiry, pagination and read-only behavior. Separate transaction creates a dummy historical signature, applies the exact ACL migration and verifies permissions/body preservation, then rolls back. Full local index integration includes shared loaders and actual local workspace SQL. No real payments submitted. Screenshots are real browser captures with controlled local data.

## Remaining financial limitations requiring separate approved work

`mc384_historical` inserts historical payments without a request UUID or duplicate-reference constraint. Unlike normal payments, response-loss/reopening can duplicate a historical payment. A complete fix needs a separately reviewed additive idempotency design and local concurrent transaction tests; it is not silently implemented here. Do not repeat an uncertain historical payment without checking its ledger first.

The recent production financial functions exist in Supabase but are not all represented in repository migrations (the V375 document still says proposal). Reproducing that financial schema from scratch needs a dedicated schema reconciliation/review; this UI release does not invent replacement functions or reset production.

Private authenticated production writes were not exercised; owner should review actual account/cart displays after publication, without creating artificial customer transactions.
