-- SOLO CI/local: tarifas actuales y funciones reales, sin datos de producción.
insert into cc_internal.finance_rates(service,amount_pen,reason) values
 ('COBRA_YA',15,'Fixture V325'),('MI_COCHERA',15,'Fixture V325'),('MI_ALQUILER',15,'Fixture V325'),('STREAM_BULLS',25,'Fixture V325');
insert into public.cc_businesses(code) values('COBRA_YA'),('MI_COCHERA'),('MI_ALQUILER'),('STREAM_BULLS');
insert into public.cc_plans(business_id,code,title,billing_type,price_pen,is_active)
 select id,'STREAM_365','Anual','ANNUAL',25,true from public.cc_businesses where code='STREAM_BULLS';
