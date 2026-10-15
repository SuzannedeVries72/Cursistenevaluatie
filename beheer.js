"use strict";
/* Beheer: inloggen, link maken, vragen & talen bewerken (opslaan in Supabase), resultaten en Excel-export. */
let CONFIG_UPDATED=null;   // updated_at van de geladen vragenlijst (voor botsingscontrole)
let RESP=[];               // antwoorden uit de database
let ROLE=null;             // 'beheerder' of 'docent'
let ME=null;               // e-mail van de ingelogde gebruiker
let BEZET={};             // 'vestiging|groep' -> e-mail van de gekoppelde docent
let MINE=[];               // groepen die aan deze gebruiker gekoppeld zijn
const DOMAINS_HINT='@inova-alkmaar.nl';

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
$('#lgToSignup').onclick=()=>{$('#loginForm').hidden=true;$('#signupForm').hidden=false;$('#suMail').value=$('#lgMail').value;};
$('#suToLogin').onclick=()=>{$('#signupForm').hidden=true;$('#loginForm').hidden=false;};
$('#signupForm').addEventListener('submit',async e=>{e.preventDefault();$('#suErr').textContent='';
 const mail=$('#suMail').value.trim().toLowerCase();
 $('#suBtn').disabled=true;
 const {data,error}=await sb.auth.signUp({email:mail,password:$('#suPw').value,options:{emailRedirectTo:location.origin+location.pathname}});
 $('#suBtn').disabled=false;
 if(error){$('#suErr').textContent=/rate|limit/i.test(error.message)?'Er zijn net te veel aanmeldingen tegelijk. Probeer het over een uur opnieuw.':'Aanmelden lukte niet: '+error.message;return;}
 if(data.session){start();return;}
 $('#suErr').style.color='var(--ok)';$('#suErr').textContent='Gelukt! Open de e-mail die we naar '+mail+' hebben gestuurd en klik op de bevestigingslink. Daarna kun je inloggen.';});
$('#logout').onclick=async()=>{await sb.auth.signOut();location.reload();};

async function start(){
 if(!sb){showOnly('boot');$('#boot').innerHTML='<p class="err">Supabase is nog niet ingesteld. Vul js/config.js in.</p>';return;}
 const {data:{session}}=await sb.auth.getSession();
 ME=session?(session.user.email||'').toLowerCase():null;
 if(!session){showOnly('login');return;}
 const {data:role,error:e1}=await sb.rpc('my_role');
 ROLE=e1?null:role;
 if(!ROLE){showOnly('noaccess');$('#userbox').hidden=false;$('#userMail').textContent=session.user.email;return;}
 try{const row=await loadConfig();CONFIG_UPDATED=row?row.updated_at:null;
  if(!row){if(ROLE==='beheerder')await saveConfig(true);else{showOnly('boot');$('#boot').innerHTML='<p class="lead">De vragenlijst is nog niet ingesteld. Vraag de beheerder om eerst in te loggen.</p>';$('#userbox').hidden=false;$('#userMail').textContent=session.user.email;return;}}}
 catch(e){showOnly('boot');$('#boot').innerHTML='<p class="err">De vragenlijst kon niet worden geladen: '+(e.message||e)+'</p>';return;}
 await loadAudio();
 ['login','noaccess','boot'].forEach(x=>$('#'+x).hidden=true);
 $('#tabs').hidden=false;$('#userbox').hidden=false;$('#userMail').textContent=session.user.email+' · '+ROLE;
 document.querySelector('#tabs [data-tab="beheer"]').hidden=ROLE!=='beheerder';
 $('#rsExport').hidden=ROLE!=='beheerder';$('#rsPrint').hidden=ROLE!=='beheerder';$('#rsClear').hidden=ROLE!=='beheerder';
 await loadMine();
 $('#rsScope').textContent=ROLE==='beheerder'?'Je ziet de resultaten van alle groepen.':'Je ziet alleen de resultaten van de groepen die aan jou gekoppeld zijn (zie Link maken → Mijn groepen).';
 syncV();const t=(location.hash||'').slice(1);showTab(['link','resultaten'].concat(ROLE==='beheerder'?['beheer']:[]).includes(t)?t:'link');
}
sb&&sb.auth.onAuthStateChange(ev=>{if(ev==='PASSWORD_RECOVERY'){showOnly('login');$('#loginForm').hidden=true;$('#pwForm').hidden=false;}});

/* ---------- tabs ---------- */
function showTab(id){if(id==='beheer'&&ROLE!=='beheerder')id='link';document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===id?'true':'false'));
 document.querySelectorAll('.tab').forEach(s=>s.hidden=s.id!=='tab-'+id);stopAudio();
 if(id==='beheer')renderEditor();if(id==='resultaten')loadResults();if(id==='link'){renderLink();loadMine().then(syncLink);}
 try{history.replaceState(null,'','#'+id)}catch(e){}window.scrollTo(0,0);}
