/* CLAN CARTAN V170 · Flyer por publicación STREAM BULL'S.
 * Formulario y listado originales: solo mejoras visuales con Storage/RPC,
 * nunca se crean productos duplicados ni se afectan saldos o pedidos.
 */
(function(){
 'use strict';
 const BUCKET='cc-stream-flyers', MAX_BYTES=5*1024*1024;
 const MIME_EXT={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
 const UUID='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
 const PATH_RE=new RegExp('^'+UUID+'/'+UUID+'/'+UUID+'\\.(jpg|jpeg|png|webp)$');
 const el=id=>document.getElementById(id);
 const dom=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
 const btn=(label,callback,cls)=>{const n=dom('button',cls,label);n.type='button';n.addEventListener('click',callback);return n;};
 const session=()=>window.CC_V53_SESSION;
 const api=(path,method,body)=>window.cc80?.api(path,method,body);
 const urlFor=path=>{
  if(typeof path!=='string'||!PATH_RE.test(path))return '';
  return 'https://pqalxtrcyrpmwqdlibqd.supabase.co/storage/v1/object/public/'+BUCKET+'/'+path;
 };
 const notice=message=>{
  const pane=el('cc166-content');
  if(!pane)return;
  let note=el('cc170-feedback');
  if(!note){note=dom('p','cc166-notice');note.id='cc170-feedback';note.setAttribute('role','status');pane.prepend(note);}
  note.textContent=message;
 };
 function validFile(file){
  if(!(file instanceof Blob)||!Object.prototype.hasOwnProperty.call(MIME_EXT,file.type))
    throw Error('Selecciona una imagen JPG, PNG o WebP.');
  if(!file.size||file.size>MAX_BYTES)throw Error('El flyer debe pesar menos de 5 MB.');
  return MIME_EXT[file.type];
 }
 async function inspectFile(file){
  const extension=validFile(file);
  const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());
  const isPng=bytes.length>=8&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n);
  const isJpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const isWebp=bytes.length>=12&&
    [82,73,70,70].every((n,i)=>bytes[i]===n)&&
    [87,69,66,80].every((n,i)=>bytes[8+i]===n);
  if(extension==='png'&&!isPng||extension==='jpg'&&!isJpg||extension==='webp'&&!isWebp)
    throw Error('El archivo no corresponde a una imagen válida de ese formato.');
  return extension;
 }
 function openPreview(url,alt){
  if(!url||!url.startsWith('https://pqalxtrcyrpmwqdlibqd.supabase.co/storage/v1/object/public/'+BUCKET+'/'))return;
  const dialog=dom('dialog','cc170-dialog');
  dialog.setAttribute('aria-label','Flyer ampliado: '+alt);
  const img=dom('img','cc170-dialog-image');img.src=url;img.alt=alt;
  img.loading='eager';
  const close=btn('✕ Cerrar imagen',()=>dialog.close(),'cc166-secondary cc170-close');
  dialog.append(close,img);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  document.body.append(dialog);
  if(typeof dialog.showModal==='function')dialog.showModal();
  else {dialog.setAttribute('open','');}
 }
 function visual(path,label){
  const url=urlFor(path);
  if(!url){
   const fallback=dom('span','cc170-placeholder',label||'Flyer no cargado');
   fallback.setAttribute('aria-label','Sin flyer, imagen predeterminada');
   return fallback;
  }
  const image=dom('img','cc170-image');image.src=url;image.alt='Flyer de '+label;
  image.loading='lazy';image.decoding='async';
  image.onerror=()=>{image.replaceWith(dom('span','cc170-placeholder',label||'Flyer no disponible'));};
  const open=btn('',()=>openPreview(url,'Flyer de '+label),'cc170-preview-trigger');
  open.setAttribute('aria-label','Ampliar flyer de '+label);
  open.title='Ampliar flyer';open.append(image);return open;
 }
 function attachForm(form){
  if(!form||form.querySelector('#cc170-new-flyer'))return;
  const wrap=dom('div','cc170-upload-field');
  const label=dom('label','cc170-upload-label','Flyer o imagen principal (opcional)');
  const input=dom('input');input.type='file';input.name='flyer';input.id='cc170-new-flyer';
  input.accept='image/jpeg,image/png,image/webp';
  label.append(input);
  const hint=dom('small','cc170-upload-hint','JPG, PNG o WebP · Máximo 5 MB. Si no subes imagen, el catálogo mostrará una portada por plataforma.');
  const preview=dom('div','cc170-upload-preview');
  preview.setAttribute('role','status');
  preview.append(dom('span','cc170-placeholder','Vista previa del flyer'));
  let objectUrl='';
  function drop(){
   if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl='';}
   preview.replaceChildren(dom('span','cc170-placeholder','Vista previa del flyer'));
  }
  const clear=btn('Quitar imagen',()=>{
   input.value='';drop();clear.hidden=true;
  },'cc166-secondary cc170-clear');
  clear.hidden=true;
  input.addEventListener('change',()=>{
   drop();const file=input.files?.[0];if(!file){clear.hidden=true;return;}
   try{
    validFile(file);
    objectUrl=URL.createObjectURL(file);
    const image=dom('img','cc170-image');image.src=objectUrl;
    image.alt='Vista previa de '+file.name;preview.replaceChildren(image);clear.hidden=false;
   }catch(e){input.value='';clear.hidden=true;notice(e.message);}
  });
  wrap.append(label,hint,preview,clear);
  const whatsapp=form.querySelector('[name="whatsapp"]')?.closest('label');
  if(whatsapp)whatsapp.after(wrap);else form.append(wrap);
 }
 async function upload(product,file){
  const extension=await inspectFile(file);
  const s=session(),id=product?.id,seller=product?.seller_id||s?.userId;
  if(!s?.jwt||!s.root||!s.key||!id||!seller||!window.crypto?.randomUUID)
   throw Error('Debes tener una sesión válida para subir el flyer.');
  if(!new RegExp('^'+UUID+'$').test(id)||!new RegExp('^'+UUID+'$').test(seller))
   throw Error('La publicación no tiene un identificador válido.');
  const token=s.jwt,userId=s.userId;
  const path=seller+'/'+id+'/'+window.crypto.randomUUID()+'.'+extension;
  const reply=await fetch(s.root+'/storage/v1/object/'+BUCKET+'/'+path,{
   method:'POST',
   headers:{apikey:s.key,Authorization:'Bearer '+token,'Content-Type':file.type,'x-upsert':'false'},
   body:file
  });
  if(!reply.ok){
   let message='No se pudo subir la imagen.';
   try{const body=await reply.json();message=body.message||body.error||message;}catch(_){}
   throw Error(message);
  }
  if(session()?.jwt!==token||session()?.userId!==userId)
   throw Error('La sesión cambió durante la carga; actualiza el panel.');
  const result=await api('rpc/cc_portal_set_stream_product_flyer','POST',{
   p_product_id:id,p_flyer_path:path
  });
  if(!result?.updated||result.flyer_path!==path)
   throw Error('Se subió la imagen pero no se vinculó al producto. Reintenta desde tus publicaciones.');
  return result;
 }
 function decorateRow(row,product){
  if(!row||row.querySelector('.cc170-row-flyer'))return;
  const area=dom('div','cc170-row-flyer');
  area.append(visual(product.flyer_path,product.title));
  const uploadControl=dom('input');uploadControl.type='file';uploadControl.accept='image/jpeg,image/png,image/webp';
  uploadControl.className='cc170-row-file';uploadControl.setAttribute('aria-label','Cambiar flyer de '+product.title);
  const change=btn(product.flyer_path?'Cambiar flyer':'Añadir flyer',()=>uploadControl.click(),'cc166-secondary cc170-change');
  change.disabled=false;
  uploadControl.addEventListener('change',async()=>{
   const file=uploadControl.files?.[0];
   if(!file)return;
   try{
    await inspectFile(file);change.disabled=true;change.textContent='Subiendo…';
    await upload(product,file);
    await window.cc166RefreshPanel?.();
    notice('Flyer actualizado. Ya aparece en el catálogo público.');
    window.cc169RefreshCatalog?.();
   }catch(e){
    notice('No se cambió el flyer: '+String(e?.message||e));
    change.disabled=false;change.textContent=product.flyer_path?'Cambiar flyer':'Añadir flyer';
   }finally{uploadControl.value='';}
  });
  area.append(change,uploadControl);
  row.prepend(area);
 }
 // Evita depender del orden de los scripts cargados dinámicamente.
 function sync(){
  const form=el('cc166-publish-form');if(form)attachForm(form);
 }
 function init(){
  sync();let queued=false;
  new MutationObserver(()=>{
   if(queued)return;queued=true;
   requestAnimationFrame(()=>{queued=false;sync();});
  }).observe(document.body,{childList:true,subtree:true});
 }
 window.cc170Flyers=Object.freeze({
  attachForm,decorateRow,upload,inspectFile,urlFor,openPreview,visual
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
