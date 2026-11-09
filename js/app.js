/* Your progress, the maths, drawing the page, and the buttons. */
/* state */
const KEY="orion-road-v4";
const FILT_OK=["","close","fresh","done","f-max","f-prest","f-gold","f-plat","f-hb"];
const blank=()=>({v:4,updated:0,skip:{},goal:{l:null,mp:false,dmz:false,wz:false},tab:"ALL",filt:"",hide:{gold:false,plat:false,hb:false},motion:"smooth",weapons:{},m:{},mt:{},mu:{},col:{},open:null});
const ALLSTEPS=()=>[].concat(...Object.values(TRACKS).map(t=>t.steps));
const unlocked=()=>ALLSTEPS().filter(s=>S.mu[s.id]);
let S=blank(); let Q=""; let VIEW={};
const W=id=>S.weapons[id]||(S.weapons[id]={mil:0,max:false,pr:0,sp:[false,false,false],gold:false,plat:false,hb:false,tok:false});
function load(){ try{ let r=localStorage.getItem(KEY); if(r){ S=Object.assign(blank(),JSON.parse(r)); if(!FILT_OK.includes(S.filt)) S.filt=""; return; }
  r=localStorage.getItem("orion-road-v3"); if(r){ const o=JSON.parse(r); for(const id in o.weapons||{}){ const s=o.weapons[id]; S.weapons[id]={mil:s.mil||0,max:!!s.pr,pr:s.pr?1:0,sp:s.sp||[false,false,false],gold:!!s.gold,plat:!!s.plat,hb:!!s.hb,tok:!!s.tok}; } S.m=o.m||{}; S.mt=o.mt||{}; S.col=o.col||{}; if(o.goal) S.goal=Object.assign(S.goal,{mp:!!o.goal.mp,dmz:!!o.goal.dmz,wz:!!o.goal.wz}); return; }
  r=localStorage.getItem("orion-road-v2"); if(r){ const o=JSON.parse(r); for(const id in o.weapons||{}){ const p=o.weapons[id].p||0; S.weapons[id]={mil:Math.min(8,p),max:false,pr:0,sp:[p>8,p>9,p>10],gold:p>11,plat:p>12,hb:p>13,tok:!!o.weapons[id].tok}; } S.m=o.m||{}; S.mt=o.mt||{}; } }catch(e){} }
function lsSave(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} }

/* derived */
/* Unlocks (Harmonic Break, Divergence) need ANY 33 guns at that level: Season guns count too, unless you skip them.
   Class gates (Platinum = every launch gun in the class at Gold) stay on the launch guns, so an untouched Season gun never blocks them. */
const skipped=w=>!!(w.season&&S.skip&&S.skip[w.id]);
const TRACKED=()=>WEAPONS.filter(w=>!skipped(w));
const cnt=f=>TRACKED().filter(f).length;
const cntB=f=>BASE.filter(f).length;
/* Season guns: extra grind on top of the 33 launch guns. They show as a gold "+N" next to each count, never in the "/33" the game requires */
const SEASON=WEAPONS.filter(w=>w.season);
const bon=f=>{ const n=SEASON.filter(w=>!skipped(w)).filter(f).length; return n?`<em class="bon" title="includes ${n} Season gun${n>1?"s":""}">${n} S1</em>`:""; };
const bonNote=()=>SEASON.length?`<p class="bonnote"><em class="bon">S1</em> Season guns count too: any <b>${BASE.length} guns</b> unlock Harmonic Break and Divergence, so you can pass ${BASE.length}. Skip one from its card.</p>`:"";
const spDone=s=>s.sp.filter(Boolean).length;
const done=s=>s.mil+spDone(s)+(s.gold?1:0)+(s.plat?1:0)+(s.hb?1:0);
/* a class (or All) counts as Gold/Plat/HB once it has as many guns there as it has launch guns: Season guns can stand in, like the 33 rule */
const POOL=c=>TRACKED().filter(w=>c==="ALL"||w.cls===c), NEED=c=>BASE.filter(w=>c==="ALL"||w.cls===c).length;
const reach=(c,k)=>POOL(c).filter(w=>W(w.id)[k]).length>=NEED(c);
const bestSteps=c=>{ const cp=cap(); return POOL(c).map(w=>Math.min(done(W(w.id)),cp)).sort((a,b)=>b-a).slice(0,NEED(c)).reduce((a,b)=>a+b,0); };
function nextUp(c){ const ws=POOL(c), cp=cap(), out=[], t=cnt(w=>W(w.id).plat)>=BASE.length;
  const stage=(k,name,txt,ok)=>{ const r=ws.filter(ok); if(r.length) out.push({k,name,txt,ws:r}); };
  if(cp>=14&&t) stage("hb","Harmonic Break",hbTxt(c),w=>W(w.id).plat&&!W(w.id).hb);
  if(cp>=13&&reach(c,"gold")) stage("plat","Platinum",platTxt(c),w=>W(w.id).gold&&!W(w.id).plat);
  stage("gold","Gold",goldTxt(),w=>{ const s=W(w.id); return s.mil>=8&&spDone(s)===3&&!s.gold; });
  return out; }
function nextHTML(c){ const n=nextUp(c); if(!n.length) return ""; const [a,...rest]=n, pl=CLS[c][0];
  return `<div class="nextup"><span class="sw3 cam cam-${a.k}"></span><div class="nt"><small>Next for ${a.ws.length===POOL(c).length?"every gun":a.ws.length+" gun"+(a.ws.length>1?"s":"")} in ${esc(pl)}</small><b>${a.name} · ${esc(a.txt)}</b>
    <div class="ng">${a.ws.map(w=>`<button data-go="${esc(w.id)}">${esc(w.name)}</button>`).join("")}</div>${rest.map(r=>`<p>Also ready for ${r.name}: ${r.ws.length} gun${r.ws.length>1?"s":""} · ${esc(r.txt)}</p>`).join("")}</div></div>`; }
const classGold=c=>({d:cntB(w=>w.cls===c&&W(w.id).gold),t:cntB(w=>w.cls===c)});
const cap=()=>LCAP[S.goal.l]||14;
const hasGoal=()=>!!S.goal.l;
/* effort model: estimated hours per step, so a maxed gun counts more than one camo tick */
const EFF={mil:2.5,sp:0.6,gold:0.4,plat:{AR:1,SMG:1,PST:1,SG:1.5,LMG:1.5,MR:1.5,SR:1.5,MEL:1.5,LCH:3},hb:{AR:1.2,SMG:1.2,PST:1.2,SG:2,LMG:2,MR:2,SR:2,MEL:2,LCH:5},mast:{md:40,pr:35,or:45,ch:20,rt:25,he:100,pa:60,da:45,em:70}};
function effort(){ const c=cap(); let done=0,total=0;
  for(const w of BASE){ const s=W(w.id); total+=EFF.mil+3*EFF.sp+EFF.gold; done+=EFF.mil*s.mil/8+EFF.sp*spDone(s)+(s.gold?EFF.gold:0);
    if(c>=13){ total+=EFF.plat[w.cls]; if(s.plat) done+=EFF.plat[w.cls]; } if(c>=14){ total+=EFF.hb[w.cls]; if(s.hb) done+=EFF.hb[w.cls]; } }
  const tr=S.goal.l==="div"?Object.keys(TRACKS).filter(k=>S.goal[k]):[];
  for(const k of tr) for(const s of TRACKS[k].steps){ const e=EFF.mast[s.id]||30; total+=e; if(S.mu[s.id]) done+=e; else { const tot=s.edit?(+S.mt[s.id]||0):s.t; if(tot) done+=e*Math.min(1,(+S.m[s.id]||0)/tot); } }
  return {done,total,pct:total?Math.round(100*done/total):0,ladderH:total-tr.reduce((x,k)=>x+TRACKS[k].steps.reduce((y,s)=>y+(EFF.mast[s.id]||30),0),0)};
}
function totals(){
  const t={steps:0,gold:cnt(w=>W(w.id).gold),plat:cnt(w=>W(w.id).plat),hb:cnt(w=>W(w.id).hb),maxed:cnt(w=>W(w.id).mil>=8),prest:cnt(w=>W(w.id).pr>0)};
  const c=cap(); t.steps=bestSteps("ALL");
  t.ladder=t.steps/(BASE.length*c); t.div=t.hb>=BASE.length;
  const tr=S.goal.l==="div"?Object.keys(TRACKS).filter(k=>S.goal[k]):[];
  const tp=k=>{ let a=0; for(const s of TRACKS[k].steps){ if(S.mu[s.id]){a+=1;continue;} const tot=s.edit?(+S.mt[s.id]||0):s.t; if(tot) a+=Math.min(1,(+S.m[s.id]||0)/tot); } return a/3; };
  t.byCount=Math.round((tr.length? t.ladder*0.6+tr.reduce((x,k)=>x+tp(k),0)/tr.length*0.4 : t.ladder)*100);
  const ef=effort(); t.effort=ef; t.overall= S.pctMode==="count"? t.byCount : ef.pct;
  t.tracks=tr; return t;
}
const spName=(w,i)=>((w.specials||[])[i]||{}).name||("Special "+(i+1));
const spText=(w,i)=>{ const s=(w.specials||[])[i]||{}; if(!(s.mp||s.dmz||s.wz)) return "See the challenge on the camo screen."; return both(s.mp,s.dmz,s.wz||(hasM("wz")&&!hasM("mp")&&!hasM("dmz")?(s.mp||s.dmz)+" (Warzone count not published yet)":null)); };
const stepName=(w,i)=>{ if(i<8) return ["Military "+(i+1)+" · "+MIL[i],"Level the gun"]; if(i<11) return [spName(w,i-8),spText(w,i-8)]; if(i===11) return ["Gold",goldTxt()]; if(i===12) return ["Platinum",platTxt(w.cls)]; return ["Harmonic Break",hbTxt(w.cls)]; };
function latest(w){ const s=W(w.id); if(s.hb) return "Harmonic Break"; if(s.plat) return "Platinum"; if(s.gold) return "Gold"; for(let i=2;i>=0;i--) if(s.sp[i]) return spName(w,i); if(s.pr>0) return PYRO[s.pr]; if(s.mil>0) return MIL[s.mil-1]; return null; }
function left(w){ const s=W(w.id); const c=cap(); const L=[]; if(s.mil<8) L.push((8-s.mil)+" military"); for(let i=0;i<3;i++) if(!s.sp[i]) L.push(spName(w,i)); if(!s.gold) L.push("Gold"); if(c>=13&&!s.plat) L.push("Platinum"); if(c>=14&&!s.hb) L.push("Harmonic Break"); return L; }
function goalTitle(){ const t=totals(); return t.tracks.length? t.tracks.map(k=>LAST[k]).join(" + ") : LNAME[S.goal.l]; }

