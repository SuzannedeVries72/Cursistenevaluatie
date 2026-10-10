"use strict";
/* Cursistweergave: leest vestiging (v) en groep (g) uit de link, toont de vragenlijst en slaat het antwoord op in Supabase. */
const params=new URLSearchParams(location.search);
const CTX={v:(params.get('v')||'').toUpperCase(),gSlug:params.get('g')||'',g:''};
const DONE_KEY=()=>'eval-klaar|'+CTX.v+'|'+CTX.gSlug;
const DRAFT_KEY=()=>'eval-concept|'+CTX.v+'|'+CTX.gSlug;
const C={lang:'nl',step:0,ans:{},auto:false,sheet:false,sending:false};
const LANGWORD={nl:'Taal',en:'Language',ar:'اللغة',fa:'زبان',ti:'ቋንቋ',uk:'Мова',tr:'Dil',so:'Luqad'};

function steps(){const s=[{k:'welkom'}];S.questions.forEach(q=>{if(q.type==='matrix')(q.rows||[]).forEach(r=>s.push({k:'q',q,r,key:q.id+'.'+r.id}));else s.push({k:'q',q,key:q.id});});s.push({k:'klaar'});return s;}
function saveDraft(){store.set(DRAFT_KEY(),{lang:C.lang,step:C.step,ans:C.ans,auto:C.auto});}

