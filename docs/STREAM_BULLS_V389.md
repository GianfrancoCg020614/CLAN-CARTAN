# STREAM BULL'S V389 — interfaz y roles existentes

Baseline `03b7552ff7badb3b4d723c0c2529a2ca5b567e2c`. Verified recoverable source bundle `/workspace/clan-cartan-before-stream-v389.bundle`. Existing main/Cloudflare deployment only, no staging. No database mutation or personal-data export.

## Roles and server audit

The existing portal derives ADMIN from cc_admins, Super from enabled approval plus active STREAM membership/subscription/access, and other business categories from each service's actual activation. STREAM's header now describes the STREAM role, so having another active business does not falsely imply STREAM privileges.

- ADMIN: marketplace/order supervision, delivery supervision and existing Super authorization controls. No customer purchase, publication, or seller delivery actions. The personal account/profile board no longer replaces the ADMIN supervision page.
- Super reseller: existing approved/active publications, own sales, delivery accounts, authorized mailboxes and requests, purchases and personal operational board.
- Active reseller: existing personal account/client/profile operations and purchases; no publication or seller-only marketplace controls.
- Affiliate / expired / pending: public catalogue and own purchases as already allowed. An approved Super whose membership expires cannot publish; a paid pending Super has reseller operations until approval.

This is presentation, not a new role system. All existing Supabase function bodies, RLS, prices, fees and wallet rules remain unchanged. Reviewed sb_oper_has_access_v195 and operational RLS: owner policy is PERMISSIVE, subscription entitlement is RESTRICTIVE, so ownership and entitlement both apply. Child slots/assignments follow owned accounts/contracts. Server publishing rejects ADMIN; price lookup uses cc_internal.cc_stream_distributor_eligible. Private seller price details require the existing paid Super/admin authorization. No new client claim grants access.

The existing operational server entitlement includes an ADMIN exception for managing their own records. V389 presents ADMIN as supervision in the portal, matching its existing description; it does not claim to revoke that server exception or grant cross-owner operational access.

## Changes

Single original logo/header inside the existing portal, scoped navy/gold theme, desktop sidebar collapse and mobile drawer. Clear STREAM role, existing verified central-wallet badge, CLAN CARTAN return, and contextual Back for wallet/profile. The other businesses retain their UI and role flows. STREAM context is per-user navigation state, never stored authorization or credentials.

Existing marketplace workflows preserved. Owner-filtered publication query avoids losing own listings behind a global recent-product batch. New-publication form is collapsible in STREAM context, retains its actual form/file during refresh and does not bypass price/stock/commission validation.

Operational search updates immediately without replacing the search input; accents, case, partial telephone and reordered words normalize consistently. Lists use eight items on PC/five on phones. Contract history now loads independently in pages of 20, with owner and contract filters; old events no longer block the operational board. Existing account, client, renewal, payment, transfer and release RPC payloads stay unchanged. No unavailable button is simulated as success. WhatsApp opens a professional draft with actual contract data and never claims delivery. Modal X remains in the current module; errors preserve the form and distinguish an unconfirmed save from confirmed failure.

Market summaries explicitly cover loaded orders (up to 100); seller allocation amounts are not described as confirmed unpaid settlements. The finance module remains the authority for settlement status. Wallet is still the existing central wallet, and personal client collections do not credit it.

## Verification and rollback

37 isolated Chromium cases: 16 existing admin/role/market/form regressions and 7 role situations at 1366/390/320. Actual local index and production module scripts; API responses and writes synthetic. Test active/pending/expired/other-business roles, no false publish/seller menu, ADMIN without personal board calls, original logo, own publication filtering/draft refresh, search input identity, partial phone/accents, pagination, visible save errors/X, paginated history, reviewed WhatsApp debt draft with exact contract amount/phone, wallet back, menu/Escape, exit to four businesses, no session loss, no page errors or horizontal overflow. Screenshots are real browser captures with controlled local data; not authenticated production customer screenshots.

No real customer financial operation or message was sent. Production public version/assets and Cloudflare commit are checked after deployment. Existing server financial concurrency is not recertified by UI mocks.

Rollback the UI commit through existing main/Cloudflare. There are no schema or data changes to reverse. Leave all customer transactions untouched.

## Limits

The six core operational queries retain their existing 1000-row API ceiling; now they fail clearly at the ceiling rather than showing incomplete free-slot/count indicators. Larger inventories need server pagination before that board can safely operate. Contract event history is paginated independently without that global batch ceiling. Marketplace views explicitly show recent batches up to 100; older records are not deleted. No claim of complete financial history is made from those batches.

Manual payment RPC has no request UUID but the database has UNIQUE(contract_id,reference); repeated identical references cannot insert twice. Existing form double-tap prevention remains. Reusing a different reference represents a different operation; no new duplicate-payment inference or financial rule is introduced.
