/* Start-up, plus the offline helper (service worker) registration. */
async function boot(){ document.querySelectorAll(".nbase").forEach(e=>{ e.textContent=BASE.length; }); load(); lastM=milestones(); try{ LASTJ=snap(); }catch(e){} render(); sync(false); refreshExp();
  cloudInit(); if(SUPA.url) return;
  const HOSTED=!(window.claude&&window.claude.use); if(HOSTED){ sync(false); return; }
  let db=null,u=null; for(let i=0;i<4&&!(db&&u);i++){ try{ [db,u]=await Promise.all([claude.use("db"),claude.use("user")]); }catch(e){} if(!(db&&u)) await new Promise(r=>setTimeout(r,1500*(i+1))); }
  try{ DB=db; const uid=u?await u.id():null;
    if(db&&uid){ doc=db.doc("data/users/"+uid+"/progress"); const snap=await doc.get(); if(snap.exists){ const r=snap.data(); if(r&&r.v===4&&(r.updated||0)>=(S.updated||0)){ S=Object.assign(blank(),r); lsSave(); render(); } else if(S.updated) push(); } else if(S.updated) push(); sync(true); }
  }catch(e){} }
const code=()=>{ try{ return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }catch(e){return "";} };
function refreshExp(){ $("#exp").value=code(); }
$("#refresh").onclick=refreshExp;
$("#copy").onclick=async()=>{ refreshExp(); try{ await navigator.clipboard.writeText($("#exp").value); toast("Copied"); }catch(e){ $("#exp").select(); toast("Select and copy"); } };
$("#impGo").onclick=()=>{ try{ const o=JSON.parse(decodeURIComponent(escape(atob($("#imp").value.trim())))); if(!o||o.v!==4) throw 0; S=Object.assign(blank(),clean(o)); save(); render(); refreshExp(); toast("Imported"); }catch(e){ toast("That code didn't work"); } };
$("#reset").onclick=()=>{ $("#resetYes").hidden=false; };
$("#bak").onclick=async()=>{ const data=JSON.stringify(Object.assign({},S,{open:null}),null,1), filename="orion-road-"+new Date().toISOString().slice(0,10)+".json";
  try{ const dl=await (window.claude?.use?window.claude.use("downloads"):null); if(dl){ await dl.save({filename,data}); toast("Backup saved"); return; } }catch(e){ if(e&&e.code==="declined") return; }
  try{ const blob=new Blob([data],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); toast("Backup saved to your downloads"); }
  catch(e){ refreshExp(); $("#exp").select(); toast("Couldn't save a file — copy the transfer code instead"); } };
$("#bakIn").onchange=async e=>{ const f=e.target.files[0]; if(!f) return; try{ const o=JSON.parse(await f.text()); if(!o||o.v!==4) throw 0; S=Object.assign(blank(),clean(o),{open:null}); if(!FILT_OK.includes(S.filt)) S.filt=""; save(); render(); refreshExp(); toast("Restored from backup"); }catch(err){ toast("That file didn't work"); } e.target.value=""; };
/* flush to the account right away when the tab is hidden or closed, and ask the browser to keep this site's storage */
document.addEventListener("visibilitychange",()=>{ if(document.hidden){ if(timer){ clearTimeout(timer); timer=null; push(); } if(cloudT){ clearTimeout(cloudT); cloudT=null; cloudPush(); } } });
window.addEventListener("pagehide",()=>{ if(timer){ clearTimeout(timer); timer=null; push(); } });
try{ navigator.storage&&navigator.storage.persist&&navigator.storage.persist(); }catch(e){}
$("#resetYes").onclick=()=>{ const keep={seen:S.seen}; S=Object.assign(blank(),keep); save(); render(); refreshExp(); $("#resetYes").hidden=true; toast("Progress reset"); };
let tt; function toast(m){ const t=$("#toast"); t.textContent=m; t.classList.add("show"); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove("show"),1600); }
window.claude?.hot?.snapshot?.(()=>({S:JSON.parse(JSON.stringify(S))}));
let STARTED=false;
function start(d){ if(STARTED) return; STARTED=true; try{ if(d&&d.S&&typeof d.S==="object") S=Object.assign(blank(),d.S); }catch(e){} boot(); }
try{ if(window.claude?.hot?.ready){ window.claude.hot.ready(start); setTimeout(()=>start({}),1500); } else start(window.claude?.hot?.data ?? {}); }catch(e){ start({}); }

/* keep installed copies fresh: check for a new build on every open and when the app comes back to the foreground; reload once when one arrives */
const HAD_SW=!!(navigator.serviceWorker&&navigator.serviceWorker.controller);
if("serviceWorker" in navigator){ window.addEventListener("load",async()=>{ try{ const reg=await navigator.serviceWorker.register("./sw.js"); const check=()=>reg.update().catch(()=>{}); check(); setInterval(check,10*60*1000); document.addEventListener("visibilitychange",()=>{ if(!document.hidden) check(); });
  let reloaded=false; navigator.serviceWorker.addEventListener("controllerchange",()=>{ if(reloaded||!HAD_SW) return; /* first visit: the helper just installed, nothing to update, so no reload */ reloaded=true; sessionStorage.setItem("orion-updated","1"); location.reload(); }); }catch(e){} }); }
if(sessionStorage.getItem("orion-updated")){ sessionStorage.removeItem("orion-updated"); window.__swUpdated=true; }
