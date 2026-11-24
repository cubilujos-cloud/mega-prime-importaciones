(()=>{
 const workspace=document.getElementById('workspace');if(!workspace)return;
 const tab=document.createElement('section');tab.className='tab';tab.id='calculatorTab';tab.hidden=true;const title=document.createElement('h1');title.textContent='Calculadora interna de materiales';const info=document.createElement('p');info.textContent='Herramienta para el equipo autorizado. Confirma las medidas y fichas técnicas antes de usar los resultados.';tab.append(title,info);workspace.append(tab);let frame;
 const content=()=>{document.querySelectorAll('#workspace .tab').forEach(t=>t.hidden=t.id!=='contentTab')};
 const buttonNode=button('▦ Calculadora interna',()=>{if(!window.MP_can?.('use_calculator')){say('No tienes permiso para usar la calculadora interna.');return}document.querySelectorAll('#workspace .tab').forEach(t=>t.hidden=t!==tab);if(!frame){frame=document.createElement('iframe');frame.title='Calculadora interna de materiales';frame.src='index.html?tool=calculator';frame.style.height='85vh';tab.append(frame)}});buttonNode.dataset.permission='use_calculator';buttonNode.hidden=!window.MP_can?.('use_calculator');document.querySelector('#workspace nav').append(buttonNode);const syncAccess=()=>{const allowed=!!window.MP_can?.('use_calculator');buttonNode.hidden=!allowed;if(!allowed){const wasOpen=!!frame||!tab.hidden;if(frame){frame.remove();frame=null}tab.hidden=true;if(wasOpen)content()}};window.addEventListener('mp:permissions',syncAccess);window.addEventListener('mp:draft-changed',syncAccess);syncAccess();
 const settingsTab=document.createElement('section');
 settingsTab.className='tab';settingsTab.id='calculatorSettingsTab';settingsTab.hidden=true;
 workspace.append(settingsTab);
 let settingsFrame;
 window.mpiCalculadoraSesion=async()=>{
  if(!MP_can('manage_visibility')||!MP.session)return null;
  const role=await MP.request('/rest/v1/rpc/staff_role',{method:'POST',body:{}});
  return role==='owner'?MP.session?.access_token||null:null;
 };
 const settingsButton=button('Administrar calculadora',()=>{
  if(!MP_can('manage_visibility'))return;
  document.querySelectorAll('#workspace .tab').forEach(section=>section.hidden=section!==settingsTab);
  if(!settingsFrame){
   settingsFrame=document.createElement('iframe');
   settingsFrame.title='Administrar calculadora de materiales';
   settingsFrame.src='calculadora-mpi/Calculadora_Mega_Prime_Unificada.html?web&admin&v=2';
   settingsFrame.style.cssText='width:100%;height:85vh';
   settingsTab.append(settingsFrame);
  }
 });
 settingsButton.dataset.permission='manage_visibility';
 document.querySelector('#workspace nav').append(settingsButton);
 const syncSettings=()=>{
  const allowed=!!MP_can('manage_visibility');
  settingsButton.hidden=!allowed;
  if(!allowed&&settingsFrame){settingsFrame.remove();settingsFrame=null;if(!settingsTab.hidden)content()}
 };
 syncSettings();
 window.addEventListener('mp:permissions',syncSettings);
 window.addEventListener('mp:draft-changed',syncSettings);
 window.addEventListener('mp:session-locked',()=>{settingsFrame?.remove();settingsFrame=null;settingsTab.hidden=true});
 window.addEventListener('mp:session-locked',()=>{if(frame){frame.remove();frame=null}});
 window.addEventListener('message',e=>{if(e.origin===location.origin&&frame&&e.source===frame.contentWindow&&e.data?.type==='mp:close-calculator'){content();frame.remove();frame=null}});
})();

