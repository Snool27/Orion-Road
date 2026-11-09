/* Builds: the loadout for each gun, shown right inside the opened gun.
   builds.json holds a Best build and an Early-level build per mode (Multiplayer, DMZ, Warzone).
   One small switch picks the mode and Best/Early; nothing else to click. */
let BUILDS=null;
const BSEL={m:"",k:"best"}; // which mode / which build is showing (same for every gun, not saved)
const MODE_N={mp:"Multiplayer",dmz:"DMZ",wz:"Warzone"}, MODE_S={mp:"MP",dmz:"DMZ",wz:"WZ"};
async function loadBuilds(){ try{ const r=await fetch("builds.json",{cache:"no-cache"}); if(!r.ok) return; const j=await r.json(); if(j&&j.guns&&typeof j.guns==="object"){ BUILDS=clean(j); if(S.open) render(); } }catch(e){} }
const safeUrl=u=>typeof u==="string"&&/^https:\/\/[^\s<>"']+$/.test(u)?u:"";
const okB=b=>b&&Array.isArray(b.attachments)&&b.attachments.length>0;
function buildsHTML(w){
  const g=BUILDS&&BUILDS.guns&&BUILDS.guns[w.id]; if(!g) return "";
  let ms=["mp","dmz","wz"].filter(m=>hasM(m)&&g[m]&&(okB(g[m].best)||okB(g[m].early)));
  if(!ms.length) ms=["mp","dmz","wz"].filter(m=>g[m]&&(okB(g[m].best)||okB(g[m].early)));
  if(!ms.length) return "";
  const m=ms.includes(BSEL.m)?BSEL.m:ms[0], hasE=okB(g[m].early), hasBest=okB(g[m].best);
  const k=(BSEL.k==="early"&&hasE)||!hasBest?"early":"best", b=g[m][k];
  const seg=(key,opts)=>opts.length<2?"":`<div class="bseg">${opts.map(([v,l])=>`<button data-bsel="${key}:${v}" aria-pressed="${(key==="m"?m:k)===v}">${l}</button>`).join("")}</div>`;
  const src=(Array.isArray(b.sources)?b.sources:[]).map(safeUrl).filter(Boolean)[0];
  return `<div class="builds">
    <div class="bh"><b>Build</b>${seg("m",ms.map(x=>[x,MODE_S[x]]))}${seg("k",[hasBest&&["best","Best"],hasE&&["early","Early-level"]].filter(Boolean))}</div>
    <ul class="blist">${b.attachments.slice(0,5).map(a=>`<li><span>${esc(a.slot||"")}</span><b>${esc(a.name||"")}</b></li>`).join("")}</ul>
    <p class="bnote">${k==="early"&&b.level?`Usable from level ${esc(b.level)}. `:""}${esc(b.note||"")}${ms.length<2?` <em>${MODE_N[m]}</em>`:""}${src?` <a href="${esc(src)}" target="_blank" rel="noopener nofollow">source</a>`:""}</p>
  </div>`;
}
