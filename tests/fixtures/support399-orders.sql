-- LOCAL SYNTHETIC DATABASE ONLY. Never apply this fixture in production.
create table public.cc_portal_stream_orders(id uuid primary key,buyer_id uuid,order_code text,title text,service text,created_at timestamptz,status text);
insert into public.cc_portal_stream_orders values ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','ORD-PRUEBA-1','Producto controlado A','Netflix','2026-11-01','PAID_AWAITING_DELIVERY'),('40000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','ORD-AJENO','Producto de otra cuenta','Canva','2026-11-02','FULFILLED');