/* ranked next steps */
function nexts(){
  const t=totals(), out=[], c=cap();
  const push=(a,b)=>{ if(out.length<3) out.push([a,b]); };
  for(const w of WEAPONS){ const s=W(w.id); if(s.mil>=8&&spDone(s)===3&&!s.gold) push("Gold run",`${w.name} · ${goldTxt()}.`); }
  if(c>=13) for(const cl of ORDER){ const cg=classGold(cl); if(cg.d===cg.t&&WEAPONS.some(w=>w.cls===cl&&!W(w.id).plat)) push("Platinum sweep",`${CLS[cl][0]} · ${platTxt(cl)}.`); else if(cg.t-cg.d===1){ const l=WEAPONS.find(w=>w.cls===cl&&!W(w.id).gold); push("One Gold from Platinum",`${l.name} · ${left(l).slice(0,3).join(", ")}.`); } }
  if(c>=14&&t.plat>=BASE.length&&!t.div) push("Harmonic Break sweep",`${Math.max(0,BASE.length-t.hb)} left.`);
  if(t.div&&c>=14) for(const k of t.tracks) for(const s of TRACKS[k].steps){ if(!S.mu[s.id]){ const tot=s.edit?(+S.mt[s.id]||0):s.t; push(s.n,`${s.c}${tot?` ×${tot.toLocaleString()}`:""}. Tap "Got it" when it unlocks.`); break; } }
  for(const w of WEAPONS){ const s=W(w.id); if(s.mil>=8&&spDone(s)<3){ const i=s.sp.indexOf(false); push("Camo grind",`${w.name} · ${spName(w,i)}: ${spText(w,i)}${where(spText(w,i))?` (${where(spText(w,i))})`:""}`); } }
  for(const w of WEAPONS){ const s=W(w.id); if(s.mil>0&&s.mil<8) push("Leveling",`${w.name} · ${s.mil}/8.`); }
  if(!out.length){ const f=WEAPONS.find(w=>done(W(w.id))===0); if(f) push("Start",`${f.name}. Finish the class before the next one.`); else push("Done","Nothing left for this goal."); }
  return out;
}

/* render */
const $=s=>document.querySelector(s);
/* morph: update an existing element in place instead of replacing it, so every CSS transition (colour, fill, checkmark, expand) really plays */
const EVP=["onclick","onkeydown","oninput","onchange"];
function tweenText(node,from,to,suffix){ if(node._tw) cancelAnimationFrame(node._tw); const t0=performance.now(); const step=n=>{ const k=Math.min(1,(n-t0)/520); node.data=Math.round(from+(to-from)*(1-Math.pow(1-k,3)))+suffix; if(k<1) node._tw=requestAnimationFrame(step); else node._tw=null; }; node._tw=requestAnimationFrame(step); }
function morph(a,b){
  if(a.nodeType!==b.nodeType||(a.nodeType===1&&a.tagName!==b.tagName)){ a.replaceWith(b); return; }
  if(a.nodeType===3){ if(a.data!==b.data){ const pa=a.parentNode, m1=/^(\d+)(%?)$/.exec(a.data), m2=/^(\d+)(%?)$/.exec(b.data); if(pa&&pa.classList&&pa.classList.contains("tw")&&m1&&m2&&m1[2]===m2[2]&&!document.hidden) tweenText(a,+m1[1],+m2[1],m2[2]); else a.data=b.data; } return; }
  if(a.nodeType!==1) return;
  const keepC=a.classList?[...a.classList].filter(c=>c.startsWith("flash-")):[];
  for(const at of [...a.attributes]) if(!b.hasAttribute(at.name)) a.removeAttribute(at.name);
  for(const at of [...b.attributes]) if(a.getAttribute(at.name)!==at.value) a.setAttribute(at.name,at.value);
  keepC.forEach(c=>a.classList.add(c));
  for(const p of EVP) if(b[p]||a[p]) a[p]=b[p];
  if((a.tagName==="INPUT"||a.tagName==="TEXTAREA")&&document.activeElement!==a&&a.value!==b.value) a.value=b.value;
  const ac=[...a.childNodes].filter(n=>!(n.classList&&n.classList.contains("burst"))), bc=[...b.childNodes];
  for(let i=0;i<bc.length;i++){ if(ac[i]) morph(ac[i],bc[i]); else a.appendChild(bc[i]); }
  for(let i=bc.length;i<ac.length;i++) ac[i].remove();
}
function setHTML(el,html){ const t=document.createElement(el.tagName); t.innerHTML=html; const ac=[...el.childNodes], bc=[...t.childNodes]; for(let i=0;i<bc.length;i++){ if(ac[i]) morph(ac[i],bc[i]); else el.appendChild(bc[i]); } for(let i=bc.length;i<ac.length;i++) ac[i].remove(); }
/* each card remembers the HTML it was last drawn from; a card whose HTML didn't change is left alone (one tap usually changes one gun), only its click handlers are refreshed */
function copyHandlers(a,b){ const an=[a,...a.querySelectorAll("*:not(.burst)")], bn=[b,...b.querySelectorAll("*")]; if(an.length!==bn.length){ morph(a,b); return; } for(let i=0;i<bn.length;i++) for(const p of EVP) if(bn[i][p]||an[i][p]) an[i][p]=bn[i][p]; }
function syncKeyed(host,news){ const old=new Map([...host.children].map(el=>[el.dataset.gun||"",el])); const out=[]; for(const n of news){ const o=n.dataset.gun&&old.get(n.dataset.gun); const sig=n.outerHTML; if(o){ if(o.__sig!==sig){ morph(o,n); o.__sig=sig; } else copyHandlers(o,n); o.classList.remove("in"); out.push(o); } else { n.__sig=sig; n.classList.add("in"); out.push(n); } } for(const el of [...host.children]) if(!out.includes(el)) el.remove(); out.forEach((el,i)=>{ if(host.children[i]!==el) host.insertBefore(el,host.children[i]||null); }); }
let CLOSING=null, LAST_OPEN=null, closeT;
/* unlock bursts: when a gun crosses into Gold, Platinum or Harmonic Break, its tile throws particles in that camo's colours */
const PREV_LV={}; let BURSTS=[];
const BURST_COL={gold:["#ffd25a","#fff1b8","#e2a53a","#ffffff","#ffb347"],plat:["#ffffff","#e9eef5","#b8c4d6","#9fd3ff","#dfe8ff"],hb:["#ff3b3b","#ff8a5c","#ffd0c0","#ffffff","#b30d0d"]};
const REDUCED=()=>S.motion==="lite"||matchMedia("(prefers-reduced-motion: reduce)").matches;
function burst(el,kind,delay){ if(!el||REDUCED()) return; setTimeout(()=>{ try{
  const r=el.getBoundingClientRect(); if(!r.width||r.bottom<0||r.top>innerHeight) return; const dpr=Math.min(2,devicePixelRatio||1);
  const c=document.createElement("canvas"); c.className="burst"; c.width=r.width*dpr; c.height=r.height*dpr; c.style.width=r.width+"px"; c.style.height=r.height+"px"; el.appendChild(c); el.classList.remove("flash-"+kind); void el.offsetWidth; el.classList.add("flash-"+kind);
  const x=c.getContext("2d"); x.scale(dpr,dpr); const cols=BURST_COL[kind]||BURST_COL.gold; const W=r.width,H=r.height; const chip=el.querySelector(".chip"); const cr=chip?chip.getBoundingClientRect():r; const ox=cr.left-r.left+cr.width/2, oy=cr.top-r.top+cr.height/2;
  const N=Math.round(Math.min(160,70+W/6)); const P=[]; for(let i=0;i<N;i++){ const a=Math.random()*Math.PI*2, sp=(kind==="hb"?.35:.25)+Math.random()*(kind==="plat"?.9:1.1); const big=Math.random()<.18; P.push({x:ox+(Math.random()-.5)*cr.width*.6,y:oy+(Math.random()-.5)*cr.height*.6,vx:Math.cos(a)*sp*(W/180),vy:Math.sin(a)*sp*(H/120)-(kind==="hb"?.25:.12),r:big?2.6+Math.random()*3:.8+Math.random()*1.8,c:cols[Math.random()*cols.length|0],l:.7+Math.random()*.6,s:Math.random()*Math.PI*2,big}); }
  const T=1500, t0=performance.now(); x.globalCompositeOperation="lighter";
  const step=now=>{ const k=(now-t0)/T; x.clearRect(0,0,W,H); if(k>=1){ c.remove(); return; }
    for(const p of P){ const e=1-Math.pow(1-Math.min(1,k/p.l),3); const px=p.x+p.vx*e*110, py=p.y+p.vy*e*110+(kind==="hb"?-e*6:e*14*e); const al=Math.max(0,(1-k/p.l))*(p.big?.9:1); if(al<=0) continue; x.globalAlpha=al; x.fillStyle=p.c;
      if(p.big){ const g=x.createRadialGradient(px,py,0,px,py,p.r*3); g.addColorStop(0,p.c); g.addColorStop(1,"rgba(255,255,255,0)"); x.fillStyle=g; x.beginPath(); x.arc(px,py,p.r*3,0,7); x.fill(); }
      else { const tw=.6+.4*Math.sin(now/90+p.s); x.beginPath(); x.arc(px,py,p.r*tw,0,7); x.fill(); } }
    requestAnimationFrame(step); }; requestAnimationFrame(step); }catch(e){} }, delay||0); }
function noteLevels(){ const out=[]; for(const w of WEAPONS){ const lv=levelOf(W(w.id)); const prev=PREV_LV[w.id]; PREV_LV[w.id]=lv; if(prev!==undefined&&lv>prev&&lv>=3) out.push({id:w.id,kind:lv>=5?"hb":lv>=4?"plat":"gold"}); } return out; }
/* clean(): data from the database, a friend, or an imported backup can contain anything.
   Strip the characters that could break out of the page's HTML (<>"'`\\) from every text value,
   drop odd keys, and cap the depth, so friend data can never run code on this page. */
