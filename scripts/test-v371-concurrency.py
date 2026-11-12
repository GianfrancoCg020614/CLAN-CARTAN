"""LOCAL ONLY: independent connections verify numbering/idempotency under contention."""
import concurrent.futures,subprocess,json,uuid,os
DB=os.environ.get('V371_PG_DATABASE','v371release')
CONTAINER=os.environ.get('V371_PG_CONTAINER','cobra-v371-test')
OWNER='00000000-0000-4000-8000-000000000001'
def sql(q):
 r=subprocess.run(['docker','exec',CONTAINER,'psql','-U','postgres','-d',DB,'-qAt','-v','ON_ERROR_STOP=1','-c',q],capture_output=True,text=True)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout.strip()
client=sql("select id from public.cy_clients where owner_id='"+OWNER+"' order by created_at limit 1")
def create(request):
 return sql(f"begin;set local role authenticated;set local request.jwt.claim.sub='{OWNER}';select public.cy371_mutate('loan','{request}',jsonb_build_object('client_id','{client}','principal','10.01','monthly_rate','0','months',1,'installments',1,'final_due',current_date+30,'currency','PEN'));commit;")
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 ids=list(pool.map(create,[str(uuid.uuid4()) for _ in range(16)]))
assert len(set(ids))==16
same=str(uuid.uuid4())
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 ids=list(pool.map(create,[same]*16))
assert len(set(ids))==1
assert sql("select count(*)=count(distinct loan_code) from public.cy_loans where owner_id='"+OWNER+"'")=='t'
assert sql("select count(*) from cc_internal.cy371_requests where request_id='"+same+"'")=='1'
cancel=str(uuid.uuid4())
assert json.loads(sql(f"begin;set local role authenticated;set local request.jwt.claim.sub='{OWNER}';select public.cy371_request('{cancel}',true);commit;"))['state']=='cancelled'
try:create(cancel)
except RuntimeError:pass
else:raise AssertionError('A cancelled request accepted a late write')
assert sql(f"begin;set local role authenticated;set local request.jwt.claim.sub='{OWNER}';select jsonb_array_length(public.cy371_search('Juancaa'));commit;")=='1'
first=json.loads(sql(f"begin;set local role authenticated;set local request.jwt.claim.sub='{OWNER}';select public.cy371_list(p_limit=>15,p_offset=>0);commit;"))
second=json.loads(sql(f"begin;set local role authenticated;set local request.jwt.claim.sub='{OWNER}';select public.cy371_list(p_limit=>15,p_offset=>15);commit;"))
assert len(first['rows'])==15 and second['rows']
assert not {r['id'] for r in first['rows']} & {r['id'] for r in second['rows']}
print('PASS: 16 simultaneous loans; 16 identical retries produce 1 loan; unique per-owner codes; cancellation blocks late writes; fuzzy search; pagination without overlap.')
