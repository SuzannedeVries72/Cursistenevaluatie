"use strict";
/* ---- grafieken: per vraagtype een eigen vorm ---- */
const SVGNS='http://www.w3.org/2000/svg';
function sv(tag,attrs,...kids){const e=document.createElementNS(SVGNS,tag);for(const[k,v]of Object.entries(attrs||{}))if(v!=null)e.setAttribute(k,v);kids.flat().forEach(c=>c!=null&&e.append(c.nodeType?c:document.createTextNode(String(c))));return e;}
const pct=(a,b)=>b?Math.round(a/b*100):0;
const short=s=>s.replace(/ per week$/,'');
function palette(sk,n){
 const P2={f:'var(--c-pos2)',k:'var(--on-strong)'},P1={f:'var(--c-pos1)',k:'var(--ink)'},M={f:'var(--c-mid)',k:'var(--ink)'},N1={f:'var(--c-neg1)',k:'var(--ink)'},N2={f:'var(--c-neg2)',k:'var(--on-strong)'};
 if(sk==='uren6')return[1,2,3,4,5,6].map(i=>({f:`var(--s${i})`,k:i>=4?'var(--on-strong)':'var(--ink)'}));
 if(sk==='jnw')return[P2,N2,M];
 if(sk==='genoeg3')return[P2,N2,M];
 if(n===2)return[P2,N2];if(n===3)return[P2,M,N2];if(n===4)return[P2,P1,N1,N2];if(n===5)return[P2,P1,M,N1,N2];
 return Array.from({length:n},(_,i)=>i<n/2-.5?P2:i>n/2-.5?N2:M);
}
function legend(labels,cols,counts,tot){return h('div',{class:'legend'},labels.map((l,i)=>h('span',null,h('i',{style:'background:'+cols[i].f}),l+(counts?` · ${pct(counts[i],tot)}%`:''))));}
function tipAttrs(t){return{'data-tip':t,tabindex:'0'};}
function countsFor(D,key,opts){const vals=D.map(d=>d.ans[key]).filter(v=>v!=null&&v!=='');return{counts:opts.map(o=>vals.filter(x=>x===o).length),tot:vals.length};}
const optLbl=o=>S.options[o]?S.options[o].t.nl:o;

