'use strict';
window.MP_SOCIAL={
 platforms:['YouTube','Facebook','TikTok','X','Instagram','Threads','LinkedIn','Pinterest','Telegram'],
 profileUrl(raw){
  const value=String(raw??'').trim();
  if(!value||/[\s\\]/.test(value))return '';
  const address=/^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/?#]|$)/i.test(value)?'https://'+value:value;
  try{
   const url=new URL(address);
   return url.protocol==='https:'&&url.hostname.includes('.')&&!url.username&&!url.password?url.href:'';
  }catch{return ''}
 },
 url(raw){if(!raw.trim())return '';const u=new URL(raw.trim());if(u.protocol!=='https:'||u.username||u.password)throw Error('Los enlaces de redes deben usar HTTPS y no incluir credenciales');return u.href},
 embed(raw){let u;try{u=new URL(raw)}catch{return null}if(u.protocol!=='https:')return null;const host=u.hostname.replace(/^www\./,'');
  if(host==='tiktok.com'){const id=u.pathname.match(/\/(?:video|photo)\/(\d+)/)?.[1]||u.pathname.match(/\/player\/v1\/(\d+)/)?.[1];return id?{src:'https://www.tiktok.com/player/v1/'+id+'?description=1&autoplay=0',name:'TikTok'}:null}
  if(['youtube.com','m.youtube.com','youtu.be'].includes(host)){const id=host==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.match(/\/(?:shorts|embed)\/([\w-]+)/)?.[1];return /^[\w-]{11}$/.test(id||'')?{src:'https://www.youtube-nocookie.com/embed/'+id,name:'YouTube'}:null}
  if(['facebook.com','m.facebook.com'].includes(host)&&!u.pathname.includes('/stories/'))return {src:'https://www.facebook.com/plugins/post.php?href='+encodeURIComponent(u.href)+'&show_text=true&width=500',name:'Facebook'};
  return null
 },
 renderEmbed(container,url){const e=this.embed(url);if(!e)return false;const p=document.createElement('p');p.textContent='Contenido externo de '+e.name+'. Al cargarlo se conectará con esa red.';const b=document.createElement('button');b.textContent='Mostrar publicación de '+e.name;b.className='btn';b.onclick=()=>{const frame=document.createElement('iframe');frame.src=e.src;frame.title='Publicación de '+e.name;frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='fullscreen; picture-in-picture';frame.sandbox='allow-scripts allow-same-origin allow-popups allow-presentation';frame.className='mp-social-embed';container.replaceChildren(frame)};container.append(p,b);return true}
};
if(document.getElementById('contentTab')){
 const details=document.createElement('details');
 details.id='mpSocialEditor';
 details.dataset.permission='edit_content';
 details.innerHTML='<summary>Redes sociales del pie de página</summary><p>Guarda el enlace de cada red y pulsa Publicar cambios. También puedes guardar y publicar una sola red desde su fila.</p><div class="mp-social-actions"></div><p class="mp-social-status" role="status" aria-live="polite"></p><fieldset id="socialRows" aria-label="Enlaces de redes sociales"></fieldset>';
 document.getElementById('contentTab').insertBefore(details,document.querySelector('#contentTab .editor'));
 const host=$('socialRows'), status=details.querySelector('.mp-social-status');
 const actions=details.querySelector('.mp-social-actions');
 const footerActions=document.createElement('div');
 footerActions.className='mp-social-actions';
 details.append(footerActions);

 const nameKey=name=>String(name||'').trim().toLowerCase();
 const find=(items,name)=>items.find(item=>nameKey(item?.name)===nameKey(name));
 const snapshot=item=>item?{name:String(item.name||''),url:String(item.url||'').trim(),visible:!!String(item.url||'').trim()&&item.visible!==false}:null;
 const same=(a,b)=>JSON.stringify(a?.url?snapshot(a):null)===JSON.stringify(b?.url?snapshot(b):null);
 const itemsOf=config=>Array.isArray(config?.social?.items)?config.social.items:[];
 const usesContacts=()=>!!window.MP_CONTACTS?.list(current).length;
 const publishedSignature=()=>JSON.stringify([itemsOf(current),usesContacts()]);
 const savedKey=()=>MP.session?.user?.id?'mp_social_draft:'+MP_CONFIG.url+':'+MP.session.user.id:'';
 let rows=[], pending=new Map(), cacheKey='', busy=false, signature='';

 function tell(message,error=false){
  status.textContent=message;
  status.classList.toggle('mp-social-error',error);
 }
 function action(label,fn){
  const button=document.createElement('button');
  button.type='button';
  button.textContent=label;
  button.onclick=async()=>{
   try{await fn()}
   catch(error){tell(error.message||'No se pudo completar el cambio.',true)}
  };
  return button;
 }
 function store(next){
  if(!cacheKey)throw Error('Inicia sesión para guardar los enlaces.');
  try{
   if(next.size)localStorage.setItem(cacheKey,JSON.stringify([...next]));
   else localStorage.removeItem(cacheKey);
  }catch{throw Error('El navegador no pudo guardar el borrador de redes. Comprueba que permite el almacenamiento de este sitio.')}
  pending=next;
 }
 function loadPending(){
  cacheKey=savedKey();
  pending=new Map();
  if(!cacheKey)return;
  try{pending=new Map(JSON.parse(localStorage.getItem(cacheKey)||'[]'))}
  catch{tell('No se pudo recuperar el borrador de redes de este navegador.',true)}
 }
 function setRows(){
  const items=itemsOf(current).filter(item=>item&&nameKey(item.name)&&!(usesContacts()&&nameKey(item.name)==='whatsapp'));
  signature=publishedSignature();
  rows=MP_SOCIAL.platforms.map(name=>{
   const original=find(items,name);
   return {key:'name:'+nameKey(name),name,original,fixed:true};
  });
  for(const original of items){
   const key='name:'+nameKey(original.name);
   if(!rows.some(row=>row.key===key))rows.push({key,name:original.name,original});
  }
  for(const [key,change] of pending){
   if(!rows.some(row=>row.key===key))rows.push({key,name:change.base?.name||change.item?.name||'',original:change.base});
  }
  for(const row of rows){
   const change=pending.get(row.key);
   row.name=change?.item?.name||row.name;
   row.url=change?change.item?.url||'':row.original?.url||'';
   row.editing=!row.url;
  }
 }
 function updatePublishButtons(){
  for(const button of publishButtons)button.disabled=busy||!pending.size;
 }
 function stage(row,item){
  if(!MP_can('edit_content'))throw Error('Tu cuenta no tiene permiso para editar redes sociales.');
  const next=new Map(pending), base=pending.has(row.key)?pending.get(row.key).base:snapshot(row.original);
  if((!base?.url&&!item)||same(base,item))next.delete(row.key);
  else next.set(row.key,{base,item});
  store(next);
  return pending.get(row.key);
 }
 function save(row){
  const name=row.name.trim(), url=MP_SOCIAL.profileUrl(row.url);
  if(!name||name.length>80||!url||url.length>2000)throw Error('Escribe un nombre y un enlace HTTPS válido para '+(name||'la red social')+'.');
  if(rows.some(other=>other!==row&&nameKey(other.name)===nameKey(name)))throw Error('Ya hay una fila para '+name+'. Modifica el enlace en esa fila.');
  const change=stage(row,{name,url,visible:true});
  row.name=name;
  row.url=url;
  row.editing=false;
  row.dirty=false;
  tell(change?'Enlace de '+name+' guardado en este navegador. Pulsa Publicar cambios para mostrarlo en la página principal.':'El enlace de '+name+' ya está publicado.');
  return change;
 }
 function applyChanges(items,changes,check=false){
  const result=items.slice();
  for(const {base,item} of changes){
   const old=base?.name?find(result,base.name):null;
   const target=item?find(result,item.name):null;
   if(check){
    if((!old||old===target)&&same(target,item))continue;
    if(!same(old,base)||target&&target!==old)throw Error('El enlace de '+(base?.name||item.name)+' cambió en otra sesión. Revisa la versión publicada antes de volver a guardarlo.');
   }
   const existing=old||target;
   if(existing){
    const index=result.indexOf(existing);
    if(item)result[index]={...existing,...item};
    else result.splice(index,1);
   }else if(item)result.push(item);
  }
  return result;
 }
 async function publish(keys){
  if(busy||!keys.length)return;
  if(!MP_can('edit_content'))throw Error('Tu cuenta no tiene permiso para publicar enlaces.');
  const edits=keys.map(key=>pending.get(key)).filter(Boolean);
  if(!edits.length)return;
  const account=cacheKey;
  busy=true;
  host.disabled=true;
  add.disabled=true;
  updatePublishButtons();
  tell('Publicando enlaces en la página principal…');
  try{
   const latest=(await MP.table('content','?id=eq.1'))[0];
   if(!latest?.config||!Number.isInteger(latest.revision))throw Error('No se encontró la versión publicada de la página.');
   const items=applyChanges(itemsOf(latest.config),edits,true);
   if(items.filter(item=>item?.url).length>24)throw Error('Puedes publicar hasta 24 redes sociales.');
   if(account!==savedKey())throw Error('La sesión cambió. Vuelve a iniciar sesión para publicar.');
   const social={...MPI_CMS_DEFAULTS.social,...latest.config.social,items:items.filter(item=>item?.url)};
   if(MP_can('manage_visibility')&&edits.some(edit=>edit.item))social.visible=true;
   const payload={...latest.config,social}, previous=current;
   const pendingRows=rows.filter(row=>row.dirty&&!keys.includes(row.key));
   await publishConfig(payload,'Enlaces de redes sociales',latest.revision);
   if(account!==savedKey())return;
   const rebased=mergePublishedDraft(previous,draft,payload);
   draft={...rebased,social:{...rebased.social,visible:social.visible,items:applyChanges(itemsOf(rebased),edits)}};
   const next=new Map(pending);
   for(const key of keys)next.delete(key);
   try{store(next)}catch{pending=next}
   fields();
   preview();
   setRows();
   for(const row of pendingRows){
    const existing=rows.find(item=>item.key===row.key);
    if(existing)Object.assign(existing,{name:row.name,url:row.url,editing:true,dirty:true});
    else rows.push(row);
   }
   const hidden=social.visible===false||payload.footer?.visible===false;
   tell(hidden?'Cambios publicados. La sección de redes o el pie de página está oculto.':'Cambios publicados en el pie de la página principal.');
  }finally{
   busy=false;
   host.disabled=false;
   add.disabled=false;
   render();
  }
 }
 function render(){
  host.replaceChildren();
  for(const row of rows){
   const article=document.createElement('article'),title=document.createElement('h3');
   const name=document.createElement('input'),url=document.createElement('input');
   const controls=document.createElement('div'),state=document.createElement('p');
   controls.className='mp-social-actions';
   const label=row.name||'Nueva red social';
   title.textContent=label;
   name.value=row.name;
   name.placeholder='Nombre de la red';
   name.setAttribute('aria-label','Nombre de '+label);
   name.readOnly=!row.editing;
   name.oninput=()=>{row.name=name.value;row.dirty=true};
   url.type='url';
   url.value=row.url;
   url.placeholder='https://';
   url.setAttribute('aria-label','Enlace de '+label);
   url.readOnly=!row.editing;
   const saveButton=action('Guardar enlace',()=>{save(row);render()});
   saveButton.disabled=!row.editing;
   const modifyButton=action('Modificar enlace',()=>{
    row.editing=true;
    render();
    host.querySelectorAll('article')[rows.indexOf(row)]?.querySelector('input[type="url"]')?.focus();
   });
   modifyButton.disabled=row.editing;
   const publishButton=action('Guardar y publicar',async()=>{
    if(row.editing&&(row.url.trim()||!pending.has(row.key)))save(row);
    if(pending.has(row.key))await publish([row.key]);
    else{tell('El enlace de '+row.name+' ya está publicado.');render()}
   });
   publishButton.disabled=!row.editing&&!pending.has(row.key);
   const removeButton=action('Quitar enlace',()=>{
    const removal=stage(row,null);
    row.name=row.original?.name||row.name;
    row.url='';
    row.editing=true;
    row.dirty=false;
    tell(removal?'Retiro guardado. Pulsa Publicar cambios para quitar '+label+' de la página principal.':'Enlace eliminado del borrador.');
    render();
   });
   removeButton.disabled=!row.url&&!row.original?.url&&!pending.has(row.key);
   url.oninput=()=>{
    row.url=url.value;
    row.dirty=true;
    removeButton.disabled=!row.url&&!row.original?.url&&!pending.has(row.key);
   };
   const change=pending.get(row.key);
   state.textContent=change?(change.item?'Guardado · pendiente de publicar':'Retiro pendiente de publicar'):row.original?.url?(row.original.visible===false?'Oculto en la página principal':'Publicado'):'Sin enlace';
   controls.append(saveButton,modifyButton,publishButton,removeButton);
   if(change)controls.append(action('Descartar cambio',()=>{
    const next=new Map(pending);
    next.delete(row.key);
    store(next);
    if(row.original||row.fixed){
     row.name=row.original?.name||row.name;
     row.url=row.original?.url||'';
     row.editing=!row.url;
     row.dirty=false;
    }else rows=rows.filter(other=>other!==row);
    tell('Cambio descartado.');
    render();
   }));
   article.append(title);
   if(!row.fixed)article.append(name);
   article.append(url,controls,state);
   const valid=MP_SOCIAL.profileUrl(row.url);
   if(valid&&!row.editing){
    const qr=document.createElement('details'), summary=document.createElement('summary');
    summary.textContent='Código QR';
    qr.append(summary);
    qr.addEventListener('toggle',()=>{if(qr.open&&!qr.querySelector('.mp-qr-tools'))window.MP_buildQrTools?.(qr,valid,row.name)});
    article.append(qr);
   }
   host.append(article);
  }
  updatePublishButtons();
 }
 const add=action('Agregar otra red',()=>{rows.push({key:'new:'+crypto.randomUUID(),name:'',url:'',editing:true});render();host.lastElementChild?.querySelector('input')?.focus()});
 const publishButtons=[actions,footerActions].map(bar=>{
  const control=action('Publicar cambios',()=>publish([...pending.keys()]));
  bar.append(control);
  return control;
 });
 actions.append(add);
 const contacts=document.createElement('a');
 contacts.href='#mpContactEditor';
 contacts.textContent='Editar números de WhatsApp';
 contacts.onclick=event=>{
  if(!window.MP_openContacts)return;
  event.preventDefault();
  MP_openContacts();
 };
 actions.append(contacts);
 function sync(){
  if(!details.open||busy||!MP_can('edit_content'))return;
  if(cacheKey!==savedKey()){loadPending();setRows();render();return}
  if(signature!==publishedSignature()&&!rows.some(row=>row.dirty)){setRows();render()}
 }
 window.MP_openSocialEditor=()=>{
  if(!MP_can('edit_content'))return;
  details.open=true;
  sync();
  details.scrollIntoView({behavior:'smooth',block:'start'});
 };
 details.addEventListener('toggle',sync);
 window.addEventListener('mp:draft-changed',sync);
 window.addEventListener('mp:session-locked',()=>{
  cacheKey='';
  signature='';
  rows=[];
  pending=new Map();
  details.open=false;
  tell('');
  render();
 });
 // Controles de estados y publicaciones sociales, sin cambiar el flujo existente de contenido.
 const extra=document.createElement('div');extra.innerHTML='<label>Procedencia<select id="postPlatform"><option value="web">Estado propio de la web</option><option value="whatsapp">Material propio compartido en WhatsApp</option><option value="tiktok">TikTok</option><option value="facebook">Facebook</option><option value="youtube">YouTube</option><option value="instagram">Instagram</option><option value="x">X</option><option value="other">Otra red</option></select></label><label>Enlace público de la publicación (opcional)<input id="postExternal" type="url" placeholder="https://..."></label><label><input id="postPinned" type="checkbox">Anclar arriba de los demás estados</label><p>Puedes subir tu propia foto o video, o añadir un enlace público. Los enlaces privados y los estados de WhatsApp no se convierten en videos públicos automáticamente.</p><div id="postSocialPreview"></div>';
 $('postsTab').insertBefore(extra,$('savePost'));extra.append(button('Previsualizar enlace externo',()=>{const target=$('postSocialPreview');target.replaceChildren();const url=MP_SOCIAL.url($('postExternal').value);if(!MP_SOCIAL.renderEmbed(target,url))target.textContent='Esta red se mostrará con un enlace para abrir la publicación.'}));
}