document.querySelectorAll('#tabs button').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
function fillV(sel,withAll){const cur=sel.value;sel.innerHTML='';if(withAll)sel.append(h('option',{value:''},'Alle vestigingen'));S.vestigingen.forEach(v=>sel.append(h('option',{value:v.c},v.n)));if([...sel.options].some(o=>o.value===cur))sel.value=cur;}
function fillG(sel,vc){const cur=sel.value;const v=S.vestigingen.find(x=>x.c===vc);sel.innerHTML='';
 (v&&v.groepen||[]).forEach(g=>{const wie=BEZET[vc+'|'+g];const ander=wie&&wie!==ME;
  sel.append(h('option',{value:g,disabled:ander&&ROLE!=='beheerder'?'':null},g+(wie===ME?' (jouw groep)':ander?' (al gekoppeld aan '+wie+')':'')));});
 if(!sel.options.length)sel.append(h('option',{value:''},'(nog geen groepen ingevoerd)'));
 const ok=[...sel.options].filter(o=>!o.disabled);
 if(ok.some(o=>o.value===cur))sel.value=cur;else if(ok.length)sel.value=ok[0].value;else sel.value='';}
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
 const wie=BEZET[v+'|'+g],vrij=!wie||wie===ME||ROLE==='beheerder';
 ['lkWa','lkTry','lkCopy'].forEach(id=>{const el=$('#'+id),off=!g||!vrij;el.classList.toggle('disabled',off);el.style.opacity=off?'.45':'';el.style.pointerEvents=off?'none':'';el.setAttribute('aria-disabled',off);});
 if(g&&!vrij){$('#lkUrl').textContent='Deze groep is al gekoppeld aan '+wie+'.';$('#lkWa').removeAttribute('href');$('#lkTry').removeAttribute('href');$('#qr').innerHTML='';$('#lkPrev').textContent='';return;}
 if(!g){$('#lkUrl').textContent='Voer eerst groepen in bij Vragen & talen → Vestigingen en groepen.';$('#lkWa').removeAttribute('href');$('#qr').innerHTML='';$('#lkPrev').textContent='';return;}
 const url=BASEURL+'?v='+encodeURIComponent(v)+'&g='+encodeURIComponent(slug(g));
 $('#lkUrl').textContent=url;const msg=$('#lkMsg').value.replace('{link}',url);$('#lkPrev').textContent=msg;
 $('#lkWa').href='https://wa.me/?text='+encodeURIComponent(msg);$('#lkTry').href=url+'&voorbeeld=1';
 const box=$('#qr');box.innerHTML='';
 try{const qr=qrcode(0,'M');qr.addData(url);qr.make();box.innerHTML=qr.createImgTag(6,8);const im=box.querySelector('img');if(im)im.alt='QR-code naar de vragenlijst';}catch(e){box.textContent='QR-code kon niet worden gemaakt.';}
}
/* Docent koppelen aan de gekozen groep zodra hij de link deelt, kopieert of bekijkt */
async function koppel(){
 const v=$('#lkV').value,g=$('#lkG').value;if(!ME||!v||!g)return true;
 if(ROLE==='beheerder')return true;                       // beheerder ziet alles en bezet geen groep
 if(MINE.some(m=>m.vestiging===v&&m.groep===g))return true;
 const wie=BEZET[v+'|'+g];if(wie&&wie!==ME){toast('Deze groep is al gekoppeld aan '+wie+'.');return false;}
 const {error}=await sb.from('docent_groep').insert({email:ME,vestiging:v,groep:g});
 if(error){await loadMine();syncLink();toast(error.code==='23505'?'Een collega heeft deze groep net gekozen. Kies een andere groep.':'Koppelen lukte niet: '+error.message);return false;}
 MINE.push({vestiging:v,groep:g});BEZET[v+'|'+g]=ME;renderMine();syncLink();toast('Je bent gekoppeld aan '+g+'. Je ziet nu de resultaten van deze groep.');return true;
}
function syncLink(){fillG($('#lkG'),$('#lkV').value);renderLink();}
async function loadMine(){if(!ME)return;
 const {data:bz,error:e1}=await sb.rpc('bezette_groepen');if(!e1){BEZET={};(bz||[]).forEach(r=>BEZET[r.vestiging+'|'+r.groep]=r.email);}
 MINE=Object.entries(BEZET).filter(([k,e])=>e===ME).map(([k])=>{const i=k.indexOf('|');return {vestiging:k.slice(0,i),groep:k.slice(i+1)};});
 renderMine();}
function renderMine(){const box=$('#lkMine');if(!box)return;box.innerHTML='';if(!MINE.length)return;
 box.append(h('b',{style:'font-size:13px'},'Mijn groepen'),h('div',{class:'chips',style:'margin-top:4px'},MINE.map(m=>{const b=h('button',{class:'chip ok',type:'button',title:'Klik om deze koppeling te verwijderen'},vName(m.vestiging)+' · '+m.groep+' ✕');
  b.onclick=async()=>{if(!b.dataset.sure){b.dataset.sure='1';b.textContent='Ontkoppelen? Klik nog eens';return;}const {error}=await sb.from('docent_groep').delete().eq('email',ME).eq('vestiging',m.vestiging).eq('groep',m.groep);if(error){toast('Lukte niet: '+error.message);return;}MINE=MINE.filter(x=>x!==m);delete BEZET[m.vestiging+'|'+m.groep];renderMine();syncLink();};return b;})));}
