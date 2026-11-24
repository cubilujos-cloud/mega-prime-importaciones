'use strict';
// El principal alimenta los botones generales. Cada contacto activo tiene su propio enlace.
window.MP_CONTACTS={
 normalize(raw){
  let number=String(raw??'').trim().replace(/[\s().-]/g,'').replace(/^00/,'+');
  if(/^0\d{9}$/.test(number))number='+593'+number.slice(1);
  if(/^593\d{9}$/.test(number))number='+'+number;
  if(!/^\+[1-9]\d{7,14}$/.test(number))throw Error('Usa código de país, por ejemplo +593963796222.');
  return number;
 },
 valid(raw){try{return this.normalize(raw)}catch{return ''}},
 synced(c){
  const raw=String(c?.whatsapp?.number||'').trim();
  return this.valid(raw)||(/^[1-9]\d{7,14}$/.test(raw)?'+'+raw:'');
 },
 list(c){
  const whatsapp=c?.whatsapp||{};
  const rows=(Array.isArray(whatsapp.numbers)?whatsapp.numbers:[]).filter(row=>row?.id&&String(row.number??'').trim()).map(row=>({
   ...row,number:this.valid(row.number)||String(row.number),enabled:row.enabled!==false
  }));
  const legacy=this.synced(c);
  if(legacy&&!rows.some(row=>this.valid(row.number)===legacy)){
   const keys=new Set(rows.map(row=>row.id));
   let id='principal';
   while(keys.has(id))id+='-legacy';
   rows.unshift({id,label:'WhatsApp principal',number:legacy,enabled:true});
  }
  return rows;
 },
 primary(c,rows=this.list(c)){
  const synced=this.synced(c);
  return rows.find(row=>row.enabled&&this.valid(row.number)===synced)?.id
   ||rows.find(row=>row.enabled&&row.id===c?.whatsapp?.primaryId)?.id
   ||rows.find(row=>row.enabled)?.id||'';
 },
 apply(c,rows,primaryId){
  if(rows.length>50)throw Error('Máximo 50 números de contacto.');
  const ids=new Set(),numbers=new Set();
  for(const row of rows){
   row.number=this.normalize(row.number);
   row.label=String(row.label||'WhatsApp').slice(0,60);
   if(!row.id||ids.has(row.id)||numbers.has(row.number))throw Error('No repitas números de WhatsApp.');
   ids.add(row.id);
   numbers.add(row.number);
  }
  const primary=rows.find(row=>row.id===primaryId&&row.enabled);
  if(rows.some(row=>row.enabled)&&!primary)throw Error('Selecciona un número activo como principal.');
  c.whatsapp={...c.whatsapp,numbers:rows,primaryId:primary?.id||'',number:primary?.number.replace('+','')||'',visible:!!primary};
  c.footer={...c.footer,phone:rows.filter(row=>row.enabled).map(row=>row.label+': '+row.number).join(' · ')};
  return c;
 }
};
if(document.getElementById('contentTab')){
 const panel=document.getElementById('contentTab');
 const details=document.createElement('details');
 details.id='mpContactEditor';
 details.className='mp-contact-settings';
 details.dataset.permission='edit_content';
 details.innerHTML='<summary>WhatsApp y correo comercial</summary><p>Edita los números existentes o escribe otro en una fila vacía. El número principal se usa en los botones generales. Para retirar un número, borra su campo y guarda los cambios.</p><label>Correo comercial<input id="businessEmail" type="email"></label><label>Mensaje inicial<textarea id="whatsappWelcome"></textarea></label><fieldset id="contactRows" aria-label="Números de WhatsApp"></fieldset><button type="button">Guardar y publicar</button><p class="mp-contact-status" role="status" aria-live="polite"></p>';
 panel.insertBefore(details,panel.querySelector('.editor'));
 const host=$('contactRows'), email=$('businessEmail'), welcome=$('whatsappWelcome');
 const save=details.querySelector(':scope > button'),status=details.querySelector('.mp-contact-status');
 const contactData=config=>({whatsapp:config?.whatsapp,email:config?.footer?.email});
 let rows=[],primary='',source='',dirty=false,busy=false;

 function tell(message,error=false){
  status.textContent=message;
  status.classList.toggle('mp-contact-error',error);
 }
 function changed(){
  dirty=true;
  tell('Hay cambios sin publicar.');
 }
 function input(label,value,type,onchange){
  const field=document.createElement('input');
  field.type=type;
  field.value=value;
  field.setAttribute('aria-label',label);
  field.oninput=()=>{onchange(field.value);changed()};
  return field;
 }
 function toggle(label,type,checked,onchange){
  const wrapper=document.createElement('label'), field=document.createElement('input');
  field.type=type;
  if(type==='radio')field.name='mp-primary';
  field.checked=checked;
  field.onchange=()=>{onchange(field.checked);changed()};
  wrapper.append(field,document.createTextNode(' '+label));
  return wrapper;
 }
 function draw(){
  host.replaceChildren();
  rows.forEach((row,index)=>{
   const item=document.createElement('article'),name=document.createElement('h3');
   const n=index+1;
   item.dataset.id=row.id;
   name.textContent='WhatsApp '+n;
   const label=input('Nombre de WhatsApp '+n,row.label,'text',value=>row.label=value);
   label.placeholder='Nombre del contacto';
   const number=input('Número de WhatsApp '+n,row.number,'tel',value=>row.number=value);
   number.placeholder='+593';
   const active=toggle('Activo','checkbox',row.enabled,checked=>row.enabled=checked);
   const main=toggle('Principal','radio',row.id===primary,()=>primary=row.id);
   const options=document.createElement('div');
   options.className='mp-contact-options';
   options.append(active,main);
   item.append(name,label,number,options);
   const qr=document.createElement('details'),summary=document.createElement('summary'),holder=document.createElement('div');
   summary.textContent='Código QR';
   qr.append(summary,holder);
   const updateQr=()=>{
    const phone=MP_CONTACTS.valid(row.number);
    qr.hidden=!phone;
    holder.replaceChildren();
    if(phone&&qr.open)window.MP_buildQrTools?.(holder,'https://wa.me/'+phone.slice(1),row.label||name.textContent);
   };
   number.addEventListener('input',updateQr);
   label.addEventListener('change',updateQr);
   qr.addEventListener('toggle',updateQr);
   item.append(qr);
   updateQr();
   host.append(item);
  });
 }
 function loadContacts(){
  rows=MP_CONTACTS.list(current);
  primary=MP_CONTACTS.primary(current,rows);
  while(rows.length<5)rows.push({id:crypto.randomUUID(),label:'',number:'',enabled:true});
  email.value=current.footer?.email||'';
  welcome.value=current.whatsapp?.welcome||'';
  source=JSON.stringify(contactData(current));
  dirty=false;
  draw();
 }
 function sync(){
  if(details.open&&!dirty&&!busy&&MP_can('edit_content')&&source!==JSON.stringify(contactData(current)))loadContacts();
 }
 window.MP_openContacts=()=>{
  if(!MP_can('edit_content'))return;
  details.open=true;
  sync();
  details.scrollIntoView({behavior:'smooth',block:'start'});
 };
 email.oninput=welcome.oninput=changed;
 save.onclick=async()=>{
  if(busy||!dirty)return;
  if(!MP_can('edit_content')){tell('Tu cuenta no tiene permiso para publicar contactos.',true);return}
  busy=true;
  save.disabled=host.disabled=email.disabled=welcome.disabled=true;
  tell('Publicando los números de WhatsApp…');
  const account=MP.session?.user?.id;
  try{
   const address=email.value.trim();
   if(address&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))throw Error('Escribe un correo comercial válido.');
   const contacts=rows.filter(row=>row.number.trim()).map((row,index)=>({...row,label:row.label.trim()||'WhatsApp '+(index+1)}));
   const main=contacts.find(row=>row.enabled&&row.id===primary)||contacts.find(row=>row.enabled);
   const latest=(await MP.table('content','?id=eq.1'))[0];
   if(!latest?.config||!Number.isInteger(latest.revision))throw Error('No se encontró la versión publicada.');
   if(source!==JSON.stringify(contactData(latest.config)))throw Error('Los contactos cambiaron en otra sesión. Recarga el panel para revisar la versión publicada.');
   if(account!==MP.session?.user?.id)throw Error('Vuelve a iniciar sesión para publicar.');
   const payload=MP_CONTACTS.apply({...latest.config},contacts,main?.id||'');
   payload.whatsapp.welcome=welcome.value;
   payload.footer.email=address;
   const previous=current;
   await publishConfig(payload,'Números de WhatsApp y contacto',latest.revision);
   if(account!==MP.session?.user?.id)return;
   const rebased=mergePublishedDraft(previous,draft,payload);
   draft={...rebased,whatsapp:payload.whatsapp,footer:{...rebased.footer,phone:payload.footer.phone,email:address}};
   loadContacts();
   fields();
   preview();
   tell('Contactos guardados y publicados en la página principal.');
  }catch(error){tell(error.message||'No se pudieron publicar los contactos.',true)}
  finally{busy=false;save.disabled=host.disabled=email.disabled=welcome.disabled=false}
 };
 details.addEventListener('toggle',sync);
 window.addEventListener('mp:draft-changed',sync);
 window.addEventListener('mp:session-locked',()=>{rows=[];source='';dirty=false;details.open=false;host.replaceChildren();email.value=welcome.value='';tell('')});
}