function renderPhone(noAuto){
 const ph=$('#phone'),st=steps();if(C.step>=st.length)C.step=st.length-1;const cur=st[C.step],lg=L(C.lang);
 document.documentElement.lang=lg.c;ph.innerHTML='';
 const autoBtn=h('button',{class:'iconbtn'+(C.auto?' on':''),type:'button','aria-pressed':C.auto?'true':'false','aria-label':'Voorlezen',html:SPK+'<span>'+(C.auto?'ON':'OFF')+'</span>'});
 autoBtn.onclick=()=>{C.auto=!C.auto;saveDraft();renderPhone();};
 const langBtn=h('button',{class:'iconbtn',type:'button',html:GLOBE+'<span>'+lg.c.toUpperCase()+'</span>','aria-label':'Taal kiezen'});langBtn.onclick=()=>{C.sheet=true;renderPhone(true);};
 ph.append(h('div',{class:'ph-top'},h('div',{class:'ctx',html:PIN},h('span',null,vName(CTX.v)+' · '+CTX.g)),autoBtn,langBtn));
 const body=h('main',{class:'ph-body',dir:lg.dir,lang:lg.c});ph.append(body);
 const nav=h('div',{class:'ph-nav',dir:lg.dir});
 let main=null;
 if(cur.k==='welkom'){
  main=S.ui.welkomTitel;
  body.append(h('div',{class:'qtext'},h('h1',{class:'t'},tx(S.ui.welkomTitel,C.lang)),sayBtn(S.ui.welkomTitel,C.lang)));
  body.append(h('div',{class:'qtext'},h('p',{class:'t',style:'font-size:18px;font-weight:400;margin:0'},tx(S.ui.welkomTekst,C.lang)),sayBtn(S.ui.welkomTekst,C.lang)));
  const lb=h('button',{class:'langbig',type:'button',html:GLOBE},h('span',null,S.langs.map(l=>LANGWORD[l.c]||l.n).join(' · ')));
  lb.onclick=()=>{C.sheet=true;renderPhone(true);};body.append(lb);
  body.append(h('div',{class:'qtext'},h('p',{class:'t',style:'font-size:15px;font-weight:400;margin:0;color:var(--muted)'},tx(S.ui.taalHint,C.lang)),sayBtn(S.ui.taalHint,C.lang,'sm')));
  const sbtn=h('button',{class:'btn primary',type:'button'},tx(S.ui.start,C.lang));sbtn.onclick=()=>{C.step=1;saveDraft();renderPhone();};nav.append(sbtn);
 } else if(cur.k==='klaar'){
  main=S.ui.bedanktTitel;
  body.append(h('div',{class:'thanks'},h('div',{class:'big'},'🎉'),h('div',{class:'qtext'},h('h1',{class:'t'},tx(S.ui.bedanktTitel,C.lang)),sayBtn(S.ui.bedanktTitel,C.lang)),h('div',{class:'qtext'},h('p',{class:'t',style:'font-size:17px;font-weight:400;margin:0'},tx(S.ui.bedanktTekst,C.lang)),sayBtn(S.ui.bedanktTekst,C.lang,'sm'))));
  const again=h('button',{class:'btn',type:'button'},'↺');again.setAttribute('aria-label','Opnieuw invullen (ander persoon op deze telefoon)');again.title='Opnieuw invullen (ander persoon op deze telefoon)';
  again.onclick=()=>{C.step=0;C.ans={};saveDraft();renderPhone();};nav.append(again);
 } else {
  const n=C.step,t=st.length-2,q=cur.q;
  body.append(h('div',{class:'progress',role:'progressbar','aria-valuenow':n,'aria-valuemin':1,'aria-valuemax':t},h('i',{style:`width:${Math.round(n/t*100)}%`})));
  body.append(h('div',{class:'stepof'},tx(S.ui.vraagVan,C.lang).replace('{n}',n).replace('{t}',t)));
  if(cur.r){body.append(h('div',{class:'qtext parent'},h('div',{class:'t'},tx(q.t,C.lang)),sayBtn(q.t,C.lang,'sm')));
   body.append(h('div',{class:'qtext'},h('h1',{class:'t'},tx(cur.r.t,C.lang)),sayBtn(cur.r.t,C.lang)));main=cur.r.t;}
  else{const qi=S.questions.indexOf(q),par=q.sub&&qi>0?S.questions[qi-1]:null;
   if(par&&par.type!=='matrix'){body.append(h('div',{class:'qtext parent'},h('div',{class:'t'},tx(par.t,C.lang)),sayBtn(par.t,C.lang,'sm')));
    const pa=C.ans[par.id];if(pa!=null&&pa!==''){const pt=par.type==='stars'?pa+' ★':par.type==='open'?pa:(S.options[pa]?tx(S.options[pa].t,C.lang):pa);
     body.append(h('div',{class:'yours'},h('span',null,tx(S.ui.jijKoos,C.lang)),h('b',null,pt)));}}
   body.append(h('div',{class:'qtext'},h('h1',{class:'t'},tx(q.t,C.lang)),sayBtn(q.t,C.lang)));main=q.t;}
  const a=C.ans[cur.key];
  if(q.type==='choice'||q.type==='matrix'){
   const box=h('div',{class:'opts',role:'radiogroup'});
   (S.scales[q.scale]?.o||[]).forEach(oid=>{const op=S.options[oid];if(!op)return;
    const b=h('button',{class:'choice',type:'button',role:'radio','aria-pressed':a===oid?'true':'false','aria-checked':a===oid?'true':'false'},op.e?h('span',{class:'em'},op.e):null,h('span',null,tx(op.t,C.lang)));
    b.onclick=()=>{C.ans[cur.key]=oid;saveDraft();renderPhone(true);};
    box.append(h('div',{class:'opt'},b,sayBtn(op.t,C.lang,'sm')));});
   body.append(box);
  } else if(q.type==='stars'){
   const row=h('div',{class:'stars',dir:'ltr'});
   for(let i=1;i<=5;i++){const b=h('button',{class:'star'+(a>=i?' on':''),type:'button','aria-label':i+' / 5',html:STAR});b.onclick=()=>{C.ans[cur.key]=i;saveDraft();renderPhone(true);};row.append(b);}
   body.append(row);
   body.append(h('div',{class:'ends',dir:'ltr'},h('span',{class:'end'},sayBtn(q.low,C.lang,'sm'),tx(q.low,C.lang)),h('span',{class:'end'},tx(q.high,C.lang),sayBtn(q.high,C.lang,'sm'))));
  } else if(q.type==='open'){
   const ta=h('textarea',{class:'answer',id:'openAns',maxlength:'2000',placeholder:tx(S.ui.typHier,C.lang),dir:'auto'});ta.value=a||'';ta.oninput=()=>{C.ans[cur.key]=ta.value;saveDraft();upd();};
   body.append(ta);body.append(h('div',{class:'qtext'},h('p',{class:'t',style:'font-size:14px;font-weight:400;margin:0;color:var(--muted)'},tx(S.ui.eigenTaal,C.lang)),sayBtn(S.ui.eigenTaal,C.lang,'sm')));
  }
  const back=h('button',{class:'btn',type:'button'},tx(S.ui.terug,C.lang));back.onclick=()=>{C.step--;saveDraft();renderPhone();};
  const last=C.step===st.length-2;
  const next=h('button',{class:'btn primary',type:'button'},C.sending?'…':tx(last?S.ui.versturen:S.ui.volgende,C.lang));
  const upd=()=>{const v=C.ans[cur.key];next.disabled=C.sending||(q.req&&(v==null||v===''));};upd();
  next.onclick=async()=>{if(last){if(!(await submit()))return;}C.step++;saveDraft();renderPhone();window.scrollTo(0,0);};
  nav.append(back,next);
 }
 ph.append(nav);
 if(C.sheet){
  const sh=h('div',{class:'sheet',role:'dialog','aria-label':'Taal kiezen'});const inn=h('div',{class:'in'});
  const close=h('button',{class:'iconbtn',type:'button','aria-label':'Sluiten'},'✕');close.onclick=()=>{C.sheet=false;renderPhone(true);};
  inn.append(h('div',{class:'ph-top',style:'border:0;padding:0 0 6px'},h('b',{style:'flex:1;font-size:18px'},'🌐 '+S.langs.map(l=>LANGWORD[l.c]).filter(Boolean).slice(0,2).join(' · ')),close));
  S.langs.forEach(l=>{const b=h('button',{class:'choice',type:'button','aria-pressed':l.c===C.lang?'true':'false',dir:l.dir,lang:l.c},l.n);
   b.onclick=async()=>{C.lang=l.c;C.sheet=false;stopAudio();saveDraft();renderPhone();loadAudio(l.c);};
   inn.append(h('div',{class:'langopt'},b,sayBtn({nl:l.n,[l.c]:l.n,_src:{[l.c]:l.n}},l.c,'sm')));});
  sh.onclick=e=>{if(e.target===sh){C.sheet=false;renderPhone(true);}};sh.append(inn);ph.append(sh);
 }
 if(C.auto&&main&&!noAuto){setTimeout(()=>{const b=ph.querySelector('.ph-body .qtext:not(.parent) .say');if(b)play(main,C.lang,b);},250);}
}