['lkWa','lkTry'].forEach(id=>$('#'+id).addEventListener('click',e=>{if($('#'+id).classList.contains('disabled')){e.preventDefault();return;}koppel();}));
$('#lkV').addEventListener('change',()=>{fillG($('#lkG'),$('#lkV').value);renderLink();});$('#lkG').addEventListener('change',renderLink);$('#lkMsg').addEventListener('input',renderLink);
$('#lkCopy').onclick=async()=>{if($('#lkCopy').classList.contains('disabled'))return;if(!(await koppel()))return;const t=$('#lkUrl').textContent;navigator.clipboard?.writeText(t).then(()=>toast('Link gekopieerd'),()=>{const r=document.createRange();r.selectNodeContents($('#lkUrl'));const s=getSelection();s.removeAllRanges();s.addRange(r);toast('Link geselecteerd: kopieer met Ctrl+C');});};

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
/* Opnames in bulk uploaden. Bestandsnaam: <taal>-<nr>-<teksthash>.mp3 (bv. fa-12-1a2b3c4d5e6f7a8b.mp3).
   De hash hoort bij precies één tekst; een bestand waarvan de tekst intussen is gewijzigd, wordt overgeslagen. */
function bulkAudioPanel(){
 const box=h('div',{class:'qcard',style:'margin-bottom:14px'});
 const log=h('div',{class:'note bulklog',style:'white-space:pre-line;margin-top:8px'});
 const fi=h('input',{type:'file',accept:'audio/*',multiple:'',style:'display:none'});
 box.append(h('b',null,'Opnames in bulk uploaden'),h('p',{class:'note',style:'margin:4px 0 8px'},'Kies alle audiobestanden van één of meer talen tegelijk. De bestandsnaam bepaalt bij welke tekst de opname hoort (bijvoorbeeld ar-48-d3fd1cd2ff0ec01c-Het lokaal.mp3; de titel achteraan mag). Bestaande opnames worden vervangen.'),h('label',{class:'btn'},'Bestanden kiezen',fi),log);
 fi.onchange=async()=>{
  const files=[...fi.files];if(!files.length)return;
  const known=new Map();// lang|hash -> nl-tekst
  const texts=allTexts().concat(Object.values(S.options).map(o=>o.t));
  for(const l of S.langs)for(const o of texts){const t=textOf(o,l.c);if(t)known.set(l.c+'|'+textHash(t),o.nl);}
  let ok=0,skip=[],fail=[];log.textContent='Bezig… 0 van '+files.length;
  for(const f of files){
   const m=f.name.match(/^([a-z]{2,3})-\d+-([0-9a-f]{16})(?:[-_ ].*)?\.(mp3|m4a|wav|ogg)$/i);
   if(!m){skip.push(f.name+' (naam niet herkend)');continue;}
   const l=m[1].toLowerCase(),hash=m[2].toLowerCase(),ext=m[3].toLowerCase();
   if(!known.has(l+'|'+hash)){skip.push(f.name+' (tekst bestaat niet of is gewijzigd)');continue;}
   if(f.size>5*1024*1024){skip.push(f.name+' (groter dan 5 MB)');continue;}
   const path=`${l}/${hash}.${ext}`;
   const up=await sb.storage.from('audio').upload(path,f,{upsert:true,contentType:f.type||'audio/mpeg'});
   if(up.error){fail.push(f.name+': '+up.error.message);continue;}
   const {error}=await sb.from('audio').upsert({lang:l,text_hash:hash,path,source:'opname'});
   if(error){fail.push(f.name+': '+error.message);continue;}
   AUD.set(l+'|'+hash,sb.storage.from('audio').getPublicUrl(path).data.publicUrl+'?v='+Date.now());ok++;
   log.textContent='Bezig… '+(ok+skip.length+fail.length)+' van '+files.length;
  }
  log.textContent=`Klaar: ${ok} opname(s) gekoppeld.`+(skip.length?`\nOvergeslagen (${skip.length}):\n`+skip.join('\n'):'')+(fail.length?`\nMislukt (${fail.length}):\n`+fail.join('\n'):'');
  toast(ok+' opname(s) gekoppeld');fi.value='';
  // talenchips en 'eigen opname' bijwerken; de uitslag blijft staan
  if(ok){const msg=log.textContent;renderEditor();const nl=document.querySelector('#editor .bulklog');if(nl)nl.textContent=msg;}
 };
 // alle opnames van één taal verwijderen
 const sel=h('select',{class:'input',style:'width:auto','aria-label':'Taal'});S.langs.forEach(l=>sel.append(h('option',{value:l.c},l.n)));
 const delAll=h('button',{class:'btn danger',type:'button'},'Alle opnames van deze taal verwijderen');
 sel.onchange=()=>{delete delAll.dataset.sure;delAll.textContent='Alle opnames van deze taal verwijderen';};
 delAll.onclick=async()=>{
  const l=sel.value;const {data,error}=await sb.from('audio').select('lang,text_hash,path').eq('lang',l);
  if(error){toast('Lukte niet: '+error.message);return;}
  if(!data.length){log.textContent='Er zijn geen eigen opnames voor '+L(l).n+'.';return;}
  if(!delAll.dataset.sure){delAll.dataset.sure='1';delAll.textContent=`Zeker? ${data.length} opname(s) van ${L(l).n} verwijderen`;return;}
  delAll.disabled=true;const n=await deleteAudioRows(data);delAll.disabled=false;delete delAll.dataset.sure;delAll.textContent='Alle opnames van deze taal verwijderen';
  const msg=`${n} opname(s) van ${L(l).n} verwijderd. Deze taal gebruikt nu weer de stem van het toestel.`;toast(n+' opname(s) verwijderd');renderEditor();const nl=document.querySelector('#editor .bulklog');if(nl)nl.textContent=msg;
 };
 box.append(h('div',{style:'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px'},sel,delAll));
 return box;
}
/* Opname verwijderen: bestand uit de opslag en de koppeling uit de tabel. Daarna leest de app weer met de stem van het toestel voor. */
async function deleteAudioRows(rows){
 const paths=rows.map(r=>r.path).filter(Boolean);
 if(paths.length){const rm=await sb.storage.from('audio').remove(paths);if(rm.error){toast('Verwijderen lukte niet: '+rm.error.message);return 0;}}
 let n=0;for(const r of rows){const {error}=await sb.from('audio').delete().eq('lang',r.lang).eq('text_hash',r.text_hash);if(error){toast('Verwijderen lukte niet: '+error.message);continue;}AUD.delete(r.lang+'|'+r.text_hash);n++;}
 return n;
}
async function deleteAudio(o,l){
 const hash=textHash(textOf(o,l)||'');
 const {data,error}=await sb.from('audio').select('lang,text_hash,path').eq('lang',l).eq('text_hash',hash);
 if(error){toast('Verwijderen lukte niet: '+error.message);return false;}
 return (await deleteAudioRows(data||[]))>0;
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
  let del=null;
  if(hasRec){del=h('button',{class:'btn small danger',type:'button',title:'Eigen opname verwijderen; daarna leest de stem van het toestel voor'},'Opname verwijderen');
   del.onclick=async()=>{if(!del.dataset.sure){del.dataset.sure='1';del.textContent='Zeker? Klik nog eens';return;}del.disabled=true;if(await deleteAudio(o,l.c)){toast('Opname verwijderd');drawDetail();}else del.disabled=false;};}
  detail.append(h('div',{class:'trow'},h('span',{class:'ln',dir:l.dir},l.n),ti,h('div',{class:'meta'},chipEl,au,sayBtn(o,l.c,'sm'),h('label',{class:'up'},hasRec?'Opname vervangen':'Opname uploaden',fi),del,isNl?null:h('label',{class:'chk'},ck,'gecontroleerd'))));
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
 ed.append(bulkAudioPanel());
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
  if(q.type==='matrix'){const rows=h('div',{class:'rows'});(q.rows||[]).forEach((r,ri)=>{const x=h('button',{class:'btn small',type:'button','aria-label':'Stelling verwijderen'},'✕');x.onclick=()=>{q.rows.splice(ri,1);save();renderEditor();};const box=h('div',{class:'tf'},textField(r.t,'Stelling '+(ri+1)));
   const cm=h('input',{type:'checkbox'});cm.checked=!!r.comment;cm.onchange=()=>{r.comment=cm.checked;save();};
   const fuOn=h('input',{type:'checkbox'});fuOn.checked=!!r.followup;
   fuOn.onchange=()=>{if(fuOn.checked){const t=E();t.nl='Wat is de reden?';r.followup={when:[],scale:Object.keys(S.scales)[0],other:null,req:true,t};}else delete r.followup;save();renderEditor();};
   box.append(h('div',{class:'qhead'},h('label',{class:'chk'},cm,'ruimte voor korte toelichting'),h('label',{class:'chk'},fuOn,'extra vraag (b) bij bepaalde antwoorden')));
   if(r.followup){const fu=r.followup;const fb=h('div',{class:'tf-detail'});
    fb.append(h('b',{style:'font-size:13px'},'Extra vraag (b) tonen bij:'),h('div',{class:'qhead'},(S.scales[q.scale]?.o||[]).map(o=>{const c=h('input',{type:'checkbox'});c.checked=(fu.when||[]).includes(o);c.onchange=()=>{fu.when=(S.scales[q.scale].o).filter(x=>x===o?c.checked:(fu.when||[]).includes(x));save();};return h('label',{class:'chk'},c,optLbl(o));})));
    fb.append(textField(fu.t,'Vraag b'));
    const fs=h('select',{class:'input',style:'max-width:280px','aria-label':'Antwoordschaal vraag b'});Object.entries(S.scales).forEach(([k,v])=>fs.append(h('option',{value:k},v.n)));fs.value=fu.scale;fs.onchange=()=>{fu.scale=fs.value;save();renderEditor();};
    const fo=h('select',{class:'input',style:'max-width:220px','aria-label':'Optie met tekstvak'});fo.append(h('option',{value:''},'– geen –'));(S.scales[fu.scale]?.o||[]).forEach(o=>fo.append(h('option',{value:o},optLbl(o))));fo.value=fu.other||'';fo.onchange=()=>{fu.other=fo.value||null;save();};
    fb.append(h('div',{class:'qhead'},h('span',{class:'note'},'Antwoorden:'),fs,h('span',{class:'note'},'Tekstvak bij:'),fo));
    box.append(fb);}
   rows.append(h('div',{class:'rowline'},box,x));});
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
 const uic=h('div',{class:'qcard'});const UIL={toelichting:'Stelling – vraag om toelichting',andersToel:'Vraag b – "anders" toelichten',welkomTitel:'Welkom – titel',welkomTekst:'Welkom – tekst',taalHint:'Uitleg taalknop',jijKoos:'Subvraag – eerder antwoord',start:'Knop start',volgende:'Knop volgende',terug:'Knop terug',versturen:'Knop versturen',vraagVan:'Voortgang ({n} en {t} laten staan)',typHier:'Open vraag – invulhulp',eigenTaal:'Open vraag – eigen taal',bedanktTitel:'Bedankt – titel',bedanktTekst:'Bedankt – tekst'};
 Object.entries(S.ui).forEach(([k,o])=>uic.append(textField(o,UIL[k]||k)));ed.append(uic);

 ed.append(h('div',{class:'ed-sec'},h('h2',null,'Talen'),h('span',{class:'note'},'Nieuwe taal toevoegen: daarna “Vertaal gewijzigde teksten”.')));
 const lc=h('div',{class:'qcard'});
 lc.append(h('div',{class:'chips'},S.langs.map(l=>h('span',{class:'chip',dir:l.dir},l.n+' ('+l.c+')'))));
 const lcode=h('input',{class:'input',placeholder:'code, bijv. pt',style:'max-width:140px','aria-label':'Taalcode'}),lname=h('input',{class:'input',placeholder:'naam in eigen taal, bijv. Português',style:'max-width:260px','aria-label':'Naam taal'}),lrtl=h('input',{type:'checkbox'});
 const ladd=h('button',{class:'btn small',type:'button'},'Taal toevoegen');ladd.onclick=()=>{const c=lcode.value.trim().toLowerCase();if(!/^[a-z]{2,3}$/.test(c)||!lname.value.trim()||S.langs.some(l=>l.c===c)){toast('Vul een nieuwe taalcode (2 of 3 letters) en naam in.');return;}S.langs.push({c,n:lname.value.trim(),dir:lrtl.checked?'rtl':'ltr',bcp:c});save();renderEditor();toast(lname.value.trim()+' toegevoegd. Alle teksten staan op “ontbreekt”.');};
 lc.append(h('div',{class:'qhead'},lcode,lname,h('label',{class:'chk'},lrtl,'rechts-naar-links'),ladd));ed.append(lc);

 /* ---- Vestigingen (eerst) ---- */
 ensureKlassen();
 ed.append(h('div',{class:'ed-sec'},h('h2',null,'Vestigingen'),h('span',{class:'note'},'"Herkenbaar aan" bepaalt bij welke vestiging een klas hoort: een code of woord dat los in de klasnaam staat. Bijvoorbeeld "BW" (BW-A2, MAP-BW-MIX2) of "Bolder" (Z-route De Bolder). Meerdere mogelijk, gescheiden door een komma.')));
 const vc=h('div',{class:'qcard'});
 S.vestigingen.forEach((v,vi)=>{
  const c=h('input',{class:'input',value:v.c,'aria-label':'Code'}),n=h('input',{class:'input',value:v.n,'aria-label':'Naam'}),p=h('input',{class:'input',value:v.prefix||'','aria-label':'Beginletters klas',placeholder:'bijv. BW of Bolder',title:'Code of woord in de klasnaam. Meerdere mogelijk, gescheiden door een komma.'});
  c.oninput=()=>{v.c=c.value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');save();syncV();};
  n.oninput=()=>{v.n=n.value;save();syncV();};
  p.onchange=()=>{v.prefix=p.value.trim();assignKlassen();save();syncV();renderEditor();};
  const x=h('button',{class:'btn small',type:'button','aria-label':'Vestiging verwijderen'},'✕');x.onclick=()=>{if(x.dataset.sure){S.vestigingen.splice(vi,1);assignKlassen();save();syncV();renderEditor();}else{x.dataset.sure='1';x.textContent='Zeker?';}};
  vc.append(h('div',{class:'vrow vrow2'},h('div',{class:'field'},h('label',null,'Code (in link)'),c),h('div',{class:'field'},h('label',null,'Naam'),n),h('div',{class:'field'},h('label',null,'Herkenbaar aan'),p),h('div',{class:'field'},h('label',null,'Klassen'),h('span',{class:'chip',style:'justify-self:start;margin-top:8px'},(v.groepen||[]).length)),x));
 });
 const va=h('button',{class:'btn small',type:'button'},'+ Vestiging');va.onclick=()=>{S.vestigingen.push({c:'NIEUW',n:'Nieuwe vestiging',prefix:'',groepen:[]});save();syncV();renderEditor();};vc.append(h('div',null,va));ed.append(vc);

 /* ---- Klassen (daarna) ---- */
 ed.append(h('div',{class:'ed-sec'},h('h2',null,'Klassen'),h('span',{class:'note'},'Importeer een Excel-lijst of typ de klassen hieronder, één per regel. De vestiging wordt automatisch gekozen op basis van de beginletters. Let op: wijzig je een klasnaam, dan werkt de oude link van die klas niet meer.')));
 const kc=h('div',{class:'qcard'});
 // import
 const fi=h('input',{type:'file',accept:'.xlsx,.xls,.csv'});
 const prev=h('div',{class:'tf-detail'});prev.hidden=true;
 fi.onchange=async()=>{const f=fi.files[0];if(!f)return;
  try{const wb=XLSX.read(await f.arrayBuffer(),{type:'array'});const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''});
   let col=0,start=0;
   for(let r=0;r<Math.min(6,rows.length);r++){const hi=(rows[r]||[]).findIndex(x=>/klas|groep|class|cursus/i.test(String(x)));if(hi>=0){col=hi;start=r+1;break;}}
   const list=splitKlassen(rows.slice(start).map(r=>String(r[col]??'')));
   showImport(list);}catch(e){toast('Dit bestand kon niet worden gelezen: '+e.message);}
  fi.value='';};
 function showImport(list){prev.innerHTML='';prev.hidden=false;
  const per={};const none=[];list.forEach(k=>{const v=vestigingVoor(k);if(v)(per[v.c]=per[v.c]||[]).push(k);else none.push(k);});
  prev.append(h('b',null,list.length+' klassen gevonden'));
  S.vestigingen.forEach(v=>{if(per[v.c])prev.append(h('div',null,h('b',null,v.n+': '),per[v.c].join(', ')));});
  if(none.length)prev.append(h('div',{class:'err'},'Geen vestiging herkend voor: '+none.join(', ')+'. Na het importeren kies je hiervoor zelf de vestiging.'));
  const add=h('button',{class:'btn small primary',type:'button'},'Toevoegen aan bestaande klassen');
  add.onclick=()=>{S.klassen=[...new Set(S.klassen.concat(list))];assignKlassen();save();syncV();renderEditor();toast(list.length+' klassen geïmporteerd');};
  const rep=h('button',{class:'btn small',type:'button'},'Bestaande klassen vervangen');
  rep.onclick=()=>{if(!rep.dataset.sure){rep.dataset.sure='1';rep.textContent='Zeker? Oude klassen verdwijnen';return;}S.klassen=list;assignKlassen();save();syncV();renderEditor();toast('Klassenlijst vervangen');};
  const no=h('button',{class:'btn small',type:'button'},'Annuleren');no.onclick=()=>{prev.hidden=true;};
  prev.append(h('div',{style:'display:flex;flex-wrap:wrap;gap:8px'},add,rep,no));}
 kc.append(h('div',{class:'qhead'},h('label',{class:'up',style:'font-size:14px;padding:8px 12px'},'📄 Excel-lijst importeren (.xlsx of .csv)',fi),h('span',{class:'note'},'De klassen staan in de eerste kolom, of in een kolom met de kop "Klas".')),prev);
 // handmatig
 const ta=h('textarea',{class:'input',rows:Math.min(14,Math.max(4,S.klassen.length+1)),'aria-label':'Alle klassen',placeholder:'bijv.\nAlk-A2-jongeren\nBW-A2 examentraining\nH-Alfa 1'});ta.value=S.klassen.join('\n');
 ta.onchange=()=>{S.klassen=splitKlassen(ta.value.split('\n'));assignKlassen();save();syncV();renderEditor();};
 kc.append(h('div',{class:'field'},h('label',null,'Alle klassen (één per regel)'),ta));
 // overzicht
 const ov=h('div',{class:'tf-detail'});S.vestigingen.forEach(v=>ov.append(h('div',null,h('b',null,v.n+' ('+(v.groepen||[]).length+'): '),(v.groepen||[]).join(', ')||'–')));
 const none=S.klassen.filter(k=>!vestigingVoor(k));
 if(none.length){ov.append(h('div',{class:'err'},'Kies de vestiging voor deze klassen:'));
  none.forEach(k=>{const sel=h('select',{class:'input',style:'max-width:220px','aria-label':'Vestiging voor '+k},h('option',{value:''},'– kies vestiging –'),S.vestigingen.map(v=>h('option',{value:v.c},v.n)));
   sel.onchange=()=>{S.klasVestiging=S.klasVestiging||{};S.klasVestiging[k]=sel.value;assignKlassen();save();syncV();renderEditor();};
   ov.append(h('div',{class:'qhead'},h('span',{style:'min-width:200px'},k),sel));});}
 const handm=Object.keys(S.klasVestiging||{}).filter(k=>S.klassen.includes(k)&&S.klasVestiging[k]);
 if(handm.length)ov.append(h('div',{class:'note'},'Zelf ingedeeld: ',handm.map(k=>{const b=h('button',{class:'chip',type:'button',title:'Klik om de handmatige keuze te wissen'},k+' → '+vName(S.klasVestiging[k])+' ✕');b.onclick=()=>{delete S.klasVestiging[k];assignKlassen();save();syncV();renderEditor();};return b;})));
 kc.append(h('div',{class:'field'},h('label',null,'Indeling per vestiging'),ov));
 ed.append(kc);
 renderKoppelingen(ed);
}
/* Beheerder: overzicht van alle koppelingen docent ↔ groep */
async function renderKoppelingen(ed){
 const sec=h('div',{class:'ed-sec'},h('h2',null,'Docenten en hun groepen'),h('span',{class:'note'},'Een docent wordt gekoppeld zodra hij de link van een groep deelt. Per groep kan maar één docent gekoppeld zijn. Verwijder hier een koppeling als een groep naar een andere docent gaat.'));
 const card=h('div',{class:'qcard'},h('span',{class:'note'},'Laden…'));ed.append(sec,card);
 const {data,error}=await sb.from('docent_groep').select('email,vestiging,groep,created_at').order('email');
 card.innerHTML='';if(error){card.append(h('span',{class:'err'},'Laden lukte niet: '+error.message));return;}
 if(!data.length){card.append(h('span',{class:'note'},'Nog geen koppelingen.'));return;}
 const tb=h('table',{class:'simple'});tb.append(h('thead',null,h('tr',null,h('th',null,'Docent'),h('th',null,'Vestiging'),h('th',null,'Groep'),h('th',null,'Sinds'),h('th',null,''))));
 const body=h('tbody');data.forEach(k=>{const x=h('button',{class:'btn small',type:'button'},'Verwijder');
  x.onclick=async()=>{if(!x.dataset.sure){x.dataset.sure='1';x.textContent='Zeker?';return;}const {error}=await sb.from('docent_groep').delete().eq('email',k.email).eq('vestiging',k.vestiging).eq('groep',k.groep);if(error){toast('Lukte niet: '+error.message);return;}tr.remove();};
  const tr=h('tr',null,h('td',null,k.email),h('td',null,vName(k.vestiging)),h('td',null,k.groep),h('td',null,new Date(k.created_at).toLocaleDateString('nl-NL')),h('td',null,x));body.append(tr);});
 tb.append(body);card.append(h('div',{class:'tablewrap'},tb));
}
/* Klassen automatisch indelen op beginletters (langste match wint: "HW" gaat voor "H") */
function vestigingVoor(k){
 const hand=(S.klasVestiging||{})[k];if(hand){const v=S.vestigingen.find(x=>x.c===hand);if(v)return v;}
 // de vestigingscode is een los stukje van de naam (gescheiden door - of spatie), bijv. "BW-A2", "MAP-BW-MIX2", "H-Alfa 1"
 const tokens=k.toLowerCase().split(/[-\s_\/]+/).filter(Boolean);
 const herk=v=>(v.prefix||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
 for(const t of tokens){const v=S.vestigingen.find(x=>herk(x).includes(t));if(v)return v;}
 return null;}
/* Klassen opschonen: ';' splitst, '*)' en dubbele spaties weg, dubbele klassen één keer */
function splitKlassen(cells){return [...new Set(cells.flatMap(c=>String(c).split(';')).map(x=>x.replace(/\*\)/g,'').replace(/\s+/g,' ').trim()).filter(Boolean))];}
function assignKlassen(){S.vestigingen.forEach(v=>v.groepen=[]);(S.klassen||[]).forEach(k=>{const v=vestigingVoor(k);if(v)v.groepen.push(k);});}
function ensureKlassen(){
 const DEF={ALK:'Alk',HHW:'HW',BEV:'BW',VEL:'V',HRN:'H'};
 S.vestigingen.forEach(v=>{if(v.prefix==null)v.prefix=DEF[v.c]||'';if(!v.c&&/alkmaar/i.test(v.n)){v.c='ALK';v.prefix=v.prefix||'Alk';}});
 if(!S.vestigingen.some(v=>/texel/i.test(v.n))){S.vestigingen.push({c:'TXL',n:'Texel',prefix:'Bolder',groepen:[]});save();}
 if(!Array.isArray(S.klassen)){S.klassen=[];S.vestigingen.forEach(v=>(v.groepen||[]).forEach(g=>S.klassen.push(g)));}

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

function colsDef(){const c=[];S.questions.forEach((q,i)=>{if(q.type==='matrix')(q.rows||[]).forEach(r=>{const k=q.id+'.'+r.id;c.push({key:k,h:`${qNum(i)}. ${q.t.nl} ${r.t.nl}`,q});
   if(r.comment)c.push({key:k+'.toel',h:`${qNum(i)}. ${r.t.nl} – toelichting`,q:{type:'open'}});
   if(r.followup){c.push({key:k+'.b',h:`${qNum(i)}b. ${r.t.nl} – ${r.followup.t.nl}`,q:{type:'choice'}});if(r.followup.other)c.push({key:k+'.b.anders',h:`${qNum(i)}b. ${r.t.nl} – anders, namelijk`,q:{type:'open'}});}});else c.push({key:q.id,h:`${qNum(i)}. ${q.t.nl}`,q});});return c;}
function rowOf(d,cols){const dt=new Date(d.ts);const o={'Datum':dt.toLocaleDateString('nl-NL'),'Tijd':dt.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}),'Vestiging':vName(d.v),'Groep':d.g,'Taal':L(d.lang).n};
 cols.forEach(c=>{const a=d.ans[c.key];o[c.h]=a==null?'':c.q.type==='stars'?a:c.q.type==='open'?a:(S.options[a]?S.options[a].t.nl:a);});return o;}
