"use strict";
/* Beheer: inloggen, link maken, vragen & talen bewerken (opslaan in Supabase), resultaten en Excel-export. */
let CONFIG_UPDATED=null;   // updated_at van de geladen vragenlijst (voor botsingscontrole)
let RESP=[];               // antwoorden uit de database

/* ---------- inloggen ---------- */
function showOnly(id){['login','noaccess','boot'].forEach(x=>$('#'+x).hidden=x!==id);document.querySelectorAll('.tab').forEach(s=>s.hidden=true);$('#tabs').hidden=true;}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();$('#lgErr').textContent='';$('#lgBtn').disabled=true;
 const {error}=await sb.auth.signInWithPassword({email:$('#lgMail').value.trim(),password:$('#lgPw').value});
 $('#lgBtn').disabled=false;if(error){$('#lgErr').textContent='Inloggen lukte niet. Controleer je e-mailadres en wachtwoord.';return;}
 start();});
$('#lgForgot').onclick=async()=>{const m=$('#lgMail').value.trim();if(!m){$('#lgErr').textContent='Vul eerst je e-mailadres in.';return;}
 const {error}=await sb.auth.resetPasswordForEmail(m,{redirectTo:location.origin+location.pathname});
 $('#lgErr').textContent=error?'Versturen lukte niet: '+error.message:'Als dit adres bekend is, ontvang je een e-mail met een link om een nieuw wachtwoord te kiezen.';};
$('#pwForm').addEventListener('submit',async e=>{e.preventDefault();const {error}=await sb.auth.updateUser({password:$('#pwNew').value});
 if(error){$('#pwErr').textContent=error.message;return;}toast('Wachtwoord opgeslagen');$('#pwForm').hidden=true;$('#loginForm').hidden=false;start();});
$('#logout').onclick=async()=>{await sb.auth.signOut();location.reload();};

async function start(){
 if(!sb){showOnly('boot');$('#boot').innerHTML='<p class="err">Supabase is nog niet ingesteld. Vul js/config.js in.</p>';return;}
 const {data:{session}}=await sb.auth.getSession();
 if(!session){showOnly('login');return;}
 const {data:isStaff,error:e1}=await sb.rpc('is_staff');
 if(e1||!isStaff){showOnly('noaccess');$('#userbox').hidden=false;$('#userMail').textContent=session.user.email;return;}
 try{const row=await loadConfig();CONFIG_UPDATED=row?row.updated_at:null;if(!row)await saveConfig(true);}
 catch(e){showOnly('boot');$('#boot').innerHTML='<p class="err">De vragenlijst kon niet worden geladen: '+(e.message||e)+'</p>';return;}
 await loadAudio();
 ['login','noaccess','boot'].forEach(x=>$('#'+x).hidden=true);
 $('#tabs').hidden=false;$('#userbox').hidden=false;$('#userMail').textContent=session.user.email;
 syncV();const t=(location.hash||'').slice(1);showTab(['link','beheer','resultaten'].includes(t)?t:'link');
}
sb&&sb.auth.onAuthStateChange(ev=>{if(ev==='PASSWORD_RECOVERY'){showOnly('login');$('#loginForm').hidden=true;$('#pwForm').hidden=false;}});

/* ---------- tabs ---------- */
function showTab(id){document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===id?'true':'false'));
 document.querySelectorAll('.tab').forEach(s=>s.hidden=s.id!=='tab-'+id);stopAudio();
 if(id==='beheer')renderEditor();if(id==='resultaten')loadResults();if(id==='link')renderLink();
 try{history.replaceState(null,'','#'+id)}catch(e){}window.scrollTo(0,0);}
document.querySelectorAll('#tabs button').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
function fillV(sel,withAll){const cur=sel.value;sel.innerHTML='';if(withAll)sel.append(h('option',{value:''},'Alle vestigingen'));S.vestigingen.forEach(v=>sel.append(h('option',{value:v.c},v.n)));if([...sel.options].some(o=>o.value===cur))sel.value=cur;}
function fillG(sel,vc){const cur=sel.value;const v=S.vestigingen.find(x=>x.c===vc);sel.innerHTML='';(v&&v.groepen||[]).forEach(g=>sel.append(h('option',{value:g},g)));if(!sel.options.length)sel.append(h('option',{value:''},'(nog geen groepen ingevoerd)'));if([...sel.options].some(o=>o.value===cur))sel.value=cur;}
function syncV(){fillV($('#lkV'));fillV($('#rsV'),true);fillG($('#lkG'),$('#lkV').value);}

