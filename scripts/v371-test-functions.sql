CREATE OR REPLACE FUNCTION public.cy_record_payment(p_loan_id uuid, p_amount numeric, p_memo text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_owner uuid; v_due numeric; v_row record; v_remaining numeric; v_applied numeric; v_payment uuid;
begin
 v_owner:=auth.uid();
 if v_owner is null or not cc_internal.can_manage_cy(v_owner) then raise exception 'No autorizado'; end if;
 if p_amount is null or p_amount<=0 or p_amount>100000000 or p_amount<>round(p_amount,2) then raise exception 'Monto inválido'; end if;
 perform 1 from public.cy_loans where id=p_loan_id and owner_id=v_owner and status='ACTIVE' for update;
 if not found then raise exception 'Préstamo no encontrado'; end if;
 select coalesce(sum(amount-paid_total),0) into v_due from public.cy_installments where loan_id=p_loan_id;
 if p_amount>v_due then raise exception 'Abono mayor al saldo'; end if;
 insert into public.cy_payments(loan_id,owner_id,amount,memo) values(p_loan_id,v_owner,p_amount,left(p_memo,500)) returning id into v_payment;
 v_remaining:=p_amount;
 for v_row in select id,amount,paid_total from public.cy_installments where loan_id=p_loan_id and paid_total<amount order by installment_number for update loop
    exit when v_remaining<=0;
    v_applied:=least(v_remaining,v_row.amount-v_row.paid_total);
    update public.cy_installments set paid_total=paid_total+v_applied,
     status=case when paid_total+v_applied>=amount then 'PAID' else 'PARTIAL' end
     where id=v_row.id;
    v_remaining:=v_remaining-v_applied;
 end loop;
 return v_payment;
end; $function$;
CREATE OR REPLACE FUNCTION public.cy_create_loan_with_collateral(p_client_id uuid, p_principal numeric, p_monthly_rate numeric, p_months integer, p_installments integer, p_final_due date, p_currency text, p_collateral text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid; v_user uuid:=auth.uid();
begin
 if v_user is null or not cc_internal.can_manage_cy(v_user) then raise exception 'Suscripción inactiva'; end if;
 if length(coalesce(p_collateral,''))>1000 then raise exception 'Descripción de garantía demasiado larga';end if;
 v_id:=public.cy_create_monthly_loan(p_client_id,p_principal,p_monthly_rate,p_months,p_installments,p_final_due,p_currency);
 if nullif(trim(coalesce(p_collateral,'')),'') is not null then
  insert into public.cy_loan_collateral(loan_id,owner_id,description) values(v_id,v_user,trim(p_collateral));
 end if;
 return v_id;
end $function$;
CREATE OR REPLACE FUNCTION public.cy_create_monthly_loan(p_client_id uuid, p_principal numeric, p_monthly_rate numeric, p_months integer, p_installments integer, p_final_due date, p_currency text DEFAULT 'PEN'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_total numeric;v_total_pct numeric;v_loan uuid;v_due date;v_amount numeric;v_previous numeric:=0;v_n int;
begin
if v_user is null or not (select cc_internal.can_manage_cy(v_user)) then raise exception 'Suscripcion Cobra Ya inactiva';end if;
if not exists(select 1 from public.cy_clients where id=p_client_id and owner_id=v_user) then raise exception 'Cliente no autorizado';end if;
if p_principal is null or p_principal<=0 or p_principal>100000000 then raise exception 'Capital invalido';end if;
if p_monthly_rate is null or p_monthly_rate<0 or p_monthly_rate>100 then raise exception 'La tasa mensual debe estar entre 0 y 100';end if;
if p_months is null or p_months<1 or p_months>120 then raise exception 'El plazo debe estar entre 1 y 120 meses';end if;
if p_installments is null or p_installments<1 or p_installments>360 then raise exception 'Cuotas fuera de rango';end if;
if p_final_due is null or p_final_due<=current_date then raise exception 'Indique vencimiento futuro';end if;
v_total_pct:=p_monthly_rate*p_months;
v_total:=round(p_principal*(1+v_total_pct/100),2);
insert into public.cy_loans(owner_id,client_id,principal,interest_rate,monthly_interest_rate,duration_months,term_installments,currency,issued_on,first_due_on,interval_months,calculation_method)
values(v_user,p_client_id,p_principal,v_total_pct,p_monthly_rate,p_months,p_installments,p_currency,current_date,
(current_date+greatest(1,round((p_final_due-current_date)::numeric/p_installments)::int))::date,1,'FLAT_SIMPLE')
returning id into v_loan;
for v_n in 1..p_installments loop
v_due:=(current_date+round(((p_final_due-current_date)::numeric*v_n)/p_installments)::int)::date;
if v_n=p_installments then v_amount:=v_total-v_previous;else v_amount:=round(v_total/p_installments,2);end if;
insert into public.cy_installments(loan_id,owner_id,installment_number,due_on,amount) values(v_loan,v_user,v_n,v_due,v_amount);
v_previous:=v_previous+v_amount;
end loop;
return v_loan;
end $function$;
CREATE OR REPLACE FUNCTION public.cy_correct_loan(p_loan_id uuid, p_principal numeric, p_monthly_rate numeric, p_months integer, p_due_on date, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_user uuid := auth.uid();
 v_loan public.cy_loans%rowtype;
 v_paid numeric;
 v_applied numeric;
 v_total numeric;
 v_remaining numeric;
 v_base numeric;
 v_count integer;
 v_id uuid;
begin
 if v_user is null or not cc_internal.can_manage_cy(v_user) then
   raise exception 'Cobra Ya no está activo';
 end if;
 select * into v_loan from public.cy_loans
 where id=p_loan_id and owner_id=v_user for update;
 if not found or v_loan.status <> 'ACTIVE' then
   raise exception 'Préstamo no editable';
 end if;
 if p_principal is null or p_principal<=0 or p_principal>100000000 then
   raise exception 'Capital inválido';
 end if;
 if p_monthly_rate is null or p_monthly_rate<0 or p_monthly_rate>100 then
   raise exception 'Interés mensual inválido';
 end if;
 if p_months is null or p_months<1 or p_months>120 then
   raise exception 'Plazo inválido';
 end if;
 if p_due_on is null then raise exception 'Vencimiento obligatorio'; end if;
 if length(trim(coalesce(p_reason,'')))<3 or length(p_reason)>500 then
   raise exception 'Indica el motivo de la corrección';
 end if;

 v_total := round(p_principal*(1+(p_monthly_rate*p_months)/100),2);
 select coalesce(sum(amount),0) into v_paid
 from public.cy_payments where loan_id=p_loan_id;
 select coalesce(sum(paid_total),0) into v_applied
 from public.cy_installments where loan_id=p_loan_id;
 if abs(v_paid-v_applied)>0.005 then
   raise exception 'Hay diferencias entre abonos y cuotas: requiere revisión';
 end if;
 if v_total<v_paid then
   raise exception 'El total corregido no puede ser inferior a los abonos registrados';
 end if;
 if not exists(select 1 from public.cy_installments where loan_id=p_loan_id) then
   raise exception 'El préstamo no tiene cronograma';
 end if;
 if exists (
   select 1 from public.cy_installments
   where loan_id=p_loan_id and
     installment_number < (select max(installment_number) from public.cy_installments where loan_id=p_loan_id)
     and due_on>p_due_on
 ) then raise exception 'El nuevo vencimiento debe ser posterior a las cuotas anteriores'; end if;

 v_remaining := v_total-v_paid;
 select count(*) into v_count
 from public.cy_installments i
 where i.loan_id=p_loan_id and
   (i.paid_total<i.amount or i.installment_number =
     (select max(installment_number) from public.cy_installments where loan_id=p_loan_id));
 if v_count<1 then raise exception 'Cronograma sin cuotas ajustables'; end if;
 v_base:=trunc(v_remaining/v_count,2);

 insert into public.cy_loan_corrections
 (loan_id,owner_id,principal,monthly_rate,duration_months,due_on,total_due,reason)
 values(p_loan_id,v_user,p_principal,p_monthly_rate,p_months,p_due_on,v_total,p_reason)
 returning id into v_id;

 with candidates as (
   select i.id,i.paid_total,
          row_number() over (order by i.installment_number,i.id) rn
   from public.cy_installments i
   where i.loan_id=p_loan_id and
     (i.paid_total<i.amount or i.installment_number =
       (select max(installment_number) from public.cy_installments where loan_id=p_loan_id))
 ), revised as (
   select id,paid_total,
       paid_total + case when rn<v_count
         then v_base
         else v_remaining-v_base*(v_count-1)
       end as new_amount
   from candidates
 )
 update public.cy_installments i
 set amount=r.new_amount,
     status=case
       when r.new_amount<=r.paid_total then 'PAID'
       when r.paid_total>0 then 'PARTIAL'
       else 'PENDING'
     end
 from revised r where i.id=r.id;

 update public.cy_installments
 set due_on=p_due_on
 where id=(select id from public.cy_installments
           where loan_id=p_loan_id
           order by installment_number desc,id desc limit 1);

 if (select coalesce(sum(amount),0) from public.cy_installments where loan_id=p_loan_id) <> v_total then
   raise exception 'No se pudo cuadrar el cronograma corregido';
 end if;

 update public.cy_loans set duration_months=p_months, monthly_interest_rate=p_monthly_rate
 where id=p_loan_id and owner_id=v_user;
 return v_id;
end;
$function$;CREATE OR REPLACE FUNCTION public.cy_close_paid_loan(p_loan_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_total numeric;v_paid numeric;v_status text;
begin
 if v_user is null or not cc_internal.can_manage_cy(v_user) then raise exception 'Cobra Ya no está activo';end if;
 select l.status,coalesce((select c.total_due from public.cy_loan_corrections c where c.loan_id=l.id order by c.created_at desc,c.id desc limit 1),l.total_due)
 into v_status,v_total from public.cy_loans l where l.id=p_loan_id and l.owner_id=v_user for update;
 if not found then raise exception 'Préstamo no encontrado';end if;
 if v_status='CLOSED' then return true;end if;
 if v_status<>'ACTIVE' then raise exception 'Préstamo no activo';end if;
 select coalesce(sum(amount),0) into v_paid from public.cy_payments where loan_id=p_loan_id;
 if v_total-v_paid>0.005 then raise exception 'No puede finalizar: aún existe saldo pendiente';end if;
 update public.cy_loans set status='CLOSED' where id=p_loan_id and owner_id=v_user;
 return true;
end $function$;
CREATE OR REPLACE FUNCTION public.cy_extend_loan_months(p_loan_id uuid, p_added_months integer, p_reason text DEFAULT NULL::text)
 RETURNS TABLE(old_due_on date, new_due_on date, previous_months integer, total_months integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_loan public.cy_loans%rowtype;
  v_last public.cy_installments%rowtype;
  v_old_months integer;
  v_new_due date;
  v_due numeric;
  v_paid numeric;
BEGIN
  IF v_user IS NULL OR NOT cc_internal.can_manage_cy(v_user) THEN
    RAISE EXCEPTION 'Suscripción COBRA YA no vigente';
  END IF;
  IF p_added_months IS NULL OR p_added_months < 1 OR p_added_months > 12 THEN
    RAISE EXCEPTION 'Ampliación permitida: entre 1 y 12 meses';
  END IF;
  IF length(coalesce(p_reason,'')) > 500 THEN
    RAISE EXCEPTION 'Motivo demasiado largo';
  END IF;

  SELECT * INTO v_loan FROM public.cy_loans
  WHERE id=p_loan_id AND owner_id=v_user FOR UPDATE;
  IF NOT FOUND OR v_loan.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Préstamo no disponible para ampliar';
  END IF;

  SELECT * INTO v_last FROM public.cy_installments
  WHERE loan_id=p_loan_id
  ORDER BY due_on DESC, installment_number DESC, id DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No existe cronograma'; END IF;

  SELECT coalesce((SELECT corr.total_due
      FROM public.cy_loan_corrections corr
      WHERE corr.loan_id=p_loan_id
      ORDER BY corr.created_at DESC,corr.id DESC LIMIT 1),v_loan.total_due)
  INTO v_due;
  SELECT coalesce(sum(amount),0) INTO v_paid
  FROM public.cy_payments WHERE loan_id=p_loan_id;
  IF v_due IS NULL OR v_paid >= v_due - 0.005 THEN
    RAISE EXCEPTION 'El préstamo ya está pagado o su importe es inválido';
  END IF;

  v_old_months := coalesce(v_loan.duration_months,1);
  IF v_old_months < 1 OR v_old_months + p_added_months > 120 THEN
    RAISE EXCEPTION 'El plazo total no puede superar 120 meses';
  END IF;
  -- Se suman meses calendario a la fecha de vencimiento vigente.
  -- PostgreSQL ajusta el último día del mes cuando corresponde.
  v_new_due := (v_last.due_on + pg_catalog.make_interval(months => p_added_months))::date;

  UPDATE public.cy_installments
  SET due_on=v_new_due
  WHERE id=v_last.id;
  UPDATE public.cy_loans
  SET duration_months=v_old_months+p_added_months,
      first_due_on=CASE WHEN term_installments=1 THEN v_new_due ELSE first_due_on END
  WHERE id=p_loan_id AND owner_id=v_user;
  INSERT INTO public.cy_loan_extensions(
    loan_id,owner_id,old_due_on,new_due_on,old_months,new_months,reason
  ) VALUES (
    p_loan_id,v_user,v_last.due_on,v_new_due,
    v_old_months,v_old_months+p_added_months,left(coalesce(p_reason,''),500)
  );
  RETURN QUERY SELECT v_last.due_on,v_new_due,v_old_months,v_old_months+p_added_months;
END
$function$;CREATE OR REPLACE FUNCTION cc_internal.lock_cy_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin raise exception 'Los registros financieros se modifican mediante operaciones controladas'; end; $function$;
CREATE TRIGGER cy_payments_lock BEFORE DELETE OR UPDATE ON public.cy_payments FOR EACH ROW EXECUTE FUNCTION cc_internal.lock_cy_immutable();