/* La calculadora se almacena en un bucket privado y nunca se despliega en Pages. */
(()=>{
 const workspace=document.getElementById('workspace');
 if(!workspace)return;
 const label='calculadora preliquidación';
 const tab=document.createElement('section');
 tab.className='tab';
 tab.id='privatePreliquidationTab';
 tab.hidden=true;
 const heading=document.createElement('h1');
 heading.textContent=label;
 const status=document.createElement('p');
 status.setAttribute('role','status');
 const retry=button('Volver a intentar',open);
 retry.hidden=true;
 tab.append(heading,status,retry);
 workspace.append(tab);

 let frame,documentUrl,allowedAccount,checkingAccount,loading=false,generation=0;
 const ownerCandidate=()=>window.MP_can?.('manage_visibility')?MP.session?.user?.id:null;
 const isOwner=()=>!!allowedAccount&&allowedAccount===ownerCandidate();
 const control=button(label,open);
 control.hidden=true;
 workspace.querySelector('nav').append(control);
 function clear(){
  generation++;
  frame?.remove();
  if(documentUrl)URL.revokeObjectURL(documentUrl);
  documentUrl=null;
  frame=null;
  loading=false;
  tab.hidden=true;
  retry.hidden=true;
  status.textContent='';
 }
 async function sync(){
  const account=ownerCandidate();
  if(!account){
   allowedAccount=checkingAccount=null;
   control.hidden=true;
   clear();
   return;
  }
  if(checkingAccount===account)return;
  if(!isOwner()){
   allowedAccount=null;
   control.hidden=true;
   clear();
  }
  checkingAccount=account;
  try{
   const allowed=await MP.request('/rest/v1/rpc/preliquidation_owner_access',{method:'POST',body:{}});
   if(account!==ownerCandidate()||checkingAccount!==account)return;
   allowedAccount=allowed===true?account:null;
   control.hidden=!allowedAccount;
   if(!allowedAccount)clear();
  }catch{}finally{if(checkingAccount===account)checkingAccount=null}
 }
 async function open(){
  if(!isOwner())return;
  workspace.querySelectorAll('.tab').forEach(section=>section.hidden=section!==tab);
  if(frame||loading)return;
  loading=true;
  const request=++generation,account=MP.session.user.id;
  const active=()=>request===generation&&isOwner()&&account===MP.session.user.id;
  retry.hidden=true;
  status.textContent='Cargando calculadora privada…';
  try{
   const html=await MP.request('/storage/v1/object/authenticated/preliquidacion-privada/calculadora-preliquidacion.html');
   if(!active())return;
   if(typeof html!=='string'||!/^<!doctype html>/i.test(html.trimStart())||!/<head\b[^>]*>/i.test(html))throw Error('El archivo privado no es una página HTML válida.');
   const user=MP.session.user;
   const host=JSON.stringify({
    parentOrigin:location.origin,url:MP_CONFIG.url,publishableKey:MP_CONFIG.anonKey,user:{id:user.id,email:user.email}
   }).replace(/</g,'\\u003c');
   const bootstrap=`<script>
const host=${host};
window.MP_PRELIQ_HOST={
 url:host.url,publishableKey:host.publishableKey,user:host.user,
 getAccessToken(){
  return new Promise(resolve=>{
   const channel=new MessageChannel();
   const finish=token=>{clearTimeout(timeout);channel.port1.close();resolve(token)};
   const timeout=setTimeout(()=>finish(null),5000);
   channel.port1.onmessage=event=>finish(event.data);
   parent.postMessage({type:'mp:preliquidation-token'},host.parentOrigin,[channel.port2]);
  });
 },
 signOut(){parent.postMessage({type:'mp:preliquidation-logout'},host.parentOrigin)}
};
document.addEventListener('click',event=>{
 const link=event.target.closest?.('a[href^="#"]');
 if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||!link)return;
 const target=document.getElementById(link.getAttribute('href').slice(1));
 if(!target)return;
 event.preventDefault();
 target.scrollIntoView();
});
</script>`;
   const privateHtml=html.replace(/<head\b[^>]*>/i,head=>head+bootstrap);
   frame=document.createElement('iframe');
   frame.title=label;
   frame.setAttribute('sandbox','allow-scripts allow-downloads allow-modals allow-popups allow-popups-to-escape-sandbox');
   frame.referrerPolicy='no-referrer';
   frame.style.cssText='width:100%;height:85vh;border:0';
   documentUrl=URL.createObjectURL(new Blob([privateHtml],{type:'text/html'}));
   frame.src=documentUrl;
   tab.append(frame);
   status.textContent='';
  }catch(error){
   if(!active())return;
   status.textContent='No se pudo abrir la calculadora privada. '+error.message;
   retry.hidden=false;
  }finally{if(request===generation)loading=false}
 }
 window.addEventListener('mp:permissions',sync);
 window.addEventListener('mp:draft-changed',sync);
 window.addEventListener('mp:session-locked',()=>{
  allowedAccount=checkingAccount=null;
  control.hidden=true;
  clear();
 });
 window.addEventListener('message',event=>{
  if(!frame||event.source!==frame.contentWindow||event.origin!=='null'||!isOwner())return;
  if(event.data?.type==='mp:preliquidation-token'&&event.ports[0])event.ports[0].postMessage(MP.session.access_token);
  if(event.data?.type==='mp:preliquidation-logout')void MP.logout();
 });
 sync();
})();