/* ---------- opslaan ---------- */
let saveT=null,dirty=false;
function setSaveState(t,cls){const el=$('#saveState');el.textContent=t;el.className='note '+(cls||'');}
function save(){dirty=true;setSaveState('Niet opgeslagen…','dirty');clearTimeout(saveT);saveT=setTimeout(()=>saveConfig(),1200);}
async function saveConfig(insert){
 clearTimeout(saveT);
 if(insert){const {data,error}=await sb.from('survey_config').insert({id:1,data:S}).select('updated_at').single();if(error)throw error;CONFIG_UPDATED=data.updated_at;return;}
 setSaveState('Opslaan…');
 const {data,error}=await sb.from('survey_config').update({data:S}).eq('id',1).eq('updated_at',CONFIG_UPDATED).select('updated_at');
 if(error){setSaveState('Opslaan mislukt: '+error.message,'err');return;}
 if(!data||!data.length){setSaveState('Niet opgeslagen: iemand anders heeft de vragenlijst intussen gewijzigd. Herlaad de pagina; jouw laatste wijziging gaat dan verloren.','err');return;}
 CONFIG_UPDATED=data[0].updated_at;dirty=false;setSaveState('Opgeslagen om '+new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}));
}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});

/* ---------- link maker ---------- */
const BASEURL=location.origin+location.pathname.replace(/beheer\.html$/,'');
function renderLink(){
 const v=$('#lkV').value,g=$('#lkG').value;
 if(!g){$('#lkUrl').textContent='Voer eerst groepen in bij Vragen & talen → Vestigingen en groepen.';$('#lkWa').removeAttribute('href');$('#qr').innerHTML='';$('#lkPrev').textContent='';return;}
 const url=BASEURL+'?v='+encodeURIComponent(v)+'&g='+encodeURIComponent(slug(g));
 $('#lkUrl').textContent=url;const msg=$('#lkMsg').value.replace('{link}',url);$('#lkPrev').textContent=msg;
 $('#lkWa').href='https://wa.me/?text='+encodeURIComponent(msg);$('#lkTry').href=url;
 const box=$('#qr');box.innerHTML='';
 try{const qr=qrcode(0,'M');qr.addData(url);qr.make();box.innerHTML=qr.createImgTag(6,8);const im=box.querySelector('img');if(im)im.alt='QR-code naar de vragenlijst';}catch(e){box.textContent='QR-code kon niet worden gemaakt.';}
}
$('#lkV').addEventListener('change',()=>{fillG($('#lkG'),$('#lkV').value);renderLink();});$('#lkG').addEventListener('change',renderLink);$('#lkMsg').addEventListener('input',renderLink);
$('#lkCopy').onclick=()=>{const t=$('#lkUrl').textContent;navigator.clipboard?.writeText(t).then(()=>toast('Link gekopieerd'),()=>{const r=document.createRange();r.selectNodeContents($('#lkUrl'));const s=getSelection();s.removeAllRanges();s.addRange(r);toast('Link geselecteerd: kopieer met Ctrl+C');});};

