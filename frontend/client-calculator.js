// Adaptador de la calculadora publica. La administración se abre desde el panel privado.
(()=>{
 if(new URLSearchParams(location.search).get('tool')==='calculator')return;
 let dialog,frame,returnFocus;
 function open(){
  returnFocus=document.activeElement;
  if(!dialog){
   dialog=document.createElement('dialog');dialog.id='mp-client-calculator';dialog.setAttribute('aria-label','Calculadora de materiales');
   dialog.style.cssText='width:98vw;max-width:none;height:96dvh;max-height:96dvh;padding:0;border:1px solid #d5af4b;border-radius:12px;background:#fff;overflow:hidden';
   const top=document.createElement('div');top.style.cssText='height:48px;display:flex;align-items:center;justify-content:flex-end;padding:4px 12px;background:#10212a';
   const close=document.createElement('button');close.type='button';close.textContent='\u2190 Cerrar y volver a la pagina';close.style.cssText='padding:8px 14px;border:0;border-radius:6px;background:#e8b94e;color:#10212a;font-weight:700;cursor:pointer';close.onclick=()=>dialog.close();top.append(close);dialog.append(top);document.body.append(dialog);
   dialog.addEventListener('close',()=>{frame?.remove();frame=null;returnFocus?.focus?.({preventScroll:true})});
  }
  if(dialog.open)return;
  frame=document.createElement('iframe');frame.title='Calculadora Mega Prime Importaciones';frame.src='calculadora-mpi/Calculadora_Mega_Prime_Unificada.html?web&v=2';frame.style.cssText='display:block;width:100%;height:calc(100% - 48px);border:0;background:#fff';dialog.append(frame);dialog.showModal();
 }
 const originalModal=window.openModal;
 window.openCalculator=open;
 if(typeof originalModal==='function')window.openModal=function(id,...args){if(id==='calcModal')return open();return originalModal.call(this,id,...args)};
})();