const clean=(v,d=0)=>{ if(d>8) return null; if(typeof v==="string") return v.replace(/[<>"'`\\]/g,""); if(typeof v==="number") return Number.isFinite(v)?v:0; if(typeof v==="boolean"||v==null) return v; if(Array.isArray(v)) return v.slice(0,500).map(x=>clean(x,d+1)); if(typeof v==="object"){ const o={}; for(const k of Object.keys(v).slice(0,500)){ if(/[<>"`\\]/.test(k)||k==="__proto__"||k==="constructor"||k==="prototype") continue; o[k]=clean(v[k],d+1); } return o; } return null; };
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let prevSnap={}, lastTab=null, lastPct=null;
function animNum(el,to){ const from=lastPct==null?to:lastPct; lastPct=to; if(S.motion==="instant"||from===to){ el.textContent=to; return; } const t0=performance.now(); const step=n=>{ const k=Math.min(1,(n-t0)/420); el.textContent=Math.round(from+(to-from)*(1-Math.pow(1-k,3))); if(k<1) requestAnimationFrame(step); }; requestAnimationFrame(step); }
function render(){
  applyMotion(); const q=(Q||"").trim().toLowerCase();
  const t=totals(); if(hasGoal()) animNum($("#pct"),t.overall); else { lastPct=null; $("#pct").textContent="–"; }
  const words=!hasGoal()?[]: t.tracks.length? t.tracks.map(k=>[LAST[k],"cam-"+TRACKS[k].steps[2].id]) : [[LNAME[S.goal.l],{gold:"cam-gold",plat:"cam-plat",div:"cam-div"}[S.goal.l]]];
  const key=words.map(x=>x.join()).join("|")||"none";
  if(!words.length){ if($("#title").dataset.k!=="none"){ $("#title").dataset.k="none"; $("#title").classList.remove("swap"); void $("#title").offsetWidth; $("#title").classList.add("swap"); $("#title").innerHTML=`<em class="nogoal">Pick a goal</em>`; document.title="Orion Road"; } }
  else if($("#title").dataset.k!==key){ $("#title").dataset.k=key; $("#title").classList.remove("swap"); void $("#title").offsetWidth; $("#title").classList.add("swap"); $("#title").style.fontSize=words.length>2?"clamp(32px,6vw,46px)":words.length>1?"clamp(36px,7.5vw,58px)":""; $("#title").innerHTML=words.map(([wd,tex])=>`<em class="ttl" data-tex="${tex}">${esc(wd)}</em>`).join('<span class="plus">+</span>'); document.title="Orion Road · "+goalTitle();
    try{ let pr=$("#probe"); if(!pr){ pr=document.createElement("i"); pr.id="probe"; pr.style.cssText="position:absolute;width:10px;height:10px;left:-999px;top:0"; document.body.appendChild(pr); }
      for(const em of document.querySelectorAll("#title .ttl")){ pr.className="cam "+em.dataset.tex; const cs=getComputedStyle(pr,"::before"); em.style.backgroundImage=cs.backgroundImage; em.style.backgroundColor=cs.backgroundColor; } }catch(e){} }
  const hoursLeft=Math.max(0,Math.round(t.effort.total-t.effort.done));
  $("#pctLabel").innerHTML=!hasGoal()?"choose what you're chasing":(S.pctMode==="count"?`by camo count · <button class="lnk" data-pm="effort">switch to effort</button>`:`weighted by effort · <button class="lnk" data-pm="count">by count: ${t.byCount}%</button>`);
  { const g=hasGoal(); setHTML($("#dtitle"),g?esc(goalTitle()):"Pick a goal"); setHTML($("#dpct"),g?String(t.overall):"–"); $("#dbar").style.width=(g?t.overall:0)+"%";
    setHTML($("#dmode"),!g?"":(S.pctMode==="count"?`by camo count · <button class="lnk" data-pm="effort">by effort</button>`:`by effort · <button class="lnk" data-pm="count">by count: ${t.byCount}%</button>`)); }
  const pb=$("#pbar"); pb.style.width=(hasGoal()?t.overall:0)+"%"; pb.className=t.overall>=100?"cam "+(t.tracks.length?"cam-"+[...t.tracks].reverse().map(k=>TRACKS[k].steps[2].id)[0]:{gold:"cam-gold",plat:"cam-plat",div:"cam-div"}[S.goal.l]):"";
  document.querySelectorAll("#goalL [data-l]").forEach(b=>b.setAttribute("aria-pressed",S.goal.l===b.dataset.l));
  document.querySelectorAll("#modeRow [data-m]").forEach(b=>b.setAttribute("aria-pressed",hasM(b.dataset.m)));
  $("#setup").classList.toggle("nogoal",!S.goal.l); $("#qT").classList.toggle("off",S.goal.l!=="div");
  document.querySelectorAll("#goalT [data-t]").forEach(b=>{ b.setAttribute("aria-pressed",S.goal.l==="div"&&!!S.goal[b.dataset.t]); b.disabled=S.goal.l!=="div"; });
  { const hide=!!S.seen||(t.steps>0&&hasGoal()); const ob=$("#onb"); if(hide&&!ob.hidden&&!ob.classList.contains("out")){ ob.classList.add("out"); setTimeout(()=>{ ob.hidden=true; ob.classList.remove("out"); },360); } else if(!hide){ ob.hidden=false; ob.classList.remove("out"); } }
  const st=(cls,v,l,f)=>`<button class="stat ${S.tab==="ALL"&&S.filt===f?'sel':''}" data-sf="${f||''}" title="Show these guns"><span class="sw3 ${cls}"></span><div><b class="num tw">${v}</b><small>${l}</small></div></button>`;
  setHTML($("#stats"),st("flat",`${t.maxed}/${BASE.length}${bon(w=>W(w.id).mil>=8)}`,"Max","f-max")+(t.prest?st("cam cam-pyro",`${t.prest}${bon(w=>W(w.id).pr>0)}`,"Prestiged","f-prest"):"")+st("cam cam-gold",`${t.gold}/${BASE.length}${bon(w=>W(w.id).gold)}`,"Gold","f-gold")+(cap()>=13?st("cam cam-plat",`${t.plat}/${BASE.length}${bon(w=>W(w.id).plat)}`,"Platinum","f-plat"):"")+(cap()>=14?st("cam cam-hb",`${t.hb}/${BASE.length}${bon(w=>W(w.id).hb)}`,"H. Break","f-hb")+st("cam cam-div"+(t.div?"":" locked"),t.div?"✓":`${t.hb}/${BASE.length}`,"Divergence","f-hb").replace('class="stat ','class="stat '+(t.div?'':'locked ')):"")+bonNote());
  const clsPct=c=>Math.round(100*bestSteps(c)/(NEED(c)*cap()));
  const shiny=c=>{ if(reach(c,"hb")) return "cam cam-hb shiny"; if(cap()>=13&&reach(c,"plat")) return "cam cam-plat shiny light"; if(reach(c,"gold")) return "cam cam-gold shiny"; return ""; };
  /* the tab fills from the bottom with the next camo as guns reach it: 3 of 9 Gold = a third full of gold */
  const fillOf=c=>{ const ws=POOL(c), n=k=>Math.min(L,ws.filter(w=>W(w.id)[k]).length), L=NEED(c); if(!L) return null;
    if(n("gold")<L) return {k:"gold",f:n("gold")/L,left:L-n("gold")}; if(cap()>=13&&n("plat")<L) return {k:"plat",f:n("plat")/L,left:L-n("plat")}; if(cap()>=14&&n("hb")<L) return {k:"hb",f:n("hb")/L,left:L-n("hb")}; return null; };
  const tab=(c,label,pct)=>{ const fl=fillOf(c); /* a Gold tab keeps filling with Platinum, and so on */ const tip=fl?`${Math.round(fl.f*NEED(c))}/${NEED(c)} at ${({gold:"Gold",plat:"Platinum",hb:"Harmonic Break"})[fl.k]}`:"Complete";
    return `<button role="tab" data-c="${c}" aria-selected="${S.tab===c}" class="${shiny(c)}${fl&&fl.f>0?" filling":""}" title="${tip}">${fl&&fl.f>0?`<span class="fill cam cam-${fl.k}" style="height:${Math.max(8,Math.round(fl.f*100))}%"></span>`:""}<span>${label}</span><small class="tw">${pct}%</small>${fl&&fl.left<=2&&fl.f>0?`<em class="near">${fl.left} left</em>`:""}<span class="bar"><i style="width:${pct}%"></i></span></button>`; };
  $("#ctabs").style.opacity=q?".35":""; setHTML($("#ctabs"),tab("ALL","All",Math.round(t.ladder*100))+ORDER.map(c=>tab(c,CLS[c][3],clsPct(c))).join(""));
  BURSTS=noteLevels(); if(BURSTS.length>12) BURSTS=[];
  const host=$("#guns"); const fresh=lastTab!==S.tab||host._q!==q||!!q||!host.children.length; host._q=q; if(fresh) host.innerHTML=""; host.classList.toggle("enter",fresh); lastTab=S.tab; const NEW=[]; const put=el=>{ if(fresh) host.appendChild(el); else NEW.push(el); };
  if(LAST_OPEN&&LAST_OPEN!==S.open){ CLOSING=LAST_OPEN; clearTimeout(closeT); closeT=setTimeout(()=>{ CLOSING=null; render(); },420); } LAST_OPEN=S.open;
  $("#searchX").hidden=!q;
  if(q){ const ws=WEAPONS.filter(w=>w.name.toLowerCase().includes(q)||CLS[w.cls][0].toLowerCase().includes(q)||(w.specials||[]).some(s=>(s.name||"").toLowerCase().includes(q)));
    setHTML($("#clsH"),`<div class="l1"><b>${ws.length} match${ws.length===1?"":"es"}</b><span class="num" style="color:var(--ink3)">for "${esc(q)}"</span></div>`);
    if(!ws.length) host.innerHTML=`<p style="color:var(--ink3);font-size:14px;padding:8px 0">No gun called that. Try part of the name.</p>`;
    for(const w of ws) put(gun(w,t,classGold(w.cls),true));
  } else if(S.tab==="ALL"){
    const lf=w=>left(w).length; const nDone=BASE.filter(w=>lf(w)===0).length;
    const F={close:"Most progress first",fresh:"Not started"}; if(nDone) F.done=`Done (${nDone})`;
    const SF={"f-max":["Maxed",w=>W(w.id).mil>=8],"f-prest":["Prestiged",w=>W(w.id).pr>0],"f-gold":["Gold",w=>W(w.id).gold],"f-plat":["Platinum",w=>W(w.id).plat],"f-hb":["Harmonic Break",w=>W(w.id).hb]};
    const sfChip=SF[S.filt]?`<button class="seg" data-f="" aria-pressed="true" title="Back to all"><i></i>${SF[S.filt][0]} ✓ · ${WEAPONS.filter(SF[S.filt][1]).length} <span style="color:var(--ink3)">×</span></button>`:"";
    setHTML($("#clsH"),`<div class="l1"><span class="fil">${Object.keys(F).map(k=>`<button class="seg" data-f="${k}" aria-pressed="${S.filt===k}"><i></i>${F[k]}</button>`).join("")}${sfChip}</span>${bulk(WEAPONS,"all guns")}</div>${hideRow(WEAPONS)}`);
    /* the list is frozen while you work in it, so a gun never jumps or vanishes mid-tap; it refreshes when you change tab, filter or goal */
    const key=["ALL",S.filt,S.goal.l,S.goal.mp,S.goal.dmz,S.goal.wz,hid().gold,hid().plat,hid().hb].join("|");
    let ws;
    if(VIEW.key===key&&VIEW.ids){ ws=VIEW.ids.map(id=>WEAPONS.find(w=>w.id===id)); }
    else { ws=WEAPONS.slice();
      if(SF[S.filt]) ws=ws.filter(SF[S.filt][1]);
      else if(S.filt==="close") ws=ws.filter(w=>lf(w)>0).sort((a,b)=>done(W(b.id))-done(W(a.id))||WEAPONS.indexOf(a)-WEAPONS.indexOf(b));
      else if(S.filt==="fresh") ws=ws.filter(w=>done(W(w.id))===0);
      else if(S.filt==="done") ws=ws.filter(w=>lf(w)===0);
      if(!ws.length){ ws=WEAPONS.slice(); }
      ws=ws.filter(w=>!hiddenGun(w));
      if(S.filt!=="close") ws.sort((a,b)=>ORDER.indexOf(a.cls)-ORDER.indexOf(b.cls)||WEAPONS.indexOf(a)-WEAPONS.indexOf(b));   /* grouped by class, same order as the tabs */
      VIEW={key,ids:ws.map(w=>w.id)}; }
    let lastCls=null; for(const w of ws){ if(S.filt!=="close"&&w.cls!==lastCls){ lastCls=w.cls; const hd=document.createElement("div"); hd.className="ghead"; hd.dataset.gun="h-"+w.cls; const n=ws.filter(x=>x.cls===w.cls).length; hd.innerHTML=`<span>${esc(CLS[w.cls][0])}</span><em class="num tw">${clsPct(w.cls)}%</em><small>${n} gun${n===1?"":"s"}</small>${(x=>x?`<i class="gnext"><span class="sw cam cam-${x.k}"></span>Next: ${x.name} · ${esc(x.txt)} <u>${x.ws.length} ready</u></i>`:"")(nextUp(w.cls)[0])}`; put(hd); } put(gun(w,t,classGold(w.cls),true)); }
  } else {
    const c=S.tab; const cg=classGold(c); const plats=cntB(w=>w.cls===c&&W(w.id).plat);
    const nx=fillOf(c); setHTML($("#clsH"),`<div class="l1"><b>${CLS[c][0]}</b><span class="num tw">${clsPct(c)}%</span>${nx&&nx.left<=3?`<span class="nudge">${nx.left} gun${nx.left>1?"s":""} from ${({gold:"Gold",plat:"Platinum",hb:"Harmonic Break"})[nx.k]} ${esc(CLS[c][0])}</span>`:""}${bulk(WEAPONS.filter(w=>w.cls===c),"class")}</div>${nextHTML(c)}${hideRow(WEAPONS.filter(w=>w.cls===c))}`);
    const ckey=["C",c,hid().gold,hid().plat,hid().hb].join("|"); let cws;
    if(VIEW.key===ckey&&VIEW.ids){ cws=VIEW.ids.map(id=>WEAPONS.find(w=>w.id===id)); } else { cws=WEAPONS.filter(w=>w.cls===c&&!hiddenGun(w)); VIEW={key:ckey,ids:cws.map(w=>w.id)}; }
    for(const w of cws) put(gun(w,t,cg));
    if(!cws.length){ const pEl=document.createElement("p"); pEl.className="empty"; pEl.textContent="Every gun here is hidden. Tap a Hide chip above to show them again."; put(pEl); }
  }
  if(!fresh) syncKeyed(host,NEW);
  if(BURSTS.length){ const q=BURSTS; BURSTS=[]; requestAnimationFrame(()=>q.forEach((b,i)=>burst(host.querySelector(`.gun[data-gun="${b.id}"]`),b.kind,i*90))); }
  renderTracks(t); finale(t);
}
function gun(w,t,cg,showCls){
  const s=W(w.id); const el=document.createElement("div"); el.className="gun"+(skipped(w)?" skipped":"")+(S.open===w.id?" open":"")+(left(w).length===1?" almost":"");
  const lat=latest(w); const c=lat?col(lat):null; const CAPN=cap();
  const segs=[]; for(let i=0;i<8;i++) segs.push([i<s.mil,"","cam-m"+(i+1)]); for(let i=0;i<3;i++) segs.push([s.sp[i],"","cam-s-"+w.id+"-"+i]); segs.push([s.gold,"","cam-gold"],[s.plat,"","cam-plat"],[s.hb,"","cam-hb"]);
  const nowIdx = s.mil<8?s.mil : spDone(s)<3? 8+s.sp.indexOf(false) : !s.gold?11 : (CAPN>=13&&!s.plat)?12 : (CAPN>=14&&!s.hb)?13 : -1;
  const pd=prevSnap[w.id]??done(s); const nd=done(s);
  const canStep=i=> i<8?true : i<11?true : i===11?(s.mil>=8&&spDone(s)===3||s.gold) : i===12?(cg.d===cg.t&&s.gold||s.plat) : (t.plat>=BASE.length&&s.plat||s.hb);
  const sq=segs.slice(0,CAPN).map(([on,cc,tx],i)=>{ const [nm,txt]=stepName(w,i); return `<i role="button" tabindex="-1" data-step="${i}" class="${i===nowIdx?'now':''} ${on&&tx?'cam '+tx:''} ${on&&i>=pd&&i<nd?'pop':''} ${canStep(i)?'':'gate'} ${i<8?'n':''}" title="${esc(nm)}: ${esc(txt)}${canStep(i)?'':' · locked'}" style="${on&&cc?`background:${cc};color:${isLight(cc)?'#111':'#fff'}`:''}">${i<8?`<em>${i+1}</em>`:""}</i>`; });
  prevSnap[w.id]=nd;
  const grp=(label,arr)=>arr.length?`<div class="lg"><span>${label}</span><div class="lad">${arr.join("")}</div></div>`:"";
  let lad=grp("Military",sq.slice(0,8))+grp("Special",sq.slice(8,11))+grp(CAPN>=14?"Gold · Plat · HB":CAPN>=13?"Gold · Plat":"Gold",sq.slice(11,CAPN));
  const msteps=t.tracks.flatMap(k=>TRACKS[k].steps); for(const k of t.tracks){ lad+=grp({mp:"MP",dmz:"DMZ",wz:"WZ"}[k],TRACKS[k].steps.map((m,idx)=>{ const ok=t.div&&(idx===0||S.mu[TRACKS[k].steps[idx-1].id])||S.mu[m.id]; return `<i role="button" data-mstep="${m.id}" data-k="${k}" data-idx="${idx}" class="${S.mu[m.id]?'cam cam-'+m.id:''} ${ok?'':'gate'}" title="${esc(m.n)}: ${esc(m.c)}${ok?'':' · locked'}"></i>`; })); } const NSEG=CAPN+msteps.length;
  const L=left(w); const mu=msteps.filter(m=>S.mu[m.id]).length; const n=Math.min(done(s),CAPN)+mu; const LN=L.length+msteps.length-mu;
  const q=[["max","Max",s.mil>=8,"plain"],["gold","Gold",s.gold,"cam cam-gold"]]; if(CAPN>=13) q.push(["plat","Plat",s.plat,"cam cam-plat"]); if(CAPN>=14) q.push(["hb","HB",s.hb,"cam cam-hb"]);
  const okPlat=cg.d===cg.t||s.plat, okHB=t.plat>=BASE.length||s.hb;
  const qb=(a,on,cls,ok,title,lbl)=>`<button class="qb ${on?'on':'off'} ${cls}" data-q="${a}" ${ok?'':'disabled'} title="${title}" aria-label="${title}" aria-pressed="${on}"><span>${lbl}</span></button>`;
  const nxt=nextStep(w,cg,t);
  const quick=`<span class="quick">${qb("next",false,"nx",!!(nxt&&nxt.act),nxt?(nxt.act?"Mark next: "+nxt.label:nxt.locked):"Nothing left for this goal",nxt?(nxt.act?"NEXT ▸ "+nxt.label.replace(/ · .*/,""):"WAITING · "+nxt.locked.replace(/ · .*/,"")):"COMPLETE")}${qb("max",s.mil>=8,"flat",true,"Set this gun to Military done (8/8). Tap again to un-tick.","MIL")}${qb("spall",spDone(s)===3,"flat",true,"Set to all 3 Specials done (Military included)","SPEC")}${qb("gold",s.gold,"cam cam-gold",true,"Set to Gold (Military + Specials included)","GOLD")}${CAPN>=13?qb("plat",s.plat,"cam cam-plat",okPlat,okPlat?"Set to Platinum":"Platinum · class needs all Gold first","PLAT"):""}${CAPN>=14?qb("hb",s.hb,"cam cam-hb",okHB,okHB?"Set to Harmonic Break":"Harmonic Break · needs all 33 Platinum first","HB"):""}<span class="pq"><button class="qb pst ${s.pr>0?'on cam cam-pyro':'off'}" data-q="pr" title="Weapon prestige · tap to cycle: P1 → P1 max → Master 150 → Master 250 → none" aria-label="Cycle prestige"><span>${PRL[s.pr]||"PRESTIGE"}</span></button></span></span>`;

  const seed=[...w.id].reduce((x,ch)=>x+ch.charCodeAt(0),0); const vary=`--d:${-(seed%9)}s;--d2:${-(seed%5)}s`;
  const U=s.gold?unlocked():[]; const TEX=Object.assign({Gold:"cam-gold",Platinum:"cam-plat","Harmonic Break":"cam-hb",Pyroclast:"cam-pyro","Pyroclast Terminus":"cam-pyro","Pyroclast Scatter":"cam-pyro","Pyroclast Cascade":"cam-pyro"},Object.fromEntries(MIL.map((m,i)=>[m,"cam-m"+(i+1)])),Object.fromEntries([0,1,2].map(i=>[spName(w,i),"cam-s-"+w.id+"-"+i]))); const tex=lat&&TEX[lat];
  const bands=U.length?`<span class="bands">${U.map(x=>`<i class="cam cam-${x.id}"></i>`).join("")}</span>`: tex?`<span class="bands"><i class="cam ${tex}"></i></span>`:"";
  const SPC={"50-gs":[[["#ffd2e9",0.5],["#ffe6d9",0.39],["#ffe5dc",0.11]],[["#242122",0.51],["#362b31",0.32],["#54543f",0.17]],[["#372628",0.45],["#681a24",0.32],["#9d1124",0.23]]],"apoc-338":[[["#503157",0.46],["#b394ab",0.29],["#fff8ff",0.25]],[["#ffffff",0.39],["#d99b98",0.36],["#ffffff",0.25]],[["#282c24",0.48],["#dc8915",0.26],["#645724",0.26]]],"astaroth-57":[[["#66604f",0.43],["#857e69",0.32],["#9b927c",0.25]],[["#4d442c",0.44],["#9c7a3e",0.29],["#f9b65d",0.27]],[["#48211c",0.47],["#7e5e2c",0.33],["#a2e863",0.21]]],"axion":[[["#6e6e6e",0.44],["#2e2e2e",0.42],["#a0a0a0",0.13]],[["#ac37b9",0.46],["#3a82b2",0.27],["#4eb1ce",0.26]],[["#3e9ba7",1.0]]],"cronen-squall":[[["#3d1d1b",0.48],["#6e423d",0.32],["#a99a96",0.19]],[["#411616",0.47],["#92504f",0.28],["#e3cecf",0.25]],[["#5a5f54",0.45],["#4f524c",0.34],["#6b6f60",0.21]]],"finn-lmg":[[["#777a6c",0.43],["#5a6359",0.36],["#969687",0.21]],[["#202221",0.49],["#323a26",0.3],["#58632d",0.21]],[["#48586a",0.44],["#6e829b",0.34],["#96aeca",0.22]]],"fss-carbon-edge-1095":[[["#415758",0.46],["#b4b694",0.33],["#ffd76c",0.22]],[["#534a41",0.39],["#796e5f",0.39],["#9c907f",0.22]],[["#2b2b2b",0.45],["#5f5f5f",0.37],["#aeaeae",0.18]]],"han-86":[[["#3d3d3a",0.42],["#494948",0.36],["#5e5e5d",0.22]],[["#272b32",0.44],["#797e89",0.31],["#bfc2c4",0.26]],[["#97332d",0.38],["#962f2e",0.37],["#98322d",0.25]]],"hyeon-burst":[[["#4a533e",0.46],["#717a5a",0.3],["#a1a376",0.24]],[["#1b1d1e",0.52],["#5b2d21",0.26],["#cd4d22",0.22]],[["#645039",0.45],["#9c8166",0.33],["#e4d3c2",0.21]]],"iso-nightshade":[[["#585958",0.44],["#3a3a3a",0.34],["#696969",0.22]],[["#2c3131",0.44],["#373a3c",0.32],["#424444",0.24]],[["#c1702d",1.0]]],"jokr":[[["#5f5342",0.44],["#766849",0.36],["#948657",0.2]],[["#2c2f31",0.45],["#8b8268",0.29],["#c8b88b",0.26]],[["#242e3f",0.41],["#2c4363",0.35],["#33547c",0.24]]],"kastov-762":[[["#54533d",0.47],["#a0957c",0.27],["#81775e",0.26]],[["#2d2c2e",0.5],["#ffff82",0.25],["#8f8f4f",0.24]],[["#6e5e49",0.42],["#918068",0.36],["#ab9881",0.22]]],"kg-7-vulcan":[[["#504838",0.46],["#7f6c4f",0.28],["#a99068",0.25]],[["#2d2d2d",0.42],["#373837",0.32],["#454544",0.26]],[["#6e5e4e",0.4],["#c6ad8f",0.39],["#ffffeb",0.21]]],"krait-p68":[[["#9d7c6a",0.41],["#bca38d",0.33],["#cab69d",0.27]],[["#282b28",0.49],["#52474d",0.3],["#b68ba3",0.21]],[["#757475",0.44],["#b1b1b1",0.34],["#ededed",0.22]]],"m4":[[["#393829",0.44],["#5d5944",0.36],["#958d70",0.2]],[["#239537",1.0]],[["#43423e",0.43],["#797771",0.31],["#a8a7a0",0.25]]],"mar-9":[[["#24271b",0.43],["#425532",0.36],["#919b58",0.21]],[["#383731",0.43],["#48453a",0.35],["#595549",0.22]],[["#6e5e49",0.42],["#918068",0.36],["#ab9881",0.22]]],"mosin-nagant":[[["#364343",0.42],["#649aa5",0.36],["#a6daee",0.22]],[["#abadad",0.44],["#eeefef",0.34],["#ffffff",0.23]],[["#796859",0.4],["#92967a",0.38],["#b9c389",0.22]]],"mojave-357":[[["#be3f95",0.5],["#ae7fb3",0.3],["#d2bea8",0.2]],[["#6e5e49",0.42],["#918068",0.36],["#ab9881",0.22]],[["#37494e",1.0]]],"oden":[[["#3a4133",0.47],["#484f39",0.3],["#636a48",0.23]],[["#766b64",0.4],["#a59c95",0.38],["#d5d7d9",0.22]],[["#bb1817",0.45],["#c14c12",0.3],["#cc6b12",0.25]]],"oris-8-6":[[["#605b63",0.42],["#7e757c",0.34],["#958f95",0.23]],[["#34211a",0.43],["#4f2c1a",0.33],["#65361a",0.24]],[["#453498",0.4],["#4c5bb3",0.36],["#3890cd",0.24]]],"patriot-xmr":[[["#74604f",0.44],["#eac99c",0.3],["#c9ab82",0.26]],[["#edc48f",0.43],["#97825e",0.36],["#ffe5b9",0.21]],[["#111111",0.46],["#151515",0.3],["#1d1d1d",0.24]]],"pila":[[["#7a5e45",0.39],["#dcbc86",0.38],["#fffec4",0.23]],[["#a05453",0.42],["#edb0a8",0.32],["#ffe6d9",0.26]],[["#775b3e",0.39],["#efc965",0.38],["#c2c39e",0.23]]],"pm-40-anvil":[[["#4e4e4c",0.4],["#817f7a",0.39],["#a8a6a1",0.21]],[["#183111",0.49],["#485f2b",0.28],["#a2a898",0.23]],[["#732d43",0.48],["#b7848d",0.29],["#fff6f8",0.23]]],"ppsh-41":[[["#5a5a5a",0.41],["#3c3c3c",0.37],["#757575",0.22]],[["#504547",1.0]],[["#6eab9b",0.39],["#84bfb0",0.37],["#97d1bf",0.24]]],"rezi-12":[[["#362f27",0.43],["#846a45",0.35],["#d9b06a",0.22]],[["#5b6347",0.43],["#969870",0.33],["#cfc690",0.25]],[["#ffffff",0.36],["#d1c9c3",0.36],["#ffffff",0.28]]],"rpg-8":[[["#636859",0.42],["#7c8074",0.36],["#95978b",0.22]],[["#e3ffb0",0.43],["#80807c",0.3],["#ffffcf",0.27]],[["#ffbef9",0.4],["#ffd8ff",0.38],["#fff1ff",0.21]]],"sang-9mm":[[["#684939",0.47],["#f6d59e",0.27],["#bc9b7a",0.26]],[["#7c716a",0.42],["#504d4a",0.39],["#c3b8a8",0.19]],[["#49332e",0.48],["#bf8458",0.3],["#b8d27f",0.21]]],"signal-50":[[["#333228",0.55],["#92845b",0.29],["#5f583f",0.17]],[["#1c1d33",0.43],["#43557c",0.36],["#74a0c8",0.21]],[["#ffb738",0.4],["#c67134",0.38],["#ffe65e",0.22]]],"type-73":[[["#5f6668",0.42],["#7f8482",0.34],["#a2a69e",0.24]],[["#525f44",0.47],["#abb08c",0.28],["#fffff5",0.24]],[["#5b4a38",0.4],["#807052",0.36],["#988a6b",0.24]]],"vel-46":[[["#292b27",0.44],["#555a4d",0.35],["#7b816e",0.22]],[["#2d3232",0.44],["#454a49",0.32],["#6e6f68",0.24]],[["#37494e",1.0]]],"warlord":[[["#8a292d",0.41],["#5e2b2e",0.38],["#a03d3e",0.21]],[["#685a4e",0.47],["#ab9a82",0.28],["#d9d2bd",0.25]],[["#412928",0.42],["#663726",0.34],["#9b5821",0.23]]],"wz-55-striga":[[["#537b75",0.39],["#864543",0.37],["#c7cdcc",0.23]],[["#817660",0.46],["#a2967b",0.3],["#beb291",0.24]],[["#817355",1.0]]],"x-58-nyx":[[["#524f23",0.43],["#6a6634",0.35],["#86814a",0.22]],[["#625553",0.47],["#ae9b9a",0.27],["#ebe5e2",0.27]],[["#6e5e49",0.42],["#918068",0.36],["#ab9881",0.22]]]}; const spIdx=[0,1,2].find(i=>spName(w,i)===lat); const texLight= lat==="Platinum"||lat==="Ice Storm"||(spIdx!==undefined&&SPC[w.id]&&isLight(SPC[w.id][spIdx][0][0]));
  const chipCls=(U.length?'mast':tex?(texLight?'light mast':'mast'):(c?(isLight(c)?'light':''):'none'))+((prevSnap["lat-"+w.id]!==undefined&&prevSnap["lat-"+w.id]!==lat)?' pop':''); prevSnap["lat-"+w.id]=lat;
  el.innerHTML=`<div class="grow" role="button" tabindex="0" aria-expanded="${S.open===w.id}"><div class="chip ${chipCls}" style="${vary};${!bands&&c?`background:${grad(c)}`:''}">${bands}<b>${esc(w.name)}</b><small>${skipped(w)?`<em class="ctag skip">Skipped</em>`:""}${w.season?`<em class="ctag s1" title="${esc(w.unlockText||"Season "+w.season)} · extra gun, not needed for the 33-gun mastery gates">S${w.season}</em>`:""}${showCls?`<em class="ctag">${esc(CLS[w.cls][3])}</em>`:""}${lat?esc(lat):showCls?"":(w.maxLevel?"max "+w.maxLevel:"")}${s.pr>0?" · "+PRL[s.pr]:""}</small></div>${quick}<div class="ladwrap">${lad}</div><div class="side"><b class="gp num tw" style="color:${heat(n/NSEG)}">${Math.round(100*n/NSEG)}%</b><span class="cnt num" style="color:${heat(n/NSEG)}">${n}/${NSEG}</span><button class="gclear" data-q="gclear" title="Clear this gun">${S.confirmClear===w.id?"sure?":"clear"}</button></div>${(()=>{ if(S.sqchips===false&&!VIEWING) return ""; const fp=friendPos(w).filter(x=>x.lv); return fp.length?`<div class="fpos">${fp.map(x=>`<span class="fp" title="${esc(x.name)} is at ${esc(x.lv)} on this gun"><i class="${x.av.cls}" style="${x.av.style}"><span>${esc((x.name||"?").trim().slice(0,2).toUpperCase())}</span></i><b>${esc(x.name)}</b>${esc(x.lv)}</span>`).join("")}</div>`:""; })()}</div>`;
  el.dataset.gun=w.id;
  el.querySelector(".grow").onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); S.open=S.open===w.id?null:w.id; save(); render(); } };
  el.querySelector(".grow").onclick=e=>{ try{ const b=e.target.closest("[data-q]"); if(b){ if(!b.disabled) quickSet(w,b.dataset.q); return; }
    const st=e.target.closest("[data-step]"); if(st){ if(st.classList.contains("gate")) return; const i=+st.dataset.step;
      if(i<8){ s.mil = s.mil===i+1? i : i+1; if(s.mil<8){ s.max=false; s.pr=0; } }
      else if(i<11){ s.sp[i-8]=!s.sp[i-8]; implyMil(s); }
      else if(i===11){ s.gold=!s.gold; if(!s.gold){ s.plat=false; s.hb=false; } }
      else if(i===12){ s.plat=!s.plat; if(!s.plat) s.hb=false; }
      else if(i===13){ s.hb=!s.hb; }
      if(s.gold&&!(s.mil>=8&&spDone(s)===3)){ s.gold=false; s.plat=false; s.hb=false; }
      save(); render(); return; }
    const ms=e.target.closest("[data-mstep]"); if(ms){ if(ms.classList.contains("gate")) return; const id=ms.dataset.mstep,k=ms.dataset.k,idx=+ms.dataset.idx; if(S.mu[id]){ delete S.mu[id]; TRACKS[k].steps.slice(idx+1).forEach(x=>delete S.mu[x.id]); save(); render(); } else { S.mu[id]=true; save(); render(); celebrate(TRACKS[k].steps[idx]); } return; }
    }catch(err){ console.error(err); toast("Something went wrong: "+(err&&err.message||err)); return; } S.open=S.open===w.id?null:w.id; S.pick=null; save(); render(); };
  const lw=document.createElement("div"); lw.className="listw"; el.appendChild(lw);
  if(S.open===w.id||CLOSING===w.id){
    const list=document.createElement("div"); list.className="list";
    const platOK=reach(w.cls,"gold")&&s.gold, hbOK=t.plat>=BASE.length&&s.plat, goldOK=s.mil>=8&&spDone(s)===3;
    const TEX2=TEX;
    const sw=(name)=>TEX2[name]?`<span class="sw cam ${TEX2[name]}"></span>`:`<button class="sw" data-sw="${esc(name)}" style="background:${col(name)}" title="Pick the colour of this camo" aria-label="Pick the colour of ${esc(name)}"></button>`;
    const item=(on,name,sub,right,ok,act,i)=>`<div class="item ${ok?'':'locked'}"><button class="ck ${on?'on':''}" data-act="${act}" data-i="${i??''}" ${ok?'':'disabled'} aria-label="${esc(name)}"></button>${sw(name)}<div class="t"><b>${esc(name)}</b>${sub?`<small>${esc(sub)}${where(sub)?` <em>(${esc(where(sub))})</em>`:''}</small>`:''}</div><span class="r">${right||''}</span></div>`;
    const fpAll=friendPos(w); const fpHtml=fpAll.length?`<div class="fline"><em>Squad on this gun</em>${fpAll.map(x=>`<span><b>${esc(x.name)}</b> ${x.lv?esc(x.lv):"not started"}</span>`).join("")}</div>`:"";
    list.innerHTML=`${fpHtml}${buildsHTML(w)}
      <div class="ctrl"><button class="pill" data-act="max" aria-pressed="${s.max||s.pr>0}"><i></i>Max level</button>${w.season?`<button class="pill tk" data-act="skip" aria-pressed="${!skipped(w)}" title="Turn off to leave this Season gun out of your counts"><i></i>Count this gun</button>`:""}<button class="pill" data-act="pr" aria-pressed="${s.pr>0}"><i></i>${s.pr?["","Prestige 1","Prestige 1 · max level","Prestige Master 150","Prestige Master 250"][s.pr]:"Prestige: none"} <span style="color:var(--ink3)">· tap to cycle</span></button></div>
      <div class="item"><button class="ck ${s.mil>=8?'on':''}" data-act="milall" aria-label="All 8 military camos"></button>${sw(MIL[Math.max(0,s.mil-1)])}<div class="t"><b>Military</b><small>${s.mil}/8${s.mil<8?" · next "+MIL[s.mil]:" · all done"}</small></div><span class="r">${s.mil<8?"tap ✓ for all 8":""}</span><div class="mil8">${MIL.map((m,i)=>`<button data-act="mil" data-i="${i}" class="${i<s.mil?'on cam cam-m'+(i+1):''}" title="${m}"><span>${i+1}</span></button>`).join("")}</div></div>
      ${[0,1,2].map(i=>item(s.sp[i],spName(w,i),spText(w,i),(w.specials||[])[i]?.level?"lv "+w.specials[i].level:"",true,"sp",i)).join("")}
      ${s.pr>0?item(true,PYRO[s.pr],PYROSUB[s.pr],"prestige",true,"none"):""}
      ${item(s.gold,"Gold",goldTxt(),goldOK||s.gold?"":"needs 8 + 3",goldOK||s.gold,"gold")}
      ${CAPN>=13?item(s.plat,"Platinum",platTxt(w.cls),platOK||s.plat?"":`class Gold ${Math.min(NEED(w.cls),POOL(w.cls).filter(x=>W(x.id).gold).length)}/${NEED(w.cls)}`,platOK||s.plat,"plat"):""}
      ${CAPN>=14?item(s.hb,"Harmonic Break",hbTxt(w.cls),hbOK||s.hb?"":`Platinum ${t.plat}/${BASE.length} guns`,hbOK||s.hb,"hb"):""}
      ${t.tracks.map(k=>TRACKS[k].steps.map((m,idx)=>{ const prev=TRACKS[k].steps[idx-1]; const ok=t.div&&(idx===0||!!S.mu[prev.id]); return `<div class="item ${ok||S.mu[m.id]?'':'locked'}"><button class="ck ${S.mu[m.id]?'on':''}" data-mast="${m.id}" data-k="${k}" data-idx="${idx}" ${ok||S.mu[m.id]?'':'disabled'} aria-label="${esc(m.n)}"></button><span class="sw cam cam-${m.id}"></span><div class="t"><b>${esc(m.n)}</b><small>${esc(m.c)}</small></div><span class="r">${t.div?(S.mu[m.id]?"unlocked":""):"after Divergence"}</span></div>`; }).join("")).join("")}`;
    if(S.pick){ const pr=document.createElement("div"); pr.className="picker"; pr.innerHTML=`<span>Colour for <b>${esc(S.pick)}</b></span><div>${PAL.map(c=>`<button data-pick="${esc(S.pick)}" data-c="${c}" style="background:${c}" class="${col(S.pick)===c?'on':''}" aria-label="${c}"></button>`).join("")}<button data-pick="${esc(S.pick)}" data-c="auto" class="auto">auto</button></div>`; list.appendChild(pr); }
    list.onclick=e=>{
      { const bs=e.target.closest("[data-bsel]"); if(bs){ const [k,v]=bs.dataset.bsel.split(":"); BSEL[k]=v; render(); return; } }
      { const sk=e.target.closest("[data-act=\"skip\"]"); if(sk){ S.skip=S.skip||{}; if(S.skip[w.id]) delete S.skip[w.id]; else S.skip[w.id]=true; save(); render(); toast(S.skip[w.id]?w.name+" skipped: not counted":w.name+" counts again"); return; } }
      const mb=e.target.closest("[data-mast]"); if(mb&&!mb.disabled){ const id=mb.dataset.mast,k=mb.dataset.k,idx=+mb.dataset.idx; if(S.mu[id]){ delete S.mu[id]; TRACKS[k].steps.slice(idx+1).forEach(x=>delete S.mu[x.id]); save(); render(); } else { S.mu[id]=true; save(); render(); celebrate(TRACKS[k].steps[idx]); } return; }
      const pk=e.target.closest("[data-pick]"); if(pk){ const nm=pk.dataset.pick, c=pk.dataset.c; if(c==="auto") delete S.col[nm]; else S.col[nm]=c; S.pick=null; save(); render(); return; }
      const swb=e.target.closest("[data-sw]"); if(swb){ const nm=swb.dataset.sw; S.pick=S.pick===nm?null:nm; render(); return; }
      const b=e.target.closest("[data-act]"); if(!b||b.disabled) return; const a=b.dataset.act, i=+b.dataset.i;
      if(a==="mil"){ s.mil=s.mil===i+1?i:i+1; if(s.mil<8){ s.max=false; } }
      else if(a==="milall"){ if(s.mil>=8){ s.mil=0; s.max=false; s.pr=0; } else s.mil=8; }
      else if(a==="max"){ s.max=!(s.max||s.pr>0); if(s.max) s.mil=8; else { s.pr=0; } }
      else if(a==="pr"){ s.pr=(s.pr+1)%5; if(s.pr>0){ s.mil=8; s.max=true; } }
      else if(a==="sp"){ s.sp[i]=!s.sp[i]; implyMil(s); }
      else if(a==="gold"){ s.gold=!s.gold; if(!s.gold){s.plat=false;s.hb=false;} }
      else if(a==="plat"){ s.plat=!s.plat; if(!s.plat) s.hb=false; }
      else if(a==="hb") s.hb=!s.hb;
      if(s.gold&&!(s.mil>=8&&spDone(s)===3)){ s.gold=false; s.plat=false; s.hb=false; }
      save(); render();
    };
    lw.appendChild(list);
  }
  return el;
}
function bulk(ws,label){ const all=k=>ws.every(w=>levelOf(W(w.id))===LV[k]); const q=[["max","Military"],["spall","Specials"],["gold","Gold"]]; if(cap()>=13) q.push(["plat","Platinum"]); if(cap()>=14) q.push(["hb","HB"]);
  const allPlat=cnt(w=>W(w.id).plat)>=BASE.length; const hbLocked=ws.filter(isBase).length<BASE.length&&!allPlat;
  return `<span class="bulk"><em>Set ${label} to</em>${q.map(([a,l])=>`<button data-bulk="${a}" class="${all(a)?'on':''}" ${a==="hb"&&hbLocked?'disabled title="Harmonic Break needs '+BASE.length+' guns at Platinum first (Season guns count)"':''}>${l}</button>`).join("")}<button data-bulk="clear" class="warn" title="Clear every gun in this list">Clear</button></span><button class="undo" id="undoBtn" ${HIST.length?'':'disabled'} title="Undo last change"><span class="ic">↶</span>Undo</button>`; }
const PRL=["","P1","P1 MAX","M150","M250"]; const PYRO=["","Pyroclast","Pyroclast Terminus","Pyroclast Scatter","Pyroclast Cascade"]; const PYROSUB=["","Weapon Prestige 1","Prestige 1 max level","Prestige Master 150","Prestige Master 250"];
const IMPLIED=[3,5,8];
function implyMil(s){ for(let i=0;i<3;i++) if(s.sp[i]) s.mil=Math.max(s.mil,IMPLIED[i]); if(s.mil>=8) s.max=true; }
/* the next thing this gun can earn, in game order, respecting gates */
function nextStep(w,cg,t){ const s=W(w.id); const c=cap();
  if(s.mil<8) return {label:"Military "+(s.mil+1)+" · "+MIL[s.mil],act:()=>{ s.mil++; if(s.mil>=8) s.max=true; }};
  const i=s.sp.indexOf(false); if(i>=0) return {label:spName(w,i),act:()=>{ s.sp[i]=true; implyMil(s); }};
  if(!s.gold) return {label:"Gold",act:()=>{ s.gold=true; }};
  if(c>=13&&!s.plat){ if(cg.d===cg.t) return {label:"Platinum",act:()=>{ s.plat=true; }}; return {locked:`Platinum · class Gold ${cg.d}/${cg.t}`}; }
  if(c>=14&&!s.hb){ if(t.plat>=BASE.length) return {label:"Harmonic Break",act:()=>{ s.hb=true; }}; return {locked:`Harmonic Break · Platinum ${t.plat}/${BASE.length}`}; }
  return null; }
/* progress colour: grey → ink → amber → gold as a gun nears done */
function heat(f){ if(f>=1) return "var(--acc)"; if(f>=.75) return "color-mix(in srgb,var(--acc) 70%,var(--ink))"; if(f>=.4) return "var(--ink)"; if(f>0) return "var(--ink2)"; return "var(--ink3)"; }
/* level setter: a button sets the gun to exactly that level — everything below filled, everything above cleared */
const LV={max:1,spall:2,gold:3,plat:4,hb:5};
function levelOf(s){ return s.hb?5:s.plat?4:s.gold?3:spDone(s)===3?2:s.mil>=8?1:0; }
const HIDE_L={gold:3,plat:4,hb:5};
const hid=()=>S.hide||(S.hide={gold:false,plat:false,hb:false});
const hiddenGun=w=>{ const lv=levelOf(W(w.id)); return Object.keys(HIDE_L).some(k=>hid()[k]&&lv===HIDE_L[k]); };
const hideRow=ws=>{ const n=k=>ws.filter(w=>levelOf(W(w.id))===HIDE_L[k]).length; const hidden=ws.filter(hiddenGun).length; return `<div class="l2 hide"><em>Hide guns that are</em>${[["gold","Gold"],["plat","Platinum"],["hb","Harmonic Break"]].map(([k,l])=>`<button class="seg" data-h="${k}" aria-pressed="${!!hid()[k]}" ${n(k)||hid()[k]?"":"disabled"}><i></i>${l}${n(k)?` <span class="hn">${n(k)}</span>`:""}</button>`).join("")}${hidden?`<span class="hcount">${hidden} hidden</span>`:""}</div>`; };
function setLevel(s,lv){ if(lv>=1){ s.mil=8; s.max=true; } else { s.mil=0; s.max=false; s.pr=0; }
  s.sp= lv>=2?[true,true,true]:[false,false,false]; s.gold=lv>=3; s.plat=lv>=4; s.hb=lv>=5; }
function quickSet(w,a,silent){ const s=W(w.id);
  if(a==="next"){ const cg=classGold(w.cls), t=totals(); const n=nextStep(w,cg,t); if(!n||!n.act){ if(!silent) toast("Nothing left on this gun for your goal"); return; } n.act(); save(); render(); if(!silent) toast("+ "+n.label); return; }
  if(a==="gclear"){ if(S.confirmClear!==w.id){ S.confirmClear=w.id; render(); clearTimeout(quickSet._t); quickSet._t=setTimeout(()=>{ S.confirmClear=null; render(); },3000); return; } S.confirmClear=null; S.weapons[w.id]={mil:0,max:false,pr:0,sp:[false,false,false],gold:false,plat:false,hb:false,tok:false}; save(); render(); toast("Gun cleared · Undo if needed"); return; }
  if(a==="pr"){ s.pr=(s.pr+1)%5; if(s.pr>0){ s.mil=8; s.max=true; } }
  if(LV[a]){ const cur=levelOf(s), lv=LV[a]; const names={1:"Military",2:"Specials",3:"Gold",4:"Platinum",5:"Harmonic Break"};
    if(cur===lv){ setLevel(s,lv-1); if(!silent) toast(`${w.name}: ${names[lv]} un-ticked`); }
    else { setLevel(s,lv); if(!silent) toast(`${w.name} set to ${names[lv]}${cur>lv?" · Undo if that was a slip":""}`); } }
  if(a==="max"&&!silent&&s.mil>=8&&spDone(s)===3&&!s.gold){ /* nothing extra */ }
  if(!silent){ save(); render(); } }
function finale(t){
  const el=$("#finale"); const doneGoal=hasGoal()&&t.overall>=100; el.hidden=!doneGoal; if(!doneGoal) return;
  const num=s=>{ const m=/(\d[\d,]*)/.exec(s||""); return m?+m[1].replace(/,/g,""):0; };
  let specialKills=0; for(const w of WEAPONS) for(const sp of (w.specials||[])) specialKills+=num(sp.mp);
  const classKills={AR:[50,25*2],SMG:[25,50],SG:[50,25*2],LMG:[3*15,2*25],MR:[75,75],SR:[75,75],PST:[20,40],LCH:[2*15,10*7],MEL:[3*15,25]};
  let plat=0,hb=0; for(const w of WEAPONS){ if(W(w.id).plat) plat+=classKills[w.cls][0]; if(W(w.id).hb) hb+=classKills[w.cls][1]; }
  const gold=t.gold*15; const mast={md:2500,pr:900,or:2500,ch:2500,rt:0,he:25000,pa:0,da:0,em:0}; let mk=0; for(const s of unlocked()) mk+=mast[s.id]||0;
  const kills=specialKills+gold+plat+hb+mk;
  const camos=t.steps+unlocked().length; const days=S.started?Math.max(1,Math.round((Date.now()-S.started)/86400000)):null;
  const texes=["cam-gold"].concat(cap()>=13?["cam-plat"]:[],cap()>=14?["cam-hb","cam-div"]:[],unlocked().map(s=>"cam-"+s.id));
  el.innerHTML=`<div class="fin"><div class="finstrip">${texes.map(x=>`<i class="cam ${x}"></i>`).join("")}</div><div class="fintxt"><span class="cap">Finally</span><h2>You did it.</h2><div class="finstats">
    <div><b class="num">${camos}</b><small>camos earned</small></div>
    <div><b class="num">${kills.toLocaleString()}+</b><small>challenge kills, minimum</small></div>
    <div><b class="num">${t.gold}</b><small>guns to Gold</small></div>
    ${cap()>=14?`<div><b class="num">${t.hb}</b><small>Harmonic Breaks</small></div>`:""}
    ${unlocked().length?`<div><b class="num">${unlocked().length}</b><small>mastery camos</small></div>`:""}
    ${days?`<div><b class="num">${days}</b><small>days of grind</small></div>`:""}
  </div><p>Pick a bigger goal above, or just sit in the lobby and spin the gun.</p></div></div>`;
}
function renderTracks(t){
  const host=$("#tracks"); host.innerHTML=""; const picked=t.tracks;
  $("#mastSect").hidden=!picked.length;
  const U=unlocked();
  $("#mastP").textContent= U.length? `${U.length}/${t.tracks.length*3} unlocked` : t.div? "" : `Opens after Divergence · ${t.hb}/${BASE.length}`;
  $(".pct").classList.toggle("mast",U.length>0);
  for(const k of picked){
    const hd=document.createElement("div"); hd.className="mhead"; const got=TRACKS[k].steps.filter(s=>S.mu[s.id]).length; hd.innerHTML=`<span>${TRACKS[k].name}</span><span class="num">${got}/3</span>`; host.appendChild(hd);
    TRACKS[k].steps.forEach((s,idx)=>{
      const prev=TRACKS[k].steps[idx-1]; const locked=idx>0&&!S.mu[prev.id]; const got=!!S.mu[s.id];
      const tot=s.edit?(+S.mt[s.id]||0):s.t; const v=+S.m[s.id]||0;
      const card=document.createElement("div"); card.className="mcard"+(locked?" locked":"");
      card.innerHTML=`<div class="sw2 cam cam-${s.id} ${got?'':'off'}"></div><div class="n">${s.n}<small>${s.c}${tot&&!got?` ×${tot.toLocaleString()}`:""}</small>${!got&&!locked?`<small>${s.edit?`target <input class="tot" type="number" min="0" placeholder="?" value="${S.mt[s.id]||""}" id="t-${s.id}" aria-label="${s.n} target"> · `:""}so far <input type="number" min="0" value="${v}" id="c-${s.id}" aria-label="${s.n} count"> <em style="font-style:normal;color:var(--ink3)">optional</em></small>`:""}</div><button class="got" data-got="${s.id}" aria-pressed="${got}" ${locked?"disabled":""}>${got?"Unlocked":"Got it"}</button>`;
      card.querySelector("[data-got]").onclick=()=>{ if(S.mu[s.id]){ delete S.mu[s.id]; TRACKS[k].steps.slice(idx+1).forEach(x=>delete S.mu[x.id]); save(); render(); return; } S.mu[s.id]=true; save(); render(); celebrate(s); };
      const ci=card.querySelector("#c-"+s.id); if(ci) ci.onchange=e=>{ S.m[s.id]=Math.max(0,+e.target.value||0); save(); render(); };
      const ti=card.querySelector("#t-"+s.id); if(ti) ti.onchange=e=>{ S.mt[s.id]=Math.max(0,+e.target.value||0); save(); render(); };
      host.appendChild(card);
    });
  }
}
function celebrate(s){ document.querySelectorAll(".celebrate").forEach(x=>x.remove()); const small=s.id==="div"?"Completionist":"Mastery unlocked"; const d=document.createElement("div"); d.className="celebrate"; d.innerHTML=`<div class="cam cam-${s.id}"></div><div class="txt"><small>${small}</small><b>${esc(s.n)}</b><span>tap to dismiss</span></div>`; const kill=()=>{ d.style.transition="opacity .18s"; d.style.opacity="0"; setTimeout(()=>d.remove(),200); }; d.onclick=kill; document.addEventListener("keydown",kill,{once:true}); document.body.appendChild(d); setTimeout(()=>{ if(d.isConnected) d.remove(); },3100); }
function applyMotion(){ if(S.motion!=="lite") S.motion="smooth"; document.body.classList.toggle("lite",S.motion==="lite"); const b=$("#liteBtn"); if(b){ b.setAttribute("aria-pressed",S.motion==="lite"); b.querySelector("span").textContent=S.motion==="lite"?"Animations off":"Animations on"; } }



let doc=null,timer=null,pushing=false,again=false,DB=null,canWrite=null;
function milestones(){ const m={}; for(const c of ORDER){ m["g-"+c]=reach(c,"gold"); m["p-"+c]=reach(c,"plat"); m["h-"+c]=reach(c,"hb"); } m["g-ALL"]=cnt(w=>W(w.id).gold)>=BASE.length; m["p-ALL"]=cnt(w=>W(w.id).plat)>=BASE.length; m["h-ALL"]=cnt(w=>W(w.id).hb)>=BASE.length; for(const w of WEAPONS){ const s=W(w.id); m["gun-"+w.id]= s.mil>=8&&spDone(s)===3&&s.gold; } return m; }
let lastM=null;
/* camos earned since the page was opened: shown in the top bar, ticks up with every claim */
let HAUL=0, HAUL_LAST=null; const haulCount=()=>{ let n=0; for(const w of WEAPONS){ const s=W(w.id); n+=s.mil+spDone(s)+(s.gold?1:0)+(s.plat?1:0)+(s.hb?1:0); } return n+Object.keys(S.mu||{}).length; };
function haulTick(){ const n=haulCount(); if(HAUL_LAST===null){ HAUL_LAST=n; return; } const d=n-HAUL_LAST; HAUL_LAST=n; /* one or two camos at a time = a claim; bigger jumps are setting up old progress, not counted */ if(d>0&&d<=2){ HAUL+=d; const h=$("#haul"); if(h){ h.hidden=false; h.querySelector("b").textContent="+"+HAUL; h.classList.remove("bump"); void h.offsetWidth; h.classList.add("bump"); } } }
function tabFlash(cls,kind){ const b=document.querySelector(`#ctabs [data-c="${cls}"]`); if(!b) return; b.classList.remove("tabpop"); void b.offsetWidth; b.classList.add("tabpop"); try{ burst(b,kind,350); }catch(e){} }
function checkMilestones(){ haulTick(); const now=milestones(); if(lastM){ for(const k in now) if(now[k]&&!lastM[k]){ const kind=k.slice(0,k.indexOf("-")), id=k.slice(k.indexOf("-")+1); if(kind==="gun"){ const w=WEAPONS.find(x=>x.id===id); mtoast("cam-gold","Gold",w.name); } else { const label=id==="ALL"?"Every gun":CLS[id][0]; const tex={g:"cam-gold",p:"cam-plat",h:"cam-hb"}[kind]; const name={g:"Gold",p:"Platinum",h:"Harmonic Break"}[kind]; mtoast(tex, id==="ALL"?BASE.length+" guns · "+name:"Class complete · "+name, label); setTimeout(()=>tabFlash(id,{g:"gold",p:"plat",h:"hb"}[kind]),60); if(id==="ALL"&&kind==="h") celebrate({id:"div",n:"Divergence"}); } } } lastM=now; }
let mtT; function mtoast(tex,small,big){ let d=$(".mtoast"); if(!d){ d=document.createElement("div"); document.body.appendChild(d); } d.className="mtoast cam "+tex; d.innerHTML=`<small>${esc(small)}</small><span>${esc(big)}</span>`; requestAnimationFrame(()=>d.classList.add("show")); clearTimeout(mtT); mtT=setTimeout(()=>d.classList.remove("show"),2600); }
let HIST=[], LASTJ=null;
/* undo remembers progress only (not tabs, filters or settings), so Undo always reverses something you can see */
const PK=["goal","weapons","m","mt","mu","col","skip"]; const snap=()=>JSON.stringify(PK.map(k=>S[k]));
let resortT=null;
function scheduleResort(){ clearTimeout(resortT); if(Q) return; resortT=setTimeout(resortNow,10000); }
function resortNow(){ if(Q||S.open) return; const host=$("#guns"); const before={}; host.querySelectorAll(".gun").forEach(el=>{ before[el.dataset.gun]=el.getBoundingClientRect().top; });
  // guns that no longer belong to this filter slide away first, then the rest settle into place
  const oldKey=VIEW.key; VIEW={}; const t0=totals(); const lf=w=>left(w).length;
  const SFm={"f-max":w=>W(w.id).mil>=8,"f-prest":w=>W(w.id).pr>0,"f-gold":w=>W(w.id).gold,"f-plat":w=>W(w.id).plat,"f-hb":w=>W(w.id).hb};
  const keep=w=> hiddenGun(w)?false : S.tab!=="ALL"?true : SFm[S.filt]?SFm[S.filt](w) : S.filt==="close"?lf(w)>0 : S.filt==="fresh"?done(W(w.id))===0 : S.filt==="done"?lf(w)===0 : true;
  host.querySelectorAll(".ghead").forEach(el=>{ if(S.filt==="close") el.remove(); });
  const leaving=[...host.querySelectorAll(".gun")].filter(el=>{ const w=WEAPONS.find(x=>x.id===el.dataset.gun); return w&&!keep(w); });
  if(leaving.length){ leaving.forEach(el=>{ el.style.transition="opacity .45s ease,transform .45s ease,max-height .5s ease .1s,margin .5s ease .1s"; el.style.maxHeight=el.offsetHeight+"px"; requestAnimationFrame(()=>{ el.style.opacity="0"; el.style.transform="translateX(24px)"; el.style.maxHeight="0"; el.style.marginBottom="0"; }); }); const hidB=leaving.every(el=>hiddenGun(WEAPONS.find(x=>x.id===el.dataset.gun))); toast(leaving.length===1?`${WEAPONS.find(x=>x.id===leaving[0].dataset.gun).name} ${hidB?"hidden":"moved to its new list"}`:`${leaving.length} guns ${hidB?"hidden":"moved to their new lists"}`); setTimeout(()=>{ VIEW={}; resortFlip(host,before); },650); return; }
  resortFlip(host,before); }
function resortFlip(host,before){ render();
  const after={}; host.querySelectorAll(".gun").forEach(el=>{ after[el.dataset.gun]=el; });
  let moved=false; for(const id in after){ if(before[id]===undefined) continue; const dy=before[id]-after[id].getBoundingClientRect().top; if(Math.abs(dy)>2){ moved=true; const el=after[id]; el.style.transition="none"; el.style.transform=`translateY(${dy}px)`; } }
  if(!moved) return; host.getBoundingClientRect(); requestAnimationFrame(()=>{ for(const id in after){ const el=after[id]; el.style.transition="transform .7s cubic-bezier(.2,.8,.2,1)"; el.style.transform=""; } setTimeout(()=>{ for(const id in after){ after[id].style.transition=""; } },800); }); if(S.tab==="ALL"&&S.filt==="close") toast("Reordered by what's closest"); }
function save(){ if(VIEWING) return; scheduleResort(); clearTimeout(cloudT); cloudT=setTimeout(cloudPush,1200); try{ const cur=snap(); if(LASTJ&&LASTJ!==cur){ HIST.push(LASTJ); if(HIST.length>30) HIST.shift(); } LASTJ=cur; }catch(e){} if(!S.started) S.started=Date.now(); S.updated=Math.max(Date.now(),(S.updated||0)+1); lsSave(); try{ checkMilestones(); }catch(e){} try{ if(S.motion!=="instant") navigator.vibrate&&navigator.vibrate(8); }catch(e){} clearTimeout(timer); timer=setTimeout(push,900); }
async function push(){ if(!doc) return; if(pushing){again=true;return;} pushing=true; try{ await doc.set(JSON.parse(JSON.stringify(S))); sync(true);}catch(e){ sync(false); } pushing=false; if(again){again=false;push();} }
