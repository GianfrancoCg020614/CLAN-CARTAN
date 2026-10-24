import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calcularPlazoCobra,leerPlazoCobra,fechaHoyLima} from './parte3-cobra-plazos.mjs';
test('por defecto 1 mes y 1 cuota',()=>{
 const plan=leerPlazoCobra({fechaInicio:'2026-10-24'});
 assert.deepEqual(plan,{term_unit:'MONTHS',term_value:1,installments:1,
  vencimientoFinal:'2026-11-24',vencimientos:['2026-11-24']});
});
test('1, 2, 3, 4 meses: una cuota final en cada plazo',()=>{
 const dates=['2026-11-24','2026-12-24','2027-01-24','2027-02-24'];
 for(let month=1;month<=4;month++){
  const p=calcularPlazoCobra({fechaInicio:'2026-10-24',unidad:'MONTHS',valor:month,cuotas:1});
  assert.equal(p.vencimientoFinal,dates[month-1]);
  assert.deepEqual(p.vencimientos,[dates[month-1]]);
 }
});
test('días manuales mantienen plazo exacto sin imponer meses',()=>{
 const p=leerPlazoCobra({fechaInicio:'2026-10-24',opcion:'days',dias:'17',cuotas:1});
 assert.equal(p.vencimientoFinal,'2026-11-10');
 assert.equal(p.term_value,17);
});
test('cuatro meses con tres cuotas reparte el cronograma dentro del plazo',()=>{
 const p=calcularPlazoCobra({fechaInicio:'2026-10-24',unidad:'MONTHS',valor:4,cuotas:3});
 assert.equal(p.vencimientos.length,3);
 assert.equal(p.vencimientos.at(-1),'2027-02-24');
 assert.ok(p.vencimientos[0]<p.vencimientos[1]);
});
test('meses con 31 días y años bisiestos no desbordan la fecha',()=>{
 assert.equal(calcularPlazoCobra({fechaInicio:'2026-01-31',unidad:'MONTHS',valor:1}).vencimientoFinal,'2026-02-28');
 assert.equal(calcularPlazoCobra({fechaInicio:'2024-01-31',unidad:'MONTHS',valor:1}).vencimientoFinal,'2024-02-29');
});
test('cuotas excedentes y plazos fuera de rango no se aceptan',()=>{
 assert.throws(()=>calcularPlazoCobra({fechaInicio:'2026-10-24',unidad:'DAYS',valor:1,cuotas:2}),/más cuotas/);
 assert.throws(()=>calcularPlazoCobra({fechaInicio:'2026-10-24',unidad:'MONTHS',valor:5}),/Selecciona/);
 assert.throws(()=>leerPlazoCobra({fechaInicio:'2026-10-24',opcion:'days',dias:''}),/Indica/);
 assert.throws(()=>leerPlazoCobra({fechaInicio:'2026-10-24',opcion:'days',dias:'1.5'}),/Indica/);
});
test('fecha local de Lima no coincide necesariamente con la UTC',()=>{
 const value=new Date('2026-10-24T03:00:00.000Z');
 assert.equal(fechaHoyLima(value),'2026-10-23');
});
