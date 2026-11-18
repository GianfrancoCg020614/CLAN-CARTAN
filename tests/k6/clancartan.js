/**
 * CLAN CARTAN — read-only capacity probes, Grafana project 8503904.
 * Default: 1 VU / 30 seconds. No signups, payments, password changes or financial writes.
 * A successful public probe does NOT certify authenticated or financial capacity.
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import exec from 'k6/execution';
import { Counter, Rate, Trend } from 'k6/metrics';

const PROFILE = __ENV.PROFILE || 'smoke';
const BASE = (__ENV.BASE_URL || 'https://www.clancartan.com').replace(/\/$/, '');
const PROD_API = 'https://pqalxtrcyrpmwqdlibqd.supabase.co';
const prodSite = /^https?:\/\/(?:[a-z0-9-]+\.)*clancartan\.com(?::\d+)?$/i.test(BASE) || /^https?:\/\/(?:[a-z0-9-]+\.)?clan-cartan\.pages\.dev(?::\d+)?$/i.test(BASE);
const API = (__ENV.API_URL || (prodSite ? PROD_API : '')).replace(/\/$/, '');
const PUBLIC_KEY = __ENV.SUPABASE_PUBLISHABLE_KEY || (API === PROD_API ? 'sb_publishable_nsp19gAqsdRak3JqWpusUg_Qd6mQr0n' : '');
const production = prodSite || /^https?:\/\/pqalxtrcyrpmwqdlibqd\.supabase\.co(?::\d+)?$/i.test(API);
const ISOLATED = __ENV.ISOLATED === 'YES';
const knownProfiles = ['smoke', 'baseline', 'stress-read', 'capacity-isolated'];
if (!knownProfiles.includes(PROFILE)) throw new Error('Unknown PROFILE. Use smoke, baseline, stress-read or capacity-isolated.');
if (!/^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(BASE) || !/^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(API)) throw new Error('BASE_URL and API_URL must be explicit origins without paths or credentials.');
if (!PUBLIC_KEY) throw new Error('Provide the publishable key for the isolated environment. Never use service_role.');
if (PUBLIC_KEY.startsWith('sb_secret_')) throw new Error('Secret keys are forbidden.');
if (PUBLIC_KEY.split('.').length === 3) {
  // Legacy JWTs are deliberately refused: use a publishable key instead.
  throw new Error('Use a publishable sb_publishable_ key; do not put user or service JWTs into this public script.');
}
if (PROFILE === 'capacity-isolated' && (production || !ISOLATED || __ENV.ALLOW_LARGE_TEST !== 'YES')) throw new Error('10k VUs require an isolated target, ISOLATED=YES and ALLOW_LARGE_TEST=YES. Production is forbidden.');
if (!production && !ISOLATED) throw new Error('Confirm the separate test environment with ISOLATED=YES.');

const profiles = {
  smoke: { executor: 'constant-vus', vus: 1, duration: '30s', gracefulStop: '5s' },
  baseline: { executor: 'ramping-vus', startVUs: 1, gracefulRampDown: '5s', gracefulStop: '5s', stages: [
    { duration: '15s', target: 1 }, { duration: '30s', target: 3 },
    { duration: '30s', target: 5 }, { duration: '15s', target: 1 },
  ] },
  'stress-read': { executor: 'ramping-vus', startVUs: 1, gracefulRampDown: '5s', gracefulStop: '5s', stages: [
    {duration:'15s',target:10}, {duration:'15s',target:10},
    {duration:'15s',target:25}, {duration:'15s',target:25},
    {duration:'15s',target:50}, {duration:'15s',target:50},
    {duration:'10s',target:0},
  ] },
  'capacity-isolated': { executor: 'ramping-vus', startVUs: 0, gracefulRampDown: '10s', gracefulStop: '10s', stages: [
    { duration: '30s', target: 100 }, { duration: '1m', target: 100 },
    { duration: '1m', target: 500 }, { duration: '1m', target: 500 },
    { duration: '1m', target: 1000 }, { duration: '2m', target: 1000 },
    { duration: '1m', target: 2500 }, { duration: '2m', target: 2500 },
    { duration: '2m', target: 5000 }, { duration: '2m', target: 5000 },
    { duration: '3m', target: 10000 }, { duration: '3m', target: 10000 },
    { duration: '1m', target: 0 },
  ] },
};
const failures = new Rate('application_failures');
const throttled = new Counter('responses_429');
const homeTime = new Trend('homepage_ms', true);
const catalogTime = new Trend('catalog_ms', true);
const hardMax = PROFILE === 'capacity-isolated' ? 10000 : PROFILE === 'stress-read' ? 50 : PROFILE === 'baseline' ? 5 : 1;
export const options = {
  scenarios: { public_reads: profiles[PROFILE] },
  discardResponseBodies: true,
  maxRedirects: 0,
  setupTimeout: '30s',
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '10s' }],
    application_failures: [{ threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '10s' }],
    responses_429: [{ threshold: 'count<3', abortOnFail: true, delayAbortEval: '10s' }],
    homepage_ms: ['p(95)<2000'],
    catalog_ms: [{ threshold: 'p(95)<1500', abortOnFail: PROFILE === 'stress-read', delayAbortEval: '20s' }],
  },
  cloud: { projectID: 8503904, name: `CLAN CARTAN — ${PROFILE} — read only` },
  tags: { app: 'clan-cartan', profile: PROFILE, scope: 'public_read_only' },
};
const headers = { 'User-Agent': 'CLAN-CARTAN-owned-k6-capacity-check/1.0' };
const apiHeaders = { ...headers, apikey: PUBLIC_KEY, 'Content-Type': 'application/json' };
function runtimeGuard() {
  const actual = exec.test.options;
  for (const config of Object.values(actual.scenarios || {})) {
    const maximum = Math.max(config.vus || 0, config.startVUs || 0, config.maxVUs || 0, config.preAllocatedVUs || 0, ...(config.stages || []).map(s => s.target || 0));
    if (maximum > hardMax) exec.test.abort('Runtime VUs exceed the reviewed profile limit.');
  }
}
export function setup() {
  runtimeGuard();
  const page = http.get(BASE + '/', { headers, responseType: 'text', timeout: '10s', tags: { endpoint: 'preflight_home' } });
  if (!check(page, { 'homepage preflight 200': r => r.status === 200, 'homepage identifies CLAN CARTAN': r => r.body.includes('CLAN CARTAN') })) throw new Error('Homepage preflight failed. No load started.');
  const catalog = http.post(API + '/rest/v1/rpc/cc_portal_public_catalog_v3', '{}', { headers: apiHeaders, responseType: 'text', timeout: '10s', tags: { endpoint: 'preflight_catalog' } });
  let rows; try { rows = catalog.json(); } catch { throw new Error('Catalog did not return JSON. No load started.'); }
  if (!check(catalog, { 'catalog preflight 200': r => r.status === 200, 'catalog is an array': () => Array.isArray(rows), 'anonymous catalog hides distributor prices': () => Array.isArray(rows) && rows.every(r => r.distributor_price_pen == null && r.price_tier === 'PUBLIC') })) throw new Error('Catalog preflight failed. No load started.');
  console.log(JSON.stringify({ profile: PROFILE, max_vus: hardMax, existing_public_products: rows.length, scope: 'Anonymous reads only. No authenticated or financial capacity claim.' }));
}
function record(r, metric) {
  failures.add(r.status !== 200);
  throttled.add(r.status === 429 ? 1 : 0);
  if (metric) metric.add(r.timings.duration);
  check(r, { 'read returned 200': x => x.status === 200 });
}
export default function () {
  if (exec.vu.idInTest > hardMax) exec.test.abort('Runtime VU safety cap exceeded.');
  group('public homepage and shipped module', () => {
    record(http.get(BASE + '/', { headers, timeout: '10s', tags: { endpoint: 'homepage' } }), homeTime);
    record(http.get(BASE + '/scripts/v394-account-admin.js?v=394', { headers, timeout: '10s', tags: { endpoint: 'public_js' } }));
  });
  group('public catalog — read-only PostgREST RPC', () => {
    record(http.post(API + '/rest/v1/rpc/cc_portal_public_catalog_v3', '{}', { headers: apiHeaders, timeout: '10s', tags: { endpoint: 'catalog' } }), catalogTime);
  });
  sleep(PROFILE === 'capacity-isolated' ? 10 : PROFILE === 'stress-read' ? 5 : 2);
}
export function handleSummary(data) {
  return { stdout: JSON.stringify({ profile: PROFILE, scope: 'public_read_only', metrics: data.metrics }, null, 2) + '\n' };
}
