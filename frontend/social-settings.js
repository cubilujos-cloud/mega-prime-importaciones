'use strict';
window.MP_SOCIAL={
 platforms:['YouTube','Facebook','TikTok','X','Instagram','Threads','LinkedIn','Pinterest','Telegram','WhatsApp'],
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
 const details=document.createElement('details');details.innerHTML='<summary>Redes sociales: enlaces y visibilidad automática</summary><p>Pega los enlaces oficiales y pulsa Guardar y publicar redes sociales. Borra un enlace para retirar esa red del pie de página.</p><div id="socialRows"></div>';
 document.getElementById('contentTab').insertBefore(details,document.querySelector('#contentTab .editor'));let rows=[];
 function draw(){const host=$('socialRows');host.replaceChildren();for(const r of rows){const a=document.createElement('article'),name=document.createElement('input'),url=document.createElement('input');name.value=r.name;name.setAttribute('aria-label','Nombre de la red');name.oninput=()=>{r.name=name.value;edited()};url.type='url';url.value=r.url;url.placeholder='https://';url.setAttribute('aria-label','Enlace de '+r.name);const qr=document.createElement('div');let qrTimer;const refreshQr=()=>{qr.replaceChildren();if(r.url.trim())window.MP_buildQrTools?.(qr,r.url,r.name)};url.oninput=()=>{r.url=url.value;edited();clearTimeout(qrTimer);qrTimer=setTimeout(refreshQr,300)};a.append(name,url,button('Quitar enlace',()=>{r.url='';edited();draw()}));a.append(qr);refreshQr();host.append(a)}}
 function load(){
  rows=structuredClone(draft?.social?.items||[]).filter(r=>r&&typeof r==='object');
  for(const row of rows){row.name=String(row.name||'');row.url=String(row.url||'')}
  for(const name of MP_SOCIAL.platforms)if(!rows.some(r=>r.name===name))rows.push({name,url:'',visible:false});
  draw();
 }
 let hasEdits=false, publishing=false;
 function edited(){hasEdits=true}
 const publishNetworks=button('Guardar y publicar redes sociales',async()=>{
  if(publishing)return;
  if(!MP_can('edit_content'))throw Error('Tu cuenta no tiene permiso para editar redes sociales.');
  const items=rows.filter(r=>r.url.trim()).map(r=>{
   const name=r.name.trim(),url=MP_SOCIAL.profileUrl(r.url);
   if(!name||!url)throw Error('Escribe el nombre y un enlace HTTPS válido para '+(name||'la red social')+'.');
   return {...r,name,url,visible:true};
  });
  if(items.length>24)throw Error('Puedes publicar hasta 24 redes sociales.');
  const social={...MPI_CMS_DEFAULTS.social,...current.social,items};
  if(MP_can('manage_visibility'))social.visible=true;
  publishing=true;
  details.querySelectorAll('input,button').forEach(control=>control.disabled=true);
  try{
   await publishConfig({...current,social},'Enlaces de redes sociales');
   draft.social={...draft.social,visible:social.visible,items};
   hasEdits=false;
   fields();preview();
   say('Redes sociales publicadas en el pie de la página principal.');
  }finally{
   publishing=false;
   details.querySelectorAll('input,button').forEach(control=>control.disabled=false);
  }
 });
 details.append(button('Agregar otra red',()=>{edited();rows.push({name:'',url:'',visible:false});draw()}),publishNetworks);
 details.addEventListener('toggle',()=>{if(details.open&&!hasEdits)load()});
 window.addEventListener('mp:draft-changed',()=>{if(details.open&&!hasEdits)load()});
 window.addEventListener('mp:session-locked',()=>{hasEdits=false;rows=[];draw()});
 // Controles de estados y publicaciones sociales, sin cambiar el flujo existente de contenido.
 const extra=document.createElement('div');extra.innerHTML='<label>Procedencia<select id="postPlatform"><option value="web">Estado propio de la web</option><option value="whatsapp">Material propio compartido en WhatsApp</option><option value="tiktok">TikTok</option><option value="facebook">Facebook</option><option value="youtube">YouTube</option><option value="instagram">Instagram</option><option value="x">X</option><option value="other">Otra red</option></select></label><label>Enlace público de la publicación (opcional)<input id="postExternal" type="url" placeholder="https://..."></label><label><input id="postPinned" type="checkbox">Anclar arriba de los demás estados</label><p>Puedes subir tu propia foto o video, o añadir un enlace público. Los enlaces privados y los estados de WhatsApp no se convierten en videos públicos automáticamente.</p><div id="postSocialPreview"></div>';
 $('postsTab').insertBefore(extra,$('savePost'));extra.append(button('Previsualizar enlace externo',()=>{const target=$('postSocialPreview');target.replaceChildren();const url=MP_SOCIAL.url($('postExternal').value);if(!MP_SOCIAL.renderEmbed(target,url))target.textContent='Esta red se mostrará con un enlace para abrir la publicación.'}));
}
