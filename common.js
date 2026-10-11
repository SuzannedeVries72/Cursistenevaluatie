"use strict";
/* Gedeelde functies voor cursist- en beheerpagina */
const $=s=>document.querySelector(s);
function h(tag,attrs,...kids){const e=document.createElement(tag);if(attrs)for(const[k,v]of Object.entries(attrs)){if(v==null||v===false)continue;if(k==='class')e.className=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(k==='html')e.innerHTML=v;else if(v===true)e.setAttribute(k,'');else e.setAttribute(k,v);}for(const c of kids.flat()){if(c==null||c===false)continue;e.append(c.nodeType?c:document.createTextNode(String(c)));}return e;}
function toast(msg,ms){const t=h('div',{class:'toast',role:'status'},msg);document.body.append(t);setTimeout(()=>t.remove(),ms||3600);}
const SPK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const GLOBE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>';
const PIN='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
const STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"/></svg>';
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

/* Supabase */
const CFG=window.APP_CONFIG||{};
const sb=(window.supabase&&CFG.SUPABASE_URL&&!/VUL-IN/.test(CFG.SUPABASE_URL))?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_KEY):null;

/* Vragenlijst (S) wordt uit de database geladen */
let S=null;
async function loadConfig(){
 if(!sb)throw new Error('Supabase is nog niet ingesteld (js/config.js).');
 const {data,error}=await sb.from('survey_config').select('data,updated_at').eq('id',1).maybeSingle();
 if(error)throw error;
 S=data?data.data:defaultState();
 migrateConfig();
 return data;
}
function qNum(i){let n=0,sub=0;for(let j=0;j<=i;j++){if(S.questions[j].sub&&j>0){sub++;}else{n++;sub=0;}}return sub?n+String.fromCharCode(96+sub+1):String(n);}
const L=c=>S.langs.find(l=>l.c===c)||S.langs[0];
const others=()=>S.langs.filter(l=>l.c!=='nl');
function status(o,l){if(l==='nl')return'bron';if(!o[l])return'leeg';if((o._src||{})[l]!==o.nl)return'verouderd';if((o._chk||{})[l])return'ok';return'concept';}
const STLBL={ok:'gecontroleerd',concept:'concept',verouderd:'verouderd',leeg:'ontbreekt'};
function valid(o,l){return l==='nl'||(o[l]&&(o._src||{})[l]===o.nl);}
function tx(o,l){return valid(o,l)?o[l]:o.nl;}
function txLang(o,l){return valid(o,l)?l:'nl';}
function allTexts(){const a=[];for(const[k,o]of Object.entries(S.ui))a.push(o);
 for(const q of S.questions){a.push(q.t);(q.rows||[]).forEach(r=>{a.push(r.t);if(r.followup&&r.followup.t)a.push(r.followup.t);});if(q.low)a.push(q.low);if(q.high)a.push(q.high);}
 const used=new Set();for(const sc of Object.values(S.scales))sc.o.forEach(id=>used.add(id));used.forEach(id=>S.options[id]&&a.push(S.options[id].t));return a;}
const vName=c=>(S.vestigingen.find(v=>v.c===c)||{n:c}).n;
const slug=s=>String(s).trim().replace(/\s+/g,'-');

/* Audio: eigen opname (Supabase Storage) gaat voor; anders de voorleesstem van het toestel.
   Een opname hoort bij precies één tekst: de sleutel is taal + hash van de tekst. */
function textHash(str){let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<str.length;i++){const c=str.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677);}
 h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
 return(h2>>>0).toString(16).padStart(8,'0')+(h1>>>0).toString(16).padStart(8,'0');}
