/* V223 · Contacto oficial por WhatsApp solamente en portada y botón de regreso del acceso.
   Conserva todos los eventos, autorizaciones y formularios ya existentes. */
(function(){
  'use strict';
  const phone='51923319637';
  const message='¡Hola! 🔥 CLAN CARTAN 🔥 Tengo una consulta sobre su plataforma. ¿Podrían ayudarme, por favor?';
  const waUrl='https://wa.me/'+phone+'?text='+encodeURIComponent(message);
  const css=`
    #cc77home #cc223-whatsapp {
      box-sizing:border-box!important;position:fixed!important;
      right:clamp(15px,2vw,26px)!important;
      bottom:calc(18px + env(safe-area-inset-bottom,0px))!important;
      z-index:2147483627!important;display:flex!important;
      align-items:center!important;justify-content:center!important;
      width:64px!important;height:64px!important;
      border:2px solid #a0ffca!important;border-radius:50%!important;
      color:#fff!important;background:#20ca64!important;
      box-shadow:0 8px 28px rgba(0,0,0,.45),0 0 0 4px rgba(33,196,91,.15)!important;
      text-decoration:none!important;transition:transform .16s ease,filter .16s ease!important;
    }
    #cc77home #cc223-whatsapp:hover{transform:translateY(-3px)!important;filter:brightness(1.08)!important}
    #cc77home #cc223-whatsapp:focus-visible{outline:3px solid white!important;outline-offset:4px!important}
    #cc77home #cc223-whatsapp svg{display:block!important;width:36px!important;height:36px!important;fill:currentColor!important}
    #cc77home #cc223-whatsapp::after{
      content:'Contactar al ADMIN';position:absolute;right:74px;top:50%;
      transform:translateY(-50%);background:#091d29;color:#fff;
      border:1px solid #40d784;padding:9px 12px;border-radius:10px;
      white-space:nowrap;box-shadow:0 7px 18px #0008;font:750 13px system-ui;
      opacity:0;pointer-events:none;transition:opacity .16s;
    }
    #cc77home #cc223-whatsapp:hover::after,
    #cc77home #cc223-whatsapp:focus-visible::after{opacity:1}
    #cc-real-login .cc-authbox{position:relative!important}
    #cc-real-login #cc223-auth-close{
      box-sizing:border-box!important;position:absolute!important;top:12px!important;right:12px!important;
      display:flex!important;align-items:center!important;justify-content:center!important;
      width:41px!important;height:41px!important;padding:0!important;margin:0!important;
      border:1px solid #59758b!important;border-radius:50%!important;
      background:#132c40!important;color:#e9faff!important;
      font:700 27px/1 system-ui!important;cursor:pointer!important;
    }
    #cc-real-login #cc223-auth-close:hover{background:#21465a!important}
    #cc-real-login #cc223-auth-close:focus-visible{outline:3px solid #2ce5e6!important;outline-offset:2px!important}
    #cc-real-login .cc-authbox>small:first-of-type{display:block;padding-right:52px}
    @media(max-width:590px){
      #cc77home #cc223-whatsapp{width:58px!important;height:58px!important;right:15px!important;
        bottom:calc(14px + env(safe-area-inset-bottom,0px))!important}
      #cc77home #cc223-whatsapp svg{width:33px!important;height:33px!important}
      #cc77home #cc223-whatsapp::after{display:none}
    }
    @media(prefers-reduced-motion:reduce){
      #cc77home #cc223-whatsapp{transition:none!important}
    }
  `;
  function mount(){
    if(!document.getElementById('cc223-contact-css')){
      const style=document.createElement('style');style.id='cc223-contact-css';style.textContent=css;document.head.appendChild(style);
    }
    const home=document.getElementById('cc77home');
    if(home&&!document.getElementById('cc223-whatsapp')){
      const link=document.createElement('a');
      link.id='cc223-whatsapp';
      link.href=waUrl;link.target='_blank';link.rel='noopener noreferrer';
      link.setAttribute('aria-label','Contactar al ADMIN por WhatsApp');
      link.title='Contactar al ADMIN por WhatsApp';
      link.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.52 3.48A11.84 11.84 0 0 0 12.04 0C5.47 0 .1 5.36.1 11.95c0 2.1.55 4.15 1.59 5.97L0 24l6.24-1.64a11.9 11.9 0 0 0 5.8 1.48h.01c6.6 0 11.95-5.36 11.95-11.95 0-3.19-1.25-6.19-3.48-8.41ZM12.04 21.8a9.8 9.8 0 0 1-5-1.37l-.36-.22-3.71.98.99-3.62-.24-.37a9.78 9.78 0 0 1-1.5-5.25c0-5.42 4.41-9.83 9.83-9.83 2.63 0 5.1 1.02 6.96 2.88a9.77 9.77 0 0 1 2.87 6.96c0 5.42-4.41 9.84-9.84 9.84Zm5.4-7.36c-.29-.15-1.72-.85-1.99-.94-.27-.1-.47-.15-.67.15-.2.3-.76.94-.93 1.14-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.37-1.47-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.3-.34.45-.52.15-.17.2-.3.3-.49.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.48-.5-.66-.51l-.56-.01c-.2 0-.52.07-.8.37-.27.29-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.1 4.5.71.31 1.26.49 1.69.63.71.23 1.35.2 1.86.12.57-.09 1.72-.7 1.96-1.38.24-.68.24-1.27.17-1.38-.07-.12-.26-.2-.55-.35Z"/></svg>';
      home.appendChild(link);
    }
    const box=document.querySelector('#cc-real-login .cc-authbox');
    if(box&&!document.getElementById('cc223-auth-close')){
      const close=document.createElement('button');
      close.id='cc223-auth-close';close.type='button';close.textContent='×';
      close.setAttribute('aria-label','Cerrar y volver a la portada');
      close.title='Cerrar';
      close.addEventListener('click',function(){
        if(typeof window.cc77Home==='function'){window.cc77Home();return;}
        const login=document.getElementById('cc-real-login');
        if(login)login.style.display='none';
        if(home)home.style.display='block';
        const back=document.getElementById('cc77back');if(back)back.style.display='none';
      });
      box.prepend(close);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
