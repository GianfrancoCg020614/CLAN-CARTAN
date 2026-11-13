/* COBRA YA V372: deterministic presentation helpers; no API calls or financial writes. */
(() => {
'use strict';
const minor=value=>{const s=String(value??'');if(!/^\d+(?:\.\d+)?$/.test(s))throw Error('Importe no verificable.');const [whole,fraction='']=s.split('.');if(/[1-9]/.test(fraction.slice(2)))throw Error('El importe contiene fracciones no verificables.');return BigInt(whole)*100n+BigInt((fraction+'00').slice(0,2));};
const major=n=>{if(typeof n!=='bigint'||n<0n)throw Error('Importe inválido.');return `${n/100n}.${String(n%100n).padStart(2,'0')}`;};
const amount=(v,c)=>{if(!/^[A-Z]{3,5}$/.test(c||''))throw Error('Moneda no verificable.');const s=major(minor(v)),[a,b]=s.split('.');return `${({PEN:'S/',USD:'US$',EUR:'€'})[c]||c} ${a.replace(/\B(?=(\d{3})+(?!\d))/g,',')}.${b}`;};
function iso(value){const s=String(value||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(s+'T12:00:00Z').toISOString().slice(0,10)!==s)throw Error('Fecha no verificable.');return s;}
const date=v=>iso(v).split('-').reverse().join('/');
function todayAt(zone,now=new Date()){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const get=t=>parts.find(p=>p.type===t).value;return `${get('year')}-${get('month')}-${get('day')}`;}
function addDays(v,n){const d=new Date(iso(v)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
const loanCode=l=>l.loan_code||l.id;
function verifyLoan(l){
 if(!l?.id||!l.full_name||!loanCode(l)||!Array.isArray(l.installments)||!l.installments.length||l.status==='CANCELLED')throw Error('No se puede verificar el préstamo.');
 let total=0n,paid=0n;for(const i of l.installments){iso(i.due_on);const a=minor(i.amount),p=minor(i.paid_total);if(p>a)throw Error('El cronograma requiere revisión.');total+=a;paid+=p;}
 if(total!==minor(l.total_due)||paid!==minor(l.paid)||total-paid!==minor(l.balance))throw Error('Los importes del préstamo requieren revisión.');
 amount(l.balance,l.currency);return {total,paid,balance:total-paid};
}
function reminder(l,reference,bucket='auto'){
 const {balance}=verifyLoan(l),now=iso(reference),greeting=`👋 Hola, ${l.full_name}.`,code=`📄 Préstamo: ${loanCode(l)}`;
 if(balance===0n)return `🐍 COBRA YA!\n\n${greeting}\n\n🎉 ¡Préstamo cancelado por pago completo!\n${code}\n✅ Saldo pendiente: ${amount('0',l.currency)} ${l.currency}\n\nGracias por cumplir con tus pagos. 🤝\n\nwww.ClanCartan.com`;
 if(l.status!=='ACTIVE')throw Error('Este préstamo no admite recordatorios de cobro.');
 let pending=l.installments.filter(i=>minor(i.amount)>minor(i.paid_total)).sort((a,b)=>a.due_on.localeCompare(b.due_on)||a.installment_number-b.installment_number);
 if(bucket==='auto')bucket=pending[0].due_on<now?'late':pending[0].due_on===now?'today':'next';
 const next=pending[0].due_on;
 pending=pending.filter(i=>bucket==='late'?i.due_on<now:bucket==='today'?i.due_on===now:bucket==='tomorrow'?i.due_on===addDays(now,1):bucket==='soon'?i.due_on>now&&i.due_on<=addDays(now,7):bucket==='next'?i.due_on===next:false);
 if(!pending.length)throw Error('No hay cuotas pendientes en este periodo. Actualiza la agenda.');
 const sum=pending.reduce((s,i)=>s+minor(i.amount)-minor(i.paid_total),0n),first=pending[0].due_on,last=pending[pending.length-1].due_on,late=bucket==='late';
 const heading=late?`⚠️ Tienes ${pending.length===1?'una cuota pendiente':'cuotas pendientes'}.`:`📅 ${pending.length===1?'Recordatorio de tu próxima cuota.':'Recordatorio de tus próximas cuotas.'}`;
 const dates=first===last?`📅 ${late?'Venció':'Vence'}: ${date(first)}`:`📅 Vencimientos: ${date(first)} al ${date(last)}`;
 return `🐍 COBRA YA!\n\n${greeting}\n\n${heading}\n${code}\n${dates}\n💰 ${late?'Pendiente':'Importe pendiente'}: ${amount(major(sum),l.currency)} ${l.currency}\n\n${late?'Por favor, comunícate para regularizar tu pago.':'Por favor, realiza tu pago en la fecha indicada.'}\n\n${late?'Gracias por tu atención.':'¡Gracias por tu puntualidad!'} 🤝\n\nwww.ClanCartan.com`;
}
function receiptLines(r){
 if(!r?.id||!r.full_name||!r.loan_id||r.status!=='Registrado'||r.internal_receipt!==true||!r.balance_as_of||!Number.isFinite(Date.parse(r.balance_as_of))||minor(r.amount)<=0n)throw Error('Comprobante no verificable.');
 return [['Operación',r.id],['Cliente',r.full_name],['Préstamo',r.loan_code||r.loan_id],['Fecha del abono',date(r.paid_on)],['Moneda',r.currency],['Importe recibido',amount(r.amount,r.currency)],['Medio de pago',r.payment_method||'No registrado'],['Estado del abono',r.status],['Saldo actual al consultar',amount(r.current_balance,r.currency)],['Consulta del saldo',r.balance_as_of]];
}
function receiptMessage(r){receiptLines(r);return `🐍 COBRA YA!\n\n✅ Abono registrado correctamente.\n\n👤 Cliente: ${r.full_name}\n📄 Préstamo: ${r.loan_code||r.loan_id}\n🧾 Operación: ${r.id}\n💰 Abono: ${amount(r.amount,r.currency)} ${r.currency}\n📅 Fecha: ${date(r.paid_on)}\n💳 Saldo actual al consultar: ${amount(r.current_balance,r.currency)} ${r.currency}\n\nGracias por tu pago. 🤝\n\nComprobante interno de abono; no es comprobante tributario.\n\nwww.ClanCartan.com`;}
function whatsappLink(phone,text){const number=String(phone||'').replace(/\D/g,'');return /^\d{8,15}$/.test(number)?`https://wa.me/${number}?text=${encodeURIComponent(text)}`:null;}
function jpegPdf(jpeg,width,height){
 const enc=new TextEncoder(),parts=[],offsets=[0];let size=0;const append=v=>{const b=typeof v==='string'?enc.encode(v):v;parts.push(b);size+=b.length;};
 append('%PDF-1.4\n');const obj=(n,s)=>{offsets[n]=size;append(`${n} 0 obj\n${s}\nendobj\n`);};
 obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
 offsets[4]=size;append(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);append(jpeg);append('\nendstream\nendobj\n');
 const stream='q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ\n';obj(5,`<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}endstream`);
 const start=size;append('xref\n0 6\n0000000000 65535 f \n');for(let i=1;i<=5;i++)append(String(offsets[i]).padStart(10,'0')+' 00000 n \n');append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);return new Blob(parts,{type:'application/pdf'});
}
async function receiptPdf(r){
 const lines=receiptLines(r),canvas=document.createElement('canvas');canvas.width=1190;canvas.height=1684;const c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#15102d';c.fillRect(0,0,1190,210);
 const logo=new Image();logo.src='/assets/logo-cobraya-v304.avif';await logo.decode();c.drawImage(logo,65,25,160,150);c.fillStyle='#fff';c.font='bold 54px sans-serif';c.fillText('🐍 COBRA YA!',260,100);c.font='28px sans-serif';c.fillText('Comprobante interno de abono',260,153);
 let y=280;function wrap(text,x,max,line){let row='';for(const word of String(text).split(/\s+/)){const trial=row?row+' '+word:word;if(c.measureText(trial).width>max&&row){c.fillText(row,x,y);y+=line;row=word;}else row=trial;}if(row)c.fillText(row,x,y);y+=line;}
 for(const [label,value] of lines){c.fillStyle='#625971';c.font='24px sans-serif';wrap(label,70,1050,32);c.fillStyle='#15102d';c.font=label==='Importe recibido'?'bold 38px sans-serif':'30px sans-serif';wrap(value,70,1050,38);y+=16;}
 c.fillStyle='#625971';c.font='23px sans-serif';y=Math.max(y+25,1390);wrap('Comprobante interno: no constituye un comprobante tributario autorizado. El saldo indicado corresponde al momento de la consulta, no a un saldo histórico reconstruido.',70,1050,32);y+=25;c.fillStyle='#6331a8';c.font='bold 30px sans-serif';wrap('www.ClanCartan.com',70,1050,36);
 const bytes=Uint8Array.from(atob(canvas.toDataURL('image/jpeg',0.95).split(',')[1]),v=>v.charCodeAt(0));return jpegPdf(bytes,canvas.width,canvas.height);
}
window.Cobra372=Object.freeze({minor,major,amount,iso,date,todayAt,addDays,verifyLoan,reminder,receiptLines,receiptMessage,whatsappLink,receiptPdf});
})();