const AUD=new Map(); // `${lang}|${hash}` -> publieke URL
async function loadAudio(lang){
 if(!sb)return;let q=sb.from('audio').select('lang,text_hash,path');if(lang)q=q.in('lang',[lang,'nl']);
 const {data,error}=await q;if(error){console.warn(error);return;}
 (data||[]).forEach(r=>AUD.set(r.lang+'|'+r.text_hash,sb.storage.from('audio').getPublicUrl(r.path).data.publicUrl));
}
function textOf(o,lang){return lang==='nl'?o.nl:o[lang];}
let voices=[];function loadVoices(){try{voices=speechSynthesis.getVoices()||[]}catch(e){voices=[]}}
try{loadVoices();speechSynthesis.onvoiceschanged=loadVoices;}catch(e){}
function voiceFor(l){const bcp=(L(l).bcp||l).toLowerCase(),p=bcp.split('-')[0];return voices.find(v=>v.lang&&v.lang.toLowerCase().replace('_','-')===bcp)||voices.find(v=>v.lang&&v.lang.toLowerCase().startsWith(p));}
let curBtn=null,curAudio=null;
function stopAudio(){try{speechSynthesis.cancel()}catch(e){} if(curAudio){curAudio.pause();curAudio=null;} if(curBtn){curBtn.classList.remove('playing');curBtn=null;}}
function play(o,l,btn){
 const lang=txLang(o,l),raw=textOf(o,lang)||'',text=raw.replace(/\{n\}|\{t\}/g,'');
 const wasSame=curBtn===btn&&btn;stopAudio();if(wasSame)return;
 if(btn){btn.classList.add('playing');curBtn=btn;}
 const done=()=>{if(btn)btn.classList.remove('playing');if(curBtn===btn)curBtn=null;};
 const rec=AUD.get(lang+'|'+textHash(raw));
 if(rec){curAudio=new Audio(rec);curAudio.onended=done;curAudio.onerror=done;curAudio.play().catch(done);return;}
 const v=voiceFor(lang);
 if(!('speechSynthesis' in window)||!v){done();toast(lang==='nl'?'Voorlezen is niet beschikbaar op dit toestel.':'🔇');return;}
 const u=new SpeechSynthesisUtterance(text);u.voice=v;u.lang=v.lang;u.rate=.9;u.onend=done;u.onerror=done;speechSynthesis.speak(u);
}
function sayBtn(o,l,cls){const b=h('button',{class:'say '+(cls||''),type:'button','aria-label':'Luister',html:SPK});b.addEventListener('click',e=>{e.stopPropagation();play(o,l,b);});return b;}

/* Aanvullingen in een bestaande vragenlijst zetten (elke stap één keer):
   v2: toelichting bij 'Het lokaal' en 'Het lesmateriaal', extra vraag bij 'Aantal cursisten in de klas'
   v3: extra vraag bij 'Aantal lesuren per week' (meer/minder uren)
   v4: knop 'Klaar' en melding 'al ingevuld' */
/* 11-10: Oekraïens (uk) vervangen door Russisch (ru). Russische tekst uit de standaardlijst als de Nederlandse tekst gelijk is; anders leeg. */
function ukNaarRu(d){
 const ru={};(function w(o){if(!o||typeof o!=='object')return;if(typeof o.nl==='string'&&'ru' in o){ru[o.nl]=o.ru;return;}for(const k in o)w(o[k]);})(d);
 const i=S.langs.findIndex(l=>l.c==='uk');const dl=d.langs.find(l=>l.c==='ru');
 if(i>=0)S.langs[i]=dl;else if(!S.langs.some(l=>l.c==='ru'))S.langs.push(dl);
 (function w(o){if(!o||typeof o!=='object')return;if(typeof o.nl==='string'){
   if('uk' in o||!('ru' in o)){delete o.uk;o._src=o._src||{};o._chk=o._chk||{};delete o._src.uk;delete o._chk.uk;
    o.ru=ru[o.nl]||'';o._src.ru=o.nl;o._chk.ru=false;}return;}
  for(const k in o)w(o[k]);})(S);
}
function migrateConfig(){
 const d=defaultState(),v=S._versie||0;
 const q2=S.questions.find(q=>q.id==='q2'),dq2=d.questions.find(q=>q.id==='q2');
 const addOpt=ks=>ks.forEach(k=>{if(!S.options[k])S.options[k]=d.options[k];});
 if(v<2){
  ['toelichting','andersToel'].forEach(k=>{if(!S.ui[k])S.ui[k]=d.ui[k];});
  addOpt(['tveel','tweinig','pveel','pweinig','anders']);
  if(!S.scales.klasreden)S.scales.klasreden=d.scales.klasreden;
  if(q2&&q2.rows){['r1','r2'].forEach(id=>{const r=q2.rows.find(x=>x.id===id);if(r&&r.comment==null)r.comment=true;});
   const r3=q2.rows.find(x=>x.id==='r3');if(r3&&!r3.followup)r3.followup=dq2.rows.find(x=>x.id==='r3').followup;}
 }
 if(v<3){
  addOpt(['meeruren','minderuren']);
  if(!S.scales.urenwens)S.scales.urenwens=d.scales.urenwens;
  const r4=q2&&q2.rows&&q2.rows.find(x=>x.id==='r4');if(r4&&!r4.followup)r4.followup=dq2.rows.find(x=>x.id==='r4').followup;
 }
 if(v<4){['klaarKnop','alIngevuld'].forEach(k=>{if(!S.ui[k])S.ui[k]=d.ui[k];});}
 if(v<6){S.ui.taalHint=d.ui.taalHint;}   // taalkeuze op het welkomstscherm
 if(v<7)ukNaarRu(d);
 S._versie=7;
}