/* ---------- editor ---------- */
let edOpen=new Set();let uid=0;
function audioKey(o,l){return l+'|'+textHash(textOf(o,l)||'');}
async function uploadAudio(o,l,file){
 const text=textOf(o,l)||'';if(!text){toast('Vul eerst de tekst in.');return false;}
 const hash=textHash(text),ext=(file.name.split('.').pop()||'mp3').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5)||'mp3',path=`${l}/${hash}.${ext}`;
 const up=await sb.storage.from('audio').upload(path,file,{upsert:true,contentType:file.type||'audio/mpeg'});
 if(up.error){toast('Uploaden lukte niet: '+up.error.message);return false;}
 const {error}=await sb.from('audio').upsert({lang:l,text_hash:hash,path,source:'opname'});
 if(error){toast('Opslaan lukte niet: '+error.message);return false;}
 AUD.set(l+'|'+hash,sb.storage.from('audio').getPublicUrl(path).data.publicUrl+'?v='+Date.now());return true;
}
function textField(o,label,opts={}){
 const id='tf'+(++uid);
 const wrap=h('div',{class:'tf'});
 if(label)wrap.append(h('label',{for:id},label));
 const inp=h('input',{class:'input',id,value:o.nl});
 const chips=h('div',{class:'chips'});
 const detail=h('div',{class:'tf-detail'});detail.hidden=!edOpen.has(o);
 function drawChips(){chips.innerHTML='';others().forEach(l=>{const s=status(o,l.c);const b=h('button',{class:'chip '+s,type:'button',title:L(l.c).n+': '+STLBL[s]},l.c.toUpperCase()+' · '+STLBL[s]);b.onclick=()=>{if(edOpen.has(o))edOpen.delete(o);else edOpen.add(o);detail.hidden=!edOpen.has(o);if(!detail.hidden)drawDetail();};chips.append(b);});}
 function drawDetail(){detail.innerHTML='';S.langs.forEach(l=>{
  const isNl=l.c==='nl';const s=status(o,l.c);
  const ti=isNl?h('span',{class:'note'},'(brontekst hierboven)'):h('input',{class:'input',dir:l.dir,lang:l.c,value:o[l.c]||'',placeholder:'(nog geen vertaling)'});
  const chipEl=isNl?null:h('span',{class:'chip '+s},STLBL[s]);
  if(!isNl)ti.oninput=()=>{o[l.c]=ti.value;o._src=o._src||{};o._src[l.c]=o.nl;drawChips();save();refreshStats();chipEl.className='chip '+status(o,l.c);chipEl.textContent=STLBL[status(o,l.c)];};
  const ck=h('input',{type:'checkbox'});ck.checked=!!(o._chk||{})[l.c];ck.disabled=!(s==='ok'||s==='concept');
  ck.onchange=()=>{o._chk=o._chk||{};o._chk[l.c]=ck.checked;drawChips();drawDetail();save();refreshStats();};
  const fi=h('input',{type:'file',accept:'audio/*'});
  fi.onchange=async()=>{const f=fi.files[0];if(!f)return;if(f.size>5*1024*1024){toast('Bestand is te groot (max. 5 MB).');return;}if(await uploadAudio(o,l.c,f)){toast('Opname opgeslagen bij deze '+L(l.c).n+'e tekst');drawDetail();}};
  const hasRec=AUD.has(audioKey(o,l.c));const hasVoice=!!voiceFor(l.c);
  const au=h('span',{class:'chip '+(hasRec?'ok':hasVoice?'concept':'leeg'),title:'Welke audio de cursist hoort (stem: afhankelijk van het toestel van de cursist)'},hasRec?'eigen opname':hasVoice?'stem toestel':'geen opname');
  detail.append(h('div',{class:'trow'},h('span',{class:'ln',dir:l.dir},l.n),ti,h('div',{class:'meta'},chipEl,au,sayBtn(o,l.c,'sm'),h('label',{class:'up'},hasRec?'Opname vervangen':'Opname uploaden',fi),isNl?null:h('label',{class:'chk'},ck,'gecontroleerd'))));
 });}
 inp.oninput=()=>{o.nl=inp.value;drawChips();if(!detail.hidden)drawDetail();save();refreshStats();};
 drawChips();if(!detail.hidden)drawDetail();
 wrap.append(h('div',{class:'tf-row'},inp,sayBtn(o,'nl','sm'),opts.extra||null),chips,detail);
 return wrap;
}
function refreshStats(){const c={ok:0,concept:0,verouderd:0,leeg:0};allTexts().forEach(o=>others().forEach(l=>{c[status(o,l.c)]++;}));
 const el=$('#edStats');el.innerHTML='';el.append(h('b',null,allTexts().length+' teksten × '+others().length+' talen'),h('span',{class:'chip ok'},c.ok+' gecontroleerd'),h('span',{class:'chip concept'},c.concept+' concept'),h('span',{class:'chip verouderd'},c.verouderd+' verouderd'),h('span',{class:'chip leeg'},c.leeg+' ontbreekt'));
 $('#edTranslate').textContent='Vertaal gewijzigde teksten ('+(c.verouderd+c.leeg)+')';$('#edTranslate').disabled=(c.verouderd+c.leeg)===0;}
