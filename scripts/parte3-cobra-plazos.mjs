// COBRA YA: plazo del préstamo separado de la cantidad de cuotas.
const ISO=/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const fmt=d=>d.toISOString().slice(0,10);
export function fechaHoyLima(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',
  year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=t=>parts.find(p=>p.type===t)?.value;
 return get('year')+'-'+get('month')+'-'+get('day');
}
export function calcularPlazoCobra({fechaInicio,unidad='MONTHS',valor=1,cuotas=1}){
 if(typeof fechaInicio!=='string'||!ISO.test(fechaInicio))throw Error('Fecha inicial no válida.');
 const start=new Date(fechaInicio+'T00:00:00.000Z');
 if(!Number.isFinite(start.getTime())||fmt(start)!==fechaInicio)throw Error('Fecha inicial no válida.');
 if(!Number.isInteger(valor)||!((unidad==='MONTHS'&&valor>=1&&valor<=4)
   ||(unidad==='DAYS'&&valor>=1&&valor<=365)))
  throw Error('Selecciona de 1 a 4 meses o entre 1 y 365 días.');
 if(!Number.isInteger(cuotas)||cuotas<1||cuotas>12)
  throw Error('Selecciona de 1 a 12 cuotas.');
 let due;
 if(unidad==='DAYS'){
  due=new Date(start);
  due.setUTCDate(due.getUTCDate()+valor);
 }else{
  const targetIndex=start.getUTCFullYear()*12+start.getUTCMonth()+valor;
  const year=Math.floor(targetIndex/12),month=targetIndex%12;
  const lastDay=new Date(Date.UTC(year,month+1,0)).getUTCDate();
  due=new Date(Date.UTC(year,month,Math.min(start.getUTCDate(),lastDay)));
 }
 const span=Math.round((due.getTime()-start.getTime())/86400000);
 if(cuotas>span)throw Error('No puede haber más cuotas que días de plazo.');
 const vencimientos=Array.from({length:cuotas},(_,i)=>{
  const date=new Date(start);
  date.setUTCDate(date.getUTCDate()+Math.ceil(span*(i+1)/cuotas));
  return fmt(date);
 });
 return Object.freeze({vencimientoFinal:fmt(due),vencimientos});
}
export function leerPlazoCobra({opcion='1',dias='',cuotas=1,fechaInicio}={}){
 const unidad=opcion==='days'?'DAYS':'MONTHS';
 const valor=unidad==='DAYS'?Number(dias):Number(opcion);
 if(unidad==='DAYS'&&(String(dias).trim()===''||!Number.isInteger(valor)))
  throw Error('Indica el número de días del préstamo.');
 const plan=calcularPlazoCobra({fechaInicio,unidad,valor,cuotas:Number(cuotas)});
 return {term_unit:unidad,term_value:valor,installments:Number(cuotas),...plan};
}
