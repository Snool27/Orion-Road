/* Orion Road service worker: app shell cached for offline use; the page itself is fetched fresh when online so updates reach everyone */
const V="orion-road-v4"; /* bumping this name deletes the old cache, including any database answers v2 kept by mistake */
const SHELL=["./","./index.html","./css/style.css","./js/data.js","./js/app.js","./js/squad.js","./js/ui.js","./js/boot.js","./manifest.webmanifest","./icon.svg","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
/* only the app's own files, the Supabase library and fonts are cached. Database answers (supabase.co) must always be fresh, so they're never touched here */
const CACHEABLE=u=>u.origin===self.location.origin||u.hostname==="cdn.jsdelivr.net"||u.hostname==="fonts.googleapis.com"||u.hostname==="fonts.gstatic.com";
self.addEventListener("fetch",e=>{ const r=e.request; if(r.method!=="GET") return; if(!CACHEABLE(new URL(r.url))) return;
  const nav=r.mode==="navigate"||r.destination==="document";
  if(nav||r.url.endsWith("/index.html")){ e.respondWith(fetch(r).then(res=>{ const copy=res.clone(); caches.open(V).then(c=>c.put("./index.html",copy)); return res; }).catch(()=>caches.match("./index.html"))); return; }
  /* the site's own code and styles: always try the network first so updates arrive; the saved copy is only for offline */
  const u=new URL(r.url); if(u.origin===self.location.origin&&/\.(js|css)$/.test(u.pathname)){ e.respondWith(fetch(r).then(res=>{ if(res.ok){ const copy=res.clone(); caches.open(V).then(c=>c.put(u.pathname.replace(/^.*?\/(css|js)\//,"./$1/"),copy)); } return res; }).catch(()=>caches.match(r,{ignoreSearch:true}).then(h=>h||caches.match(u.pathname.replace(/^.*?\/(css|js)\//,"./$1/"))))); return; }
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{ const copy=res.clone(); caches.open(V).then(c=>c.put(r,copy)); return res; })));
});