$('#rsExport').onclick=()=>{
 if(ROLE!=='beheerder'){toast('Exporteren kan alleen de beheerder.');return;}
 if(typeof XLSX==='undefined'){toast('Excel-bibliotheek niet geladen.');return;}
 const cols=colsDef(),all=filtered();if(!all.length){toast('Geen reacties in deze selectie.');return;}
 const wb=XLSX.utils.book_new();
 const mk=rows=>{const ws=XLSX.utils.json_to_sheet(rows.map(d=>rowOf(d,cols)),{header:['Datum','Tijd','Vestiging','Groep','Taal',...cols.map(c=>c.h)]});ws['!cols']=[{wch:11},{wch:6},{wch:14},{wch:20},{wch:12},...cols.map(()=>({wch:18}))];if(rows.length)ws['!autofilter']={ref:ws['!ref']};return ws;};
 XLSX.utils.book_append_sheet(wb,overzicht(all),'Overzicht');
 XLSX.utils.book_append_sheet(wb,mk(all),'Alle');
 const used=new Set(['Alle']);
 S.vestigingen.forEach(v=>{const rows=all.filter(d=>d.v===v.c);let name=v.n.replace(/[\\\/\?\*\[\]:]/g,'').slice(0,31)||v.c;if(used.has(name))name=(v.c+' '+name).slice(0,31);used.add(name);XLSX.utils.book_append_sheet(wb,mk(rows),name);});
 XLSX.writeFile(wb,'cursistenevaluatie_ruwe_data_'+new Date().toISOString().slice(0,10)+'.xlsx');
};