function chartDonut(counts,tot,labels,cols,headTxt){
 const R=58,W=22,C=2*Math.PI*R;let off=0;const g=sv('g',{transform:'rotate(-90 80 80)'});
 g.append(sv('circle',{cx:80,cy:80,r:R,fill:'none',stroke:'var(--sunk)','stroke-width':W}));
 counts.forEach((c,i)=>{if(!c)return;const len=c/tot*C;const seg=sv('circle',{cx:80,cy:80,r:R,fill:'none',stroke:cols[i].f,'stroke-width':W,'stroke-dasharray':`${Math.max(len-2,0.5)} ${C}`,'stroke-dashoffset':-off,...tipAttrs(`${labels[i]}: ${c} (${pct(c,tot)}%)`)});g.append(seg);off+=len;});
 const top=counts[0]+(counts[1]||0);
 const svg=sv('svg',{viewBox:'0 0 160 160',width:160,height:160,role:'img','aria-label':headTxt},g,
  sv('text',{x:80,y:80,'text-anchor':'middle',class:'svg-big'},pct(top,tot)+'%'),
  sv('text',{x:80,y:100,'text-anchor':'middle',class:'svg-sub'},headTxt));
 return h('div',{class:'donut-wrap'},svg,h('div',{class:'donut-list'},labels.map((l,i)=>h('div',{class:'dl-row'},h('i',{style:'background:'+cols[i].f}),h('span',null,l),h('b',null,pct(counts[i],tot)+'%'),h('small',null,counts[i])))));
}
function chartDiverging(items,labels,cols){
 const n=labels.length,half=Math.floor(n/2),hasMid=n%2===1;
 const rows=items.map(it=>{const t=it.tot||1;const s=it.counts.map(c=>c/t*100);const pos=s.slice(0,half),neg=s.slice(n-half),mid=hasMid?s[half]:0;return{...it,s,pos,neg,mid,P:pos.reduce((a,b)=>a+b,0),N:neg.reduce((a,b)=>a+b,0)};});
 const L=Math.max(...rows.map(r=>r.N+r.mid/2),1),Rr=Math.max(...rows.map(r=>r.P+r.mid/2),1),span=L+Rr,cx=L/span*100;
 const box=h('div',{class:'div-chart'});
 box.append(h('div',{class:'div-head'},h('span',null),h('div',{class:'div-axis'},h('span',{style:`left:0`},'← minder goed'),h('span',{style:`right:0`},'beter →'))));
 rows.forEach(r=>{const track=h('div',{class:'div-track'},h('i',{class:'div-zero',style:`left:${cx}%`}));
  let x=cx-(r.mid/2)/span*100;
  // links: neg1 dichtbij midden, neg2 verder weg
  let lx=x;for(let j=0;j<half;j++){const idx=n-half+j;const w=r.s[idx]/span*100;lx-=w;track.append(seg(idx,lx,w));}
  if(hasMid){const w=r.mid/span*100;track.append(seg(half,x,w));x+=w;}
  for(let j=half-1;j>=0;j--){const w=r.s[j]/span*100;track.append(seg(j,x,w));x+=w;}
  function seg(i,left,w){return h('i',{class:'div-seg',style:`left:${left}%;width:${Math.max(w-0.4,0)}%;background:${cols[i].f};color:${cols[i].k}`,...tipAttrs(`${r.lbl} — ${labels[i]}: ${r.counts[i]} (${Math.round(r.s[i])}%)`)},w>=9?Math.round(r.s[i])+'%':'');}
  box.append(h('div',{class:'div-row'},h('span',{class:'lbl',title:r.lbl},r.lbl),track));});
 return h('div',null,box,legend(labels,cols));
}
function chartHeat(items,labels){
 const tb=h('table',{class:'heat'});tb.append(h('thead',null,h('tr',null,h('th',null,''),labels.map(l=>h('th',null,l)))));
 const body=h('tbody');items.forEach(it=>{const tr=h('tr',null,h('th',{scope:'row',title:it.lbl},it.lbl));it.counts.forEach((c,i)=>{const p=it.tot?c/it.tot:0;const a=(0.06+Math.min(p,0.8)*0.85).toFixed(2);
  tr.append(h('td',{style:`background:rgba(var(--heat-rgb),${a});color:var(--ink)`,...tipAttrs(`${it.lbl} — ${labels[i]}: ${c} (${pct(c,it.tot)}%)`)},pct(c,it.tot)+'%'));});body.append(tr);});
 tb.append(body);return h('div',{class:'tablewrap'},tb,h('div',{class:'note',style:'margin-top:6px'},'Hoe donkerder het vak, hoe vaker dit antwoord is gekozen.'));
}
function chartLollipop(items,labels){
 const rows=items.map(it=>({lbl:it.lbl,v:pct((it.counts[0]||0)+(it.counts[1]||0),it.tot),tot:it.tot})).sort((a,b)=>b.v-a.v);
 const box=h('div',{class:'lolli'});
 box.append(h('div',{class:'note'},`% cursisten dat “${labels[0].toLowerCase()}” of “${labels[1].toLowerCase()}” kiest`));
 rows.forEach(r=>box.append(h('div',{class:'lol-row'},h('span',{class:'lbl',title:r.lbl},r.lbl),h('div',{class:'lol-track',...tipAttrs(`${r.lbl}: ${r.v}%`)},h('i',{class:'lol-line',style:`width:${r.v}%`}),h('i',{class:'lol-dot',style:`left:${r.v}%`})),h('b',{class:'n'},r.v+'%'))));
 box.append(h('div',{class:'lol-row axis'},h('span'),h('div',{class:'lol-ticks'},['0%','50%','100%'].map(t=>h('span',null,t))),h('span')));
 return box;
}
function chartColumns(counts,tot,labels,cols,opts={}){
 const max=Math.max(...counts,1);const box=h('div',{class:'cols'});
 counts.forEach((c,i)=>box.append(h('div',{class:'col',...tipAttrs(`${labels[i]}: ${c} (${pct(c,tot)}%)`)},h('span',{class:'cv'},opts.abs?c:pct(c,tot)+'%'),h('i',{style:`height:${c/max*100}%;background:${cols[i].f}`}),h('span',{class:'cl'},opts.short?opts.short[i]:labels[i]))));
 return box;
}
function chartGauge(avg,n,low,high){
 const cx=110,cy=104,R=84,W=18;const ang=v=>Math.PI*(1-(v-1)/4);const pt=(a,r)=>[cx+r*Math.cos(a),cy-r*Math.sin(a)];
 const arc=(v0,v1)=>{const[a0,a1]=[ang(v0),ang(v1)];const[x0,y0]=pt(a0,R),[x1,y1]=pt(a1,R);return`M${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;};
 const svg=sv('svg',{viewBox:'0 0 220 132',width:'100%',style:'max-width:300px',role:'img','aria-label':`Gemiddeld ${avg.toFixed(1)} van 5`},
  sv('path',{d:arc(1,5),fill:'none',stroke:'var(--sunk)','stroke-width':W,'stroke-linecap':'round'}),
  sv('path',{d:arc(1,Math.max(1.02,avg)),fill:'none',stroke:'var(--c-pos2)','stroke-width':W,'stroke-linecap':'round'}),
  sv('text',{x:cx,y:cy-14,'text-anchor':'middle',class:'svg-big'},avg.toFixed(1).replace('.',',')),
  sv('text',{x:cx,y:cy+6,'text-anchor':'middle',class:'svg-sub'},'van 5 sterren'),
  sv('text',{x:cx-R,y:cy+24,'text-anchor':'middle',class:'svg-sub'},low),
  sv('text',{x:cx+R,y:cy+24,'text-anchor':'middle',class:'svg-sub'},high));
 return h('div',{class:'gauge',...tipAttrs(`Gemiddeld ${avg.toFixed(2).replace('.',',')} (${n} reacties)`)},svg);
}
function chartWaffle(counts,tot,labels,cols){
 const raw=counts.map(c=>tot?c/tot*100:0);const base=raw.map(Math.floor);let rest=100-base.reduce((a,b)=>a+b,0);
 raw.map((r,i)=>[r-base[i],i]).sort((a,b)=>b[0]-a[0]).forEach(([_,i])=>{if(rest>0){base[i]++;rest--;}});
 const grid=h('div',{class:'waffle',role:'img','aria-label':labels.map((l,i)=>l+' '+base[i]+'%').join(', ')});
 base.forEach((k,i)=>{for(let j=0;j<k;j++)grid.append(h('i',{style:'background:'+cols[i].f,...(j===0?tipAttrs(`${labels[i]}: ${counts[i]} (${base[i]}%)`):{} )}));});
 return h('div',{class:'waffle-wrap'},grid,h('div',{class:'donut-list'},labels.map((l,i)=>h('div',{class:'dl-row'},h('i',{style:'background:'+cols[i].f}),h('span',null,l),h('b',null,base[i]+'%'),h('small',null,counts[i])))),h('div',{class:'note',style:'grid-column:1/-1'},'Elk vakje is 1% van de cursisten.'));
}
function chartStrip(counts,tot,labels,cols){
 const bar=h('div',{class:'strip'});counts.forEach((c,i)=>{const w=tot?c/tot*100:0;if(c)bar.append(h('i',{style:`width:${w}%;background:${cols[i].f};color:${cols[i].k}`,...tipAttrs(`${labels[i]}: ${c} (${pct(c,tot)}%)`)},w>=12?`${labels[i]} ${Math.round(w)}%`:''));});
 return h('div',{class:'strip-wrap'},h('div',{class:'hero'},h('b',null,pct(counts[0],tot)+'%'),h('span',null,`zegt “${labels[0].toLowerCase()}”`)),bar,legend(labels,cols,counts,tot));
}
function chartRanked(rows,unit){const max=Math.max(...rows.map(r=>r.v),1);const box=h('div',{class:'ranked'});rows.forEach(r=>box.append(h('div',{class:'rk-row',...tipAttrs(`${r.lbl}: ${r.v}${unit||''}`)},h('span',{class:'lbl',dir:'auto'},r.lbl),h('div',{class:'rk-track'},h('i',{style:`width:${r.v/max*100}%`})),h('b',{class:'n'},r.v))));return box;}

function renderResults(){
 const gsel=$('#rsG'),cur=gsel.value,v=$('#rsV').value;const groups=[...new Set(data().filter(d=>!v||d.v===v).map(d=>d.g))].sort();gsel.innerHTML='';gsel.append(h('option',{value:''},'Alle groepen'));groups.forEach(g=>gsel.append(h('option',{value:g},g)));if(groups.includes(cur))gsel.value=cur;
 const D=filtered();const k=$('#rsKpis');k.innerHTML='';
 const q4=D.map(d=>d.ans.q4).filter(Number);const lc={};D.forEach(d=>lc[d.lang]=(lc[d.lang]||0)+1);const topL=Object.entries(lc).sort((a,b)=>b[1]-a[1])[0];
 k.append(h('div',{class:'kpi'},h('b',null,D.length),h('span',null,'reacties')),h('div',{class:'kpi'},h('b',null,new Set(D.map(d=>d.v+'|'+d.g)).size),h('span',null,'groepen')),
  h('div',{class:'kpi'},h('b',null,q4.length?(q4.reduce((a,b)=>a+b,0)/q4.length).toFixed(1).replace('.',','):'–'),h('span',null,'gem. sterren docent (vraag 4)')),
  h('div',{class:'kpi'},h('b',null,topL?L(topL[0]).n:'–'),h('span',null,'meest gekozen taal'+(topL?' ('+Math.round(topL[1]/D.length*100)+'%)':''))));
 const grid=$('#rsGrid');grid.innerHTML='';
 if(!D.length){grid.append(h('div',{class:'rcard',style:'grid-column:1/-1'},h('b',null,'Nog geen reacties in deze selectie')));return;}
 if(D.length<5)grid.append(h('div',{class:'rcard',style:'grid-column:1/-1'},h('b',null,'Minder dan 5 reacties'),h('span',{class:'note'},'Deel deze uitslag niet los: bij zo weinig reacties zijn antwoorden mogelijk te herleiden tot een cursist.')));

 // overzicht: respons per vestiging (kolommen) en per taal (gerangschikt)
 const vc=S.vestigingen.map(x=>({lbl:x.n,v:D.filter(d=>d.v===x.c).length}));
 const one={f:'var(--c-pos2)'};
 grid.append(h('div',{class:'rcard'},h('h3',null,'Reacties per vestiging'),chartColumns(vc.map(x=>x.v),D.length,vc.map(x=>x.lbl),vc.map(()=>one),{abs:true})));
 grid.append(h('div',{class:'rcard'},h('h3',null,'Gekozen taal'),chartRanked(S.langs.map(l=>({lbl:l.n,v:lc[l.c]||0})).filter(r=>r.v).sort((a,b)=>b.v-a.v),' reacties')));

 const seen={matrix:0,stars:0,jnw:0};
 S.questions.forEach((q,i)=>{const card=h('div',{class:'rcard'});const title=qNum(i)+'. '+q.t.nl;card.append(h('h3',null,title));
  if(q.type==='choice'||q.type==='matrix'){const sc=S.scales[q.scale];if(!sc)return;const labels=sc.o.map(optLbl),cols=palette(q.scale,sc.o.length);
   if(q.type==='matrix'){const items=(q.rows||[]).map(r=>({lbl:r.t.nl,...countsFor(D,q.id+'.'+r.id,sc.o)}));const m=seen.matrix++%3;
    if(m===0){card.append(h('p',{class:'csub'},'Positief rechts van de lijn, negatief links.'),chartDiverging(items,labels,cols));}
    else if(m===1){card.style.gridColumn='1/-1';card.append(chartHeat(items,labels));}
    else{card.append(chartLollipop(items,labels));}}
   else{const {counts,tot}=countsFor(D,q.id,sc.o);if(!tot){card.append(h('div',{class:'note'},'Nog geen antwoorden'));grid.append(card);return;}
    if(sc.o.length>=6){card.append(h('p',{class:'csub'},'Verdeling van de antwoorden.'),chartColumns(counts,tot,labels,cols,{short:labels.map(short)}));}
    else if(sc.o.length<=3){const m=seen.jnw++%2;card.append(m===0?chartWaffle(counts,tot,labels,cols):chartStrip(counts,tot,labels,cols));}
    else card.append(chartDonut(counts,tot,labels,cols,(labels[0]+' + '+(labels[1]||'')).toLowerCase()));}}
  else if(q.type==='stars'){const vals=D.map(d=>d.ans[q.id]).filter(Number);if(!vals.length){card.append(h('div',{class:'note'},'Nog geen antwoorden'));grid.append(card);return;}
   const avg=vals.reduce((a,b)=>a+b,0)/vals.length;const counts=[1,2,3,4,5].map(s=>vals.filter(x=>x===s).length);const cols=palette('',5).slice().reverse();
   if(seen.stars++%2===0){card.append(h('div',{class:'hero'},h('b',null,avg.toFixed(1).replace('.',',')+' ★'),h('span',null,'gemiddeld, '+vals.length+' reacties')),chartColumns(counts,vals.length,['1 ster','2 sterren','3 sterren','4 sterren','5 sterren'],cols,{short:['1★','2★','3★','4★','5★']}),h('div',{class:'ends note'},h('span',null,'1★ = '+q.low.nl),h('span',null,'5★ = '+q.high.nl)));}
   else{card.append(chartGauge(avg,vals.length,q.low.nl,q.high.nl),h('p',{class:'csub',style:'text-align:center'},pct(counts[3]+counts[4],vals.length)+'% geeft 4 of 5 sterren'));}}
  else{const items=D.filter(d=>d.ans[q.id]);card.style.gridColumn='1/-1';
   const list=h('div',{class:'open-list'});items.forEach(d=>list.append(h('div',{dir:'auto'},d.ans[q.id],h('small',{dir:'ltr'},vName(d.v)+' · '+d.g+' · '+L(d.lang).n+(d.lang!=='nl'?' · in productie automatisch vertaald':'')))));
   card.append(h('p',{class:'csub'},items.length+' van de '+D.length+' cursisten schreven iets.'),items.length?list:h('div',{class:'note'},'Nog geen antwoorden'));}
  grid.append(card);});
}
/* tooltip */
const TIP=h('div',{class:'tip',role:'tooltip'});TIP.hidden=true;document.body.append(TIP);
function showTip(el,x,y){TIP.textContent=el.getAttribute('data-tip');TIP.hidden=false;const r=TIP.getBoundingClientRect();TIP.style.left=Math.min(Math.max(8,x-r.width/2),innerWidth-r.width-8)+'px';TIP.style.top=Math.max(8,y-r.height-12)+'px';}
document.addEventListener('pointermove',e=>{const el=e.target.closest&&e.target.closest('[data-tip]');if(el)showTip(el,e.clientX,e.clientY);else TIP.hidden=true;});
document.addEventListener('focusin',e=>{const el=e.target.closest&&e.target.closest('[data-tip]');if(el){const r=el.getBoundingClientRect();showTip(el,r.left+r.width/2,r.top);}});
document.addEventListener('focusout',()=>TIP.hidden=true);