async function submit(){
 if(C.sending)return false;C.sending=true;renderPhone(true);
 const antwoorden={};for(const[k,v]of Object.entries(C.ans)){if(v!==''&&v!=null)antwoorden[k]=typeof v==='string'?v.slice(0,2000):v;}
 const {error}=await sb.from('responses').insert({vestiging:CTX.v,groep:CTX.g,taal:C.lang,antwoorden});
 C.sending=false;
 if(error){console.error(error);renderPhone(true);toast('⚠️ Versturen lukte niet. Controleer je internet en probeer opnieuw. / Sending failed, please try again.',6000);return false;}
 store.set(DONE_KEY(),new Date().toISOString());C.ans={};return true;
}

function fatal(msg){$('#phone').innerHTML='';$('#phone').append(h('main',{class:'ph-body'},h('div',{class:'thanks'},h('div',{class:'big'},'🔗'),h('h1',null,msg),h('p',{class:'note'},'Vraag je docent om de juiste link.'))));}

(async function boot(){
 try{await loadConfig();}catch(e){console.error(e);fatal('De vragenlijst kan nu niet worden geladen.');return;}
 const v=S.vestigingen.find(x=>x.c===CTX.v);const g=v&&(v.groepen||[]).find(x=>slug(x).toLowerCase()===CTX.gSlug.toLowerCase());
 if(!v||!g){fatal('Deze link is niet compleet of niet meer geldig.');return;}
 CTX.g=g;document.title='Evaluatie · '+v.n;
 const d=store.get(DRAFT_KEY());if(d){C.lang=S.langs.some(l=>l.c===d.lang)?d.lang:'nl';C.ans=d.ans||{};C.auto=!!d.auto;C.step=Math.min(d.step||0,steps().length-1);}
 if(store.get(DONE_KEY())&&!Object.keys(C.ans).length)C.step=steps().length-1;
 renderPhone(true);loadAudio(C.lang).then(()=>{});
})();
