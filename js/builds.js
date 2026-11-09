/* Builds: loadouts for each gun, for the modes you play.
   Links to the latest guides are always shown. When builds.json exists (written by the daily GitHub job),
   the actual attachments show too: a Best build and an Early-level build per mode, with sources. */
let BUILDS=null;
const MODE_N={mp:"Multiplayer",dmz:"DMZ",wz:"Warzone"};
async function loadBuilds(){ try{ const r=await fetch("builds.json",{cache:"no-cache"}); if(!r.ok) return; const j=await r.json(); if(j&&j.guns&&typeof j.guns==="object"){ BUILDS=clean(j); if(S.open) render(); } }catch(e){} }
const safeUrl=u=>typeof u==="string"&&/^https:\/\/[^\s<>"']+$/.test(u)?u:"";
function buildCard(b,kind){ if(!b||!Array.isArray(b.attachments)||!b.attachments.length) return "";
  const src=(Array.isArray(b.sources)?b.sources:[]).map(safeUrl).filter(Boolean).slice(0,3);
  return `<div class="bcard ${kind}"><div class="bt"><b>${kind==="best"?"Best build":"Early-level build"}</b>${b.level?`<small>usable from level ${esc(b.level)}</small>`:""}</div>
    <ul>${b.attachments.slice(0,5).map(a=>`<li><span>${esc(a.slot||"")}</span><b>${esc(a.name||"")}</b></li>`).join("")}</ul>
    ${b.note?`<p>${esc(b.note)}</p>`:""}${src.length?`<div class="src">${src.map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener nofollow">source ${i+1} ↗</a>`).join("")}</div>`:""}</div>`; }
function buildsHTML(w){
  const ms=["mp","dmz","wz"].filter(m=>hasM(m)); if(!ms.length) ms.push("mp");
  const q=encodeURIComponent, g=BUILDS&&BUILDS.guns&&BUILDS.guns[w.id];
  const yt=(m,early)=>`https://www.youtube.com/results?search_query=${q(`MW4 ${w.name} ${early?"early level build":m==="mp"?"best class setup":m==="dmz"?"best DMZ loadout":"best Warzone loadout"}`)}`;
  const guide=m=>m==="dmz"?"https://codmunity.gg/mw4-dmz":`https://codmunity.gg/weapon/mw4/${q(w.id)}`;
  const when=BUILDS&&BUILDS.updated?`builds checked ${esc(String(BUILDS.updated).slice(0,10))}${BUILDS.patch?" · "+esc(BUILDS.patch):""}`:"opens the latest guides";
  return `<div class="builds"><div class="bh"><b>Builds</b><small>${when}</small></div>${ms.map(m=>{ const b=g&&g[m];
    return `<div class="bm"><em>${MODE_N[m]}</em>${b?`<div class="bgrid">${buildCard(b.best,"best")}${buildCard(b.early,"early")}</div>`:""}
      <div class="blinks"><a href="${guide(m)}" target="_blank" rel="noopener">${m==="dmz"?"DMZ meta list":"Meta build"} ↗</a><a href="${yt(m)}" target="_blank" rel="noopener">Videos ↗</a><a href="${yt(m,true)}" target="_blank" rel="noopener">Early-level ↗</a></div></div>`; }).join("")}</div>`;
}
