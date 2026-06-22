/* Service Worker — Selva Negra 2026
   Permite usar la guía sin internet: cachea las páginas y las fotos. */
const VERSION = 'sn-v2';
const SHELL = 'shell-' + VERSION;
const IMGS  = 'imgs-'  + VERSION;
const SHELL_URLS = ['./', 'index.html', 'itinerario-selva-negra.html', 'top3.html'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(SHELL).then(function(c){ return c.addAll(SHELL_URLS); }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k.indexOf(VERSION) === -1; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch(err){ return; }

  var isImg = /(^|\.)wikimedia\.org$/.test(url.hostname) || /\.(jpe?g|png|gif|webp|svg)$/i.test(url.pathname);
  if (isImg) {
    // cache-first para fotos (incluye respuestas opacas cross-origin)
    e.respondWith(
      caches.open(IMGS).then(function(cache){
        return cache.match(req).then(function(hit){
          return hit || fetch(req).then(function(res){
            if (res && (res.ok || res.type === 'opaque')) { try { cache.put(req, res.clone()); } catch(x){} }
            return res;
          }).catch(function(){ return hit; });
        });
      })
    );
    return;
  }

  if (req.mode === 'navigate' || url.origin === self.location.origin) {
    // network-first para páginas/recursos propios, con fallback al cache
    e.respondWith(
      fetch(req).then(function(res){
        if (res && res.ok) { var copy = res.clone(); caches.open(SHELL).then(function(c){ try { c.put(req, copy); } catch(x){} }); }
        return res;
      }).catch(function(){
        return caches.match(req).then(function(h){ return h || caches.match('itinerario-selva-negra.html'); });
      })
    );
    return;
  }
});