/* Overzicht: per vraag en antwoord het aantal en percentage, totaal en per vestiging */
function overzicht(all){
 const vs=S.vestigingen.filter(v=>all.some(d=>d.v===v.c));
 const head=['Vraag','Antwoord','Aantal (alle)','% (alle)',...vs.flatMap(v=>[v.n+' (aantal)',v.n+' (%)'])];
 const rows=[head];
 const block=(label,key,opts,lbl)=>{
  const tot=all.filter(d=>d.ans[key]!=null&&d.ans[key]!=='');const per=vs.map(v=>tot.filter(d=>d.v===v.c));
  opts.forEach((o,i)=>{const n=tot.filter(d=>d.ans[key]===o).length;
   rows.push([i===0?label:'',lbl[i],n,tot.length?Math.round(n/tot.length*1000)/10:0,...per.flatMap(p=>{const m=p.filter(d=>d.ans[key]===o).length;return[m,p.length?Math.round(m/p.length*1000)/10:0];})]);});
  rows.push(['','Aantal antwoorden',tot.length,'',...per.flatMap(p=>[p.length,''])]);rows.push([]);};
 S.questions.forEach((q,i)=>{
  if(q.type==='choice'||q.type==='matrix'){const sc=S.scales[q.scale];if(!sc)return;const lbl=sc.o.map(o=>S.options[o]?S.options[o].t.nl:o);
   if(q.type==='matrix')(q.rows||[]).forEach(r=>{block(`${qNum(i)}. ${q.t.nl} ${r.t.nl}`,q.id+'.'+r.id,sc.o,lbl);
    if(r.followup&&S.scales[r.followup.scale]){const fo=S.scales[r.followup.scale].o;block(`${qNum(i)}b. ${r.t.nl} – ${r.followup.t.nl}`,q.id+'.'+r.id+'.b',fo,fo.map(o=>S.options[o]?S.options[o].t.nl:o));}});else block(`${qNum(i)}. ${q.t.nl}`,q.id,sc.o,lbl);}
  else if(q.type==='stars')block(`${qNum(i)}. ${q.t.nl}`,q.id,[1,2,3,4,5],['1 ster ('+q.low.nl+')','2 sterren','3 sterren','4 sterren','5 sterren ('+q.high.nl+')']);
 });
 const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=[{wch:60},{wch:26},{wch:12},{wch:9},...vs.flatMap(()=>[{wch:12},{wch:9}])];return ws;}

