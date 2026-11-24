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
