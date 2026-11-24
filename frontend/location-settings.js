'use strict';
(()=>{
 const initial={address:'P9MQ+M65, Ambato, Ecuador',latitude:-1.2658647,longitude:-78.6118951};
 function point(lat,lng){
  if(lat==null||lng==null||lat===''||lng==='')return null;
  const latitude=Number(lat),longitude=Number(lng);
  return Number.isFinite(latitude)&&Number.isFinite(longitude)&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180?{latitude,longitude}:null;
 }
 function coordinates(text){
  const match=text.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  return match?point(match[1],match[2]):null;
 }
 function parse(raw){
  const value=String(raw||'').trim();
  if(!value||value.length>4000)throw Error('Escribe una dirección o pega un enlace de Google Maps.');
  let url;
  try{url=new URL(value)}catch{}
  if(!url)return {address:value,mapsUrl:'',...coordinates(value)};
  if(url.protocol!=='https:'||url.username||url.password)throw Error('Usa un enlace HTTPS de Google Maps.');
  const short=url.hostname==='maps.app.goo.gl'||(url.hostname==='goo.gl'&&url.pathname.startsWith('/maps/'));
  const maps=url.hostname==='maps.google.com'||(['www.google.com','google.com','www.google.com.ec','google.com.ec'].includes(url.hostname)&&/^\/maps(?:\/|$)/.test(url.pathname));
  if(!short&&!maps)throw Error('Pega el enlace de Google Maps del local o escribe su dirección.');
  let path=url.pathname;
  try{path=decodeURIComponent(path)}catch{}
  const terms=url.searchParams.get('query')||url.searchParams.get('q')||url.searchParams.get('destination')||'';
  const pinned=(path+url.search).match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const place=path.match(/\/place\/([^/]+)/)?.[1]?.replace(/\+/g,' ').trim()||'';
  const center=path.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const coords=(pinned&&point(pinned[1],pinned[2]))||coordinates(terms)||coordinates(place)||(!terms&&!place&&center&&point(center[1],center[2]));
  const address=terms||place||(coords?coords.latitude+', '+coords.longitude:'Ubicación en Google Maps');
  return {address,mapsUrl:short||(!coords&&!terms&&!place)?url.href:'',...coords};
 }
 function resolve(location={}){
  const addr=String(location.address||'').trim();
  const configured=point(location.latitude,location.longitude);
  const fallback=!location.mapsUrl&&!configured&&(!addr||/^ubicaci[oó]n (?:pendiente de|por) confirmar$/i.test(addr));
  const data=fallback?{...location,...initial}:location;
  const coords=point(data.latitude,data.longitude);
  const query=coords?coords.latitude+','+coords.longitude:data.address;
  const encoded=encodeURIComponent(query||'');
  const openUrl=data.mapsUrl||('https://www.google.com/maps/search/?api=1&query='+encoded);
  const embedUrl=!query||(data.mapsUrl&&data.address==='Ubicación en Google Maps')?'':'https://www.google.com/maps?q='+encoded+'&output=embed';
  let safeOpenUrl='';
  try{const url=new URL(openUrl);if(url.protocol==='https:'&&!url.username&&!url.password)safeOpenUrl=url.href}catch{}
  return {...data,openUrl:safeOpenUrl,embedUrl};
 }
 window.MP_LOCATION={resolve,parse};
 const tab=document.getElementById('contentTab');
 if(!tab)return;
 const editor=document.createElement('details');
 editor.id='mpLocationEditor';
 editor.dataset.permission='edit_content';
 editor.innerHTML='<summary>Dirección del local</summary><p id="mpLocationCurrent"></p><button type="button" id="mpLocationEdit">Modificar dirección</button><div id="mpLocationFields" hidden><label>Nueva dirección o enlace de Google Maps<input id="mpLocationAddress" type="text" autocomplete="off"></label><button type="button" id="mpLocationSave">Guardar y publicar dirección</button></div><p id="mpLocationStatus" role="status" aria-live="polite"></p>';
 tab.insertBefore(editor,tab.querySelector('.editor'));
 const currentAddress=$('mpLocationCurrent'),field=$('mpLocationAddress'),status=$('mpLocationStatus'),save=$('mpLocationSave');
 let source='',busy=false;
 function refresh(){currentAddress.textContent='Dirección actual: '+(resolve(current.location).address||'Pendiente de confirmar')}
 window.MP_openLocationEditor=()=>{editor.open=true;refresh();editor.scrollIntoView({behavior:'smooth',block:'start'})};
 editor.addEventListener('toggle',()=>{if(editor.open)refresh()});
 window.addEventListener('mp:draft-changed',()=>{if(editor.open)refresh()});
 $('mpLocationEdit').onclick=()=>{
  if(!MP_can('edit_content'))return;
  source=JSON.stringify(current.location||{});
  const location=resolve(current.location);
  field.value=location.mapsUrl||location.address||'';
  $('mpLocationFields').hidden=false;
  status.textContent='';
  field.focus();field.select();
 };
 save.onclick=async()=>{
  if(busy||!MP_can('edit_content'))return;
  busy=save.disabled=field.disabled=true;
  status.textContent='Publicando la dirección…';
  try{
   const place=parse(field.value);
   const latest=(await MP.table('content','?id=eq.1'))[0];
   if(!latest?.config||!Number.isInteger(latest.revision))throw Error('No se encontró la versión publicada.');
   if(source!==JSON.stringify(latest.config.location||{}))throw Error('La dirección cambió en otra sesión. Vuelve a abrir Modificar dirección.');
   const location={...latest.config.location,...place,latitude:place.latitude??null,longitude:place.longitude??null,visible:true};
   const footer={...latest.config.footer,location:location.address,address:''};
   const visibility={...latest.config.visibility,sections:{...latest.config.visibility?.sections,ubicacion:true}};
   const payload={...latest.config,location,footer,visibility},previous=current;
   await publishConfig(payload,'Dirección del local',latest.revision);
   const rebased=mergePublishedDraft(previous,draft,payload);
   draft={...rebased,location,footer:{...rebased.footer,location:footer.location,address:footer.address},visibility:{...rebased.visibility,sections:{...rebased.visibility?.sections,ubicacion:true}}};
   fields();preview();refresh();
   $('mpLocationFields').hidden=true;
   status.textContent='Dirección publicada en la página principal.';
  }catch(error){status.textContent=error.message||'No se pudo publicar la dirección.'}
  finally{busy=save.disabled=field.disabled=false}
 };
 window.addEventListener('mp:session-locked',()=>{editor.open=false;$('mpLocationFields').hidden=true;field.value=currentAddress.textContent=status.textContent='';source=''});
})();