/* Rapport als PDF: de browser maakt er een PDF van via afdrukken */
$('#rsPrint').onclick=()=>{
 if(ROLE!=='beheerder')return;
 const v=$('#rsV'),g=$('#rsG'),f=$('#rsFrom').value,t=$('#rsTo').value;
 $('#rsPrintHead').innerHTML='';
 $('#rsPrintHead').append(h('img',{src:'logo.png',alt:'EdINOVA'}),h('h1',null,'Cursistenevaluatie'),h('p',null,
  'Vestiging: '+(v.value?v.options[v.selectedIndex].text:'alle')+' · Klas: '+(g.value||'alle')+' · Periode: '+(f||'begin')+' t/m '+(t||'vandaag')+' · Gemaakt op '+new Date().toLocaleDateString('nl-NL')));
 window.print();
};

/* Resultaten leegmaken (alleen beheerder): verwijdert de reacties van de huidige selectie */
$('#rsClear').onclick=()=>{
 if(ROLE!=='beheerder')return;
 const box=$('#rsClearBox'),sel=filtered(),v=$('#rsV'),g=$('#rsG'),f=$('#rsFrom').value,t=$('#rsTo').value;
 box.innerHTML='';box.hidden=false;
 if(!sel.length){box.append(h('b',null,'Er zijn geen reacties in deze selectie.'),' ',Object.assign(h('button',{class:'btn small',type:'button'},'Sluiten'),{onclick:()=>{box.hidden=true;}}));return;}
 const wat='Vestiging: '+(v.value?v.options[v.selectedIndex].text:'alle')+' · Klas: '+(g.value||'alle')+' · Periode: '+(f||'begin')+' t/m '+(t||'vandaag');
 const ok=h('button',{class:'btn small danger',type:'button'},'Ja, '+sel.length+' reacties definitief verwijderen');
 const dl=h('button',{class:'btn small',type:'button'},'Eerst Excel downloaden');dl.onclick=()=>$('#rsExport').click();
 const no=h('button',{class:'btn small',type:'button'},'Annuleren');no.onclick=()=>{box.hidden=true;};
 ok.onclick=async()=>{
  if(!ok.dataset.sure){ok.dataset.sure='1';ok.textContent='Weet je het zeker? Klik nog een keer om te verwijderen';return;}
  ok.disabled=true;ok.textContent='Bezig met verwijderen…';
  const ids=sel.map(d=>d.id);let fout=null;
  for(let i=0;i<ids.length&&!fout;i+=200){const {error}=await sb.from('responses').delete().in('id',ids.slice(i,i+200));if(error)fout=error;}
  box.hidden=true;
  if(fout)toast('Verwijderen lukte niet: '+fout.message,6000);else toast(sel.length+' reacties verwijderd.');
  loadResults();
 };
 box.append(h('b',null,'Je staat op het punt '+sel.length+' reacties te verwijderen.'),
  h('p',{class:'note',style:'margin:4px 0 8px'},wat+'. Dit kan niet ongedaan worden gemaakt. Download eerst de Excel als je de gegevens wilt bewaren. Wil je maar een deel verwijderen? Kies dan eerst een vestiging, klas of periode.'),
  h('div',{style:'display:flex;flex-wrap:wrap;gap:8px'},dl,ok,no));
};

start();