const TYPES={choice:'Keuze',matrix:'Tabel (stellingen)',stars:'Sterren 1–5',open:'Open vraag'};
const E=()=>Tnew('','','','','','','','');
function renderEditor(){
 const ed=$('#editor');ed.innerHTML='';refreshStats();
 ed.append(h('div',{class:'ed-sec'},h('h2',null,'Vragen'),h('span',{class:'note'},'Volgorde, type en tekst. Tabelvragen tonen de cursist één stelling per scherm.')));
 S.questions.forEach((q,i)=>{
  const card=h('div',{class:'qcard'});
  const typ=h('select',{class:'input','aria-label':'Vraagtype'});Object.entries(TYPES).forEach(([k,v])=>typ.append(h('option',{value:k},v)));typ.value=q.type;
  typ.onchange=()=>{q.type=typ.value;if((q.type==='choice'||q.type==='matrix')&&!q.scale)q.scale=Object.keys(S.scales)[0];if(q.type==='matrix'&&!q.rows){const t=E();t.nl='Nieuwe stelling';q.rows=[{id:'r1',t}];}if(q.type==='stars'&&!q.low){q.low=E();q.low.nl='Slecht';q.high=E();q.high.nl='Heel goed';}save();renderEditor();};
  const sc=h('select',{class:'input','aria-label':'Antwoordschaal'});Object.entries(S.scales).forEach(([k,v])=>sc.append(h('option',{value:k},v.n)));sc.value=q.scale||'';sc.hidden=!(q.type==='choice'||q.type==='matrix');sc.onchange=()=>{q.scale=sc.value;save();};
  const req=h('input',{type:'checkbox'});req.checked=!!q.req;req.onchange=()=>{q.req=req.checked;save();};
  const sub=h('input',{type:'checkbox'});sub.checked=!!q.sub;sub.disabled=i===0;sub.onchange=()=>{q.sub=sub.checked;save();renderEditor();};
  const up=h('button',{class:'btn small',type:'button','aria-label':'Omhoog'},'↑');up.disabled=i===0;up.onclick=()=>{S.questions.splice(i-1,0,S.questions.splice(i,1)[0]);save();renderEditor();};
  const dn=h('button',{class:'btn small',type:'button','aria-label':'Omlaag'},'↓');dn.disabled=i===S.questions.length-1;dn.onclick=()=>{S.questions.splice(i+1,0,S.questions.splice(i,1)[0]);save();renderEditor();};
  const del=h('button',{class:'btn small',type:'button'},'Verwijder');del.onclick=()=>{if(del.dataset.sure){S.questions.splice(i,1);save();renderEditor();}else{del.dataset.sure='1';del.textContent='Zeker? Klik nog eens';}};
  card.append(h('div',{class:'qhead'},h('span',{class:'qnum'},qNum(i)),typ,sc,h('label',{class:'chk'},req,'verplicht'),h('label',{class:'chk',title:'Toont de vorige vraag en het antwoord erboven'},sub,'subvraag van vorige'),h('span',{class:'sp'}),up,dn,del));
  card.append(textField(q.t,'Vraag'));
  if(q.type==='matrix'){const rows=h('div',{class:'rows'});(q.rows||[]).forEach((r,ri)=>{const x=h('button',{class:'btn small',type:'button','aria-label':'Stelling verwijderen'},'✕');x.onclick=()=>{q.rows.splice(ri,1);save();renderEditor();};rows.append(h('div',{class:'rowline'},textField(r.t,'Stelling '+(ri+1)),x));});
   const add=h('button',{class:'btn small',type:'button'},'+ Stelling toevoegen');add.onclick=()=>{const t=E();t.nl='Nieuwe stelling';q.rows.push({id:'r'+Date.now().toString(36),t});save();renderEditor();};rows.append(h('div',null,add));card.append(rows);}
  if(q.type==='stars'){card.append(h('div',{class:'rows'},textField(q.low,'Label bij 1 ster'),textField(q.high,'Label bij 5 sterren')));}
  ed.append(card);
 });
 const addQ=h('button',{class:'btn',type:'button'},'+ Vraag toevoegen');addQ.onclick=()=>{const t=E();t.nl='Nieuwe vraag';S.questions.push({id:'q'+Date.now().toString(36),type:'choice',scale:Object.keys(S.scales)[0],req:true,t});save();renderEditor();};ed.append(addQ);

 ed.append(h('div',{class:'ed-sec'},h('h2',null,'Antwoordschalen'),h('span',{class:'note'},'Opties met hetzelfde woord worden gedeeld: één keer vertalen en inspreken.')));
 Object.entries(S.scales).forEach(([sk,scl])=>{
  const card=h('div',{class:'qcard'});const nm=h('input',{class:'input',value:scl.n,'aria-label':'Naam schaal',style:'max-width:280px;font-weight:700'});nm.oninput=()=>{scl.n=nm.value;save();};
  card.append(h('div',{class:'qhead'},nm,h('span',{class:'note'},'gebruikt bij vraag '+(S.questions.map((q,i)=>q.scale===sk&&(q.type==='choice'||q.type==='matrix')?qNum(i):null).filter(Boolean).join(', ')||'–'))));
  const rows=h('div',{class:'rows'});scl.o.forEach((oid,oi)=>{const op=S.options[oid];if(!op)return;const em=h('input',{class:'input emoji-in',value:op.e||'','aria-label':'Pictogram'});em.oninput=()=>{op.e=em.value;save();};
   const x=h('button',{class:'btn small',type:'button','aria-label':'Optie verwijderen'},'✕');x.onclick=()=>{scl.o.splice(oi,1);save();renderEditor();};
   rows.append(h('div',{class:'optline'},em,textField(op.t,null),x));});
  const add=h('button',{class:'btn small',type:'button'},'+ Optie');add.onclick=()=>{const id='o'+Date.now().toString(36);const t=E();t.nl='Nieuwe optie';S.options[id]={e:'',t};scl.o.push(id);save();renderEditor();};rows.append(h('div',null,add));
  card.append(rows);ed.append(card);});
 const addS=h('button',{class:'btn',type:'button'},'+ Antwoordschaal toevoegen');addS.onclick=()=>{const k='s'+Date.now().toString(36);S.scales[k]={n:'Nieuwe schaal',o:[]};save();renderEditor();};ed.append(addS);

 ed.append(h('div',{class:'ed-sec'},h('h2',null,'Vaste teksten'),h('span',{class:'note'},'Welkom, knoppen en bedankt.')));
 const uic=h('div',{class:'qcard'});const UIL={welkomTitel:'Welkom – titel',welkomTekst:'Welkom – tekst',taalHint:'Uitleg taalknop',jijKoos:'Subvraag – eerder antwoord',start:'Knop start',volgende:'Knop volgende',terug:'Knop terug',versturen:'Knop versturen',vraagVan:'Voortgang ({n} en {t} laten staan)',typHier:'Open vraag – invulhulp',eigenTaal:'Open vraag – eigen taal',bedanktTitel:'Bedankt – titel',bedanktTekst:'Bedankt – tekst'};
 Object.entries(S.ui).forEach(([k,o])=>uic.append(textField(o,UIL[k]||k)));ed.append(uic);

 ed.append(h('div',{class:'ed-sec'},h('h2',null,'Talen'),h('span',{class:'note'},'Nieuwe taal toevoegen: daarna “Vertaal gewijzigde teksten”.')));
 const lc=h('div',{class:'qcard'});
 lc.append(h('div',{class:'chips'},S.langs.map(l=>h('span',{class:'chip',dir:l.dir},l.n+' ('+l.c+')'))));
 const lcode=h('input',{class:'input',placeholder:'code, bijv. pt',style:'max-width:140px','aria-label':'Taalcode'}),lname=h('input',{class:'input',placeholder:'naam in eigen taal, bijv. Português',style:'max-width:260px','aria-label':'Naam taal'}),lrtl=h('input',{type:'checkbox'});
 const ladd=h('button',{class:'btn small',type:'button'},'Taal toevoegen');ladd.onclick=()=>{const c=lcode.value.trim().toLowerCase();if(!/^[a-z]{2,3}$/.test(c)||!lname.value.trim()||S.langs.some(l=>l.c===c)){toast('Vul een nieuwe taalcode (2 of 3 letters) en naam in.');return;}S.langs.push({c,n:lname.value.trim(),dir:lrtl.checked?'rtl':'ltr',bcp:c});save();renderEditor();toast(lname.value.trim()+' toegevoegd. Alle teksten staan op “ontbreekt”.');};
 lc.append(h('div',{class:'qhead'},lcode,lname,h('label',{class:'chk'},lrtl,'rechts-naar-links'),ladd));ed.append(lc);

 ed.append(h('div',{class:'ed-sec'},h('h2',null,'Vestigingen en groepen'),h('span',{class:'note'},'Voer de groepen vooraf in, één per regel. De docent kiest zijn groep uit deze lijst bij Link maken. Let op: wijzig je een groepsnaam, dan werkt de oude link van die groep niet meer.')));
 const vc=h('div',{class:'qcard'});S.vestigingen.forEach((v,vi)=>{
  const ga=h('textarea',{class:'input',rows:Math.max(2,(v.groepen||[]).length),'aria-label':'Groepen '+v.n,placeholder:'bijv. B1 di-do ochtend'});ga.value=(v.groepen||[]).join('\n');
  ga.oninput=()=>{v.groepen=ga.value.split('\n').map(x=>x.trim()).filter(Boolean);save();syncV();};
  const c=h('input',{class:'input',value:v.c,'aria-label':'Code'}),n=h('input',{class:'input',value:v.n,'aria-label':'Naam'});c.oninput=()=>{v.c=c.value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');save();syncV();};n.oninput=()=>{v.n=n.value;save();syncV();};
  const x=h('button',{class:'btn small',type:'button','aria-label':'Vestiging verwijderen'},'✕');x.onclick=()=>{if(x.dataset.sure){S.vestigingen.splice(vi,1);save();syncV();renderEditor();}else{x.dataset.sure='1';x.textContent='Zeker?';}};
  vc.append(h('div',{class:'vrow'},h('div',{class:'field'},h('label',null,'Code (in link)'),c),h('div',{class:'field'},h('label',null,'Naam'),n),h('div',{class:'field'},h('label',null,'Groepen'),ga),x));});
 const va=h('button',{class:'btn small',type:'button'},'+ Vestiging');va.onclick=()=>{S.vestigingen.push({c:'NIEUW',n:'Nieuwe vestiging',groepen:[]});save();syncV();renderEditor();};vc.append(h('div',null,va));ed.append(vc);
}
$('#edReset').onclick=()=>{$('#edReset2').hidden=false;};
$('#edResetNo').onclick=()=>{$('#edReset2').hidden=true;};
$('#edResetYes').onclick=()=>{const keep=S.vestigingen;S=defaultState();S.vestigingen=keep;save();$('#edReset2').hidden=true;syncV();renderEditor();toast('Standaardvragenlijst teruggezet');};

/* Automatisch vertalen via de Supabase-functie 'translate' */
$('#edTranslate').onclick=async()=>{
 const btn=$('#edTranslate');const todo=[];allTexts().forEach(o=>{const to=others().filter(l=>{const s=status(o,l.c);return s==='verouderd'||s==='leeg';}).map(l=>l.c);if(to.length&&o.nl.trim())todo.push({o,to});});
 if(!todo.length)return;btn.disabled=true;let done=0;
 try{for(let i=0;i<todo.length;i+=15){const batch=todo.slice(i,i+15);btn.textContent=`Bezig met vertalen… ${done}/${todo.length}`;
  const langs={};batch.forEach(b=>b.to.forEach(c=>langs[c]=L(c).n));
  const {data,error}=await sb.functions.invoke('translate',{body:{languages:langs,items:batch.map((b,j)=>({k:j,nl:b.o.nl,talen:b.to}))}});
  if(error)throw new Error((data&&data.error)||error.message);
  (data&&data.items||[]).forEach(it=>{const b=batch[it.k];if(!b)return;b.to.forEach(l=>{if(typeof it[l]==='string'&&it[l].trim()){b.o[l]=it[l].trim();b.o._src=b.o._src||{};b.o._src[l]=b.o.nl;b.o._chk=b.o._chk||{};b.o._chk[l]=false;}});});
  done+=batch.length;}
  save();toast('Vertaald. Nieuwe vertalingen staan op “concept” tot iemand ze controleert.');
 }catch(e){toast('Vertalen lukte niet: '+(e&&e.message||'onbekende fout'),6000);}
 btn.disabled=false;renderEditor();
};

/* ---------- resultaten ---------- */
async function loadResults(){
 const grid=$('#rsGrid');grid.innerHTML='';grid.append(h('div',{class:'empty',style:'grid-column:1/-1'},'Resultaten laden…'));
 const all=[];let from=0;const size=1000;
 while(true){const {data,error}=await sb.from('responses').select('id,created_at,vestiging,groep,taal,antwoorden').order('created_at',{ascending:true}).range(from,from+size-1);
  if(error){grid.innerHTML='';grid.append(h('div',{class:'empty err',style:'grid-column:1/-1'},'Laden lukte niet: '+error.message));return;}
  all.push(...data);if(data.length<size)break;from+=size;}
 RESP=all.map(r=>({id:r.id,ts:r.created_at,v:r.vestiging,g:r.groep,lang:r.taal,ans:r.antwoorden||{}}));
 renderResults();
}
function data(){return RESP;}
function filtered(){const v=$('#rsV').value,g=$('#rsG').value,f=$('#rsFrom').value,t=$('#rsTo').value;
 return RESP.filter(d=>(!v||d.v===v)&&(!g||d.g===g)&&(!f||d.ts.slice(0,10)>=f)&&(!t||d.ts.slice(0,10)<=t));}
['#rsV','#rsG','#rsFrom','#rsTo'].forEach(s=>$(s).addEventListener('change',renderResults));
$('#rsReload').onclick=loadResults;

function colsDef(){const c=[];S.questions.forEach((q,i)=>{if(q.type==='matrix')(q.rows||[]).forEach(r=>c.push({key:q.id+'.'+r.id,h:`${qNum(i)}. ${q.t.nl} ${r.t.nl}`,q}));else c.push({key:q.id,h:`${qNum(i)}. ${q.t.nl}`,q});});return c;}
function rowOf(d,cols){const dt=new Date(d.ts);const o={'Datum':dt.toLocaleDateString('nl-NL'),'Tijd':dt.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}),'Vestiging':vName(d.v),'Groep':d.g,'Taal':L(d.lang).n};
 cols.forEach(c=>{const a=d.ans[c.key];o[c.h]=a==null?'':c.q.type==='stars'?a:c.q.type==='open'?a:(S.options[a]?S.options[a].t.nl:a);});return o;}
