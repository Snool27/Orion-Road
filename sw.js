/* Orion Road service worker: app shell cached for offline use; the page itself is fetched fresh when online so updates reach everyone */
const V="orion-road-v1";
const SHELL=["./","./index.html","./manifest.webmanifest","./icon.svg","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch",e=>{ const r=e.request; if(r.method!=="GET") return;
  const nav=r.mode==="navigate"||r.destination==="document";
  if(nav||r.url.endsWith("/index.html")){ e.respondWith(fetch(r).then(res=>{ const copy=res.clone(); caches.open(V).then(c=>c.put("./index.html",copy)); return res; }).catch(()=>caches.match("./index.html"))); return; }
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{ const copy=res.clone(); caches.open(V).then(c=>c.put(r,copy)); return res; })));
});