$('#rsExport').onclick=()=>{
 if(typeof XLSX==='undefined'){toast('Excel-bibliotheek niet geladen.');return;}
 const cols=colsDef(),all=filtered();if(!all.length){toast('Geen reacties in deze selectie.');return;}
 const wb=XLSX.utils.book_new();
 const mk=rows=>{const ws=XLSX.utils.json_to_sheet(rows.map(d=>rowOf(d,cols)),{header:['Datum','Tijd','Vestiging','Groep','Taal',...cols.map(c=>c.h)]});ws['!cols']=[{wch:11},{wch:6},{wch:14},{wch:20},{wch:12},...cols.map(()=>({wch:18}))];if(rows.length)ws['!autofilter']={ref:ws['!ref']};return ws;};
 XLSX.utils.book_append_sheet(wb,mk(all),'Alle');
 const used=new Set(['Alle']);
 S.vestigingen.forEach(v=>{const rows=all.filter(d=>d.v===v.c);let name=v.n.replace(/[\\\/\?\*\[\]:]/g,'').slice(0,31)||v.c;if(used.has(name))name=(v.c+' '+name).slice(0,31);used.add(name);XLSX.utils.book_append_sheet(wb,mk(rows),name);});
 XLSX.writeFile(wb,'cursistenevaluatie_ruwe_data_'+new Date().toISOString().slice(0,10)+'.xlsx');
};

start();
