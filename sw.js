/* AFF Workers Overtime - Service Worker
   - يحفظ ملفات البرنامج والمكتبات لتسريع الفتح والعمل عند ضعف الإنترنت
   - لا يلمس أبداً بيانات GitHub أو ملفات قاعدة البيانات (دائماً من الإنترنت)
   - عند رفع نسخة جديدة غيّر رقم VERSION لتحديث الملفات المحفوظة */
const VERSION = 'aff-v2';
const CORE = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];
const CDN = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // البيانات: لا تمرّ عبر الكاش أبداً
  if (u.hostname === 'api.github.com' || u.hostname.endsWith('githubusercontent.com') ||
      /\.(sqlite|db)$/i.test(u.pathname)) return;

  // صفحة البرنامج: الإنترنت أولاً (لتصل التحديثات فوراً) ثم النسخة المحفوظة
  if (r.mode === 'navigate' || u.pathname.endsWith('/index.html')) {
    e.respondWith(
      fetch(r).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); }
        return res;
      }).catch(() => caches.match('index.html').then(m => m || caches.match('./')))
    );
    return;
  }

  // المكتبات والخطوط والأيقونات: من الكاش أولاً مع تحديث في الخلفية
  if (CDN.includes(u.hostname) || u.origin === location.origin) {
    e.respondWith(
      caches.match(r).then(hit => {
        const net = fetch(r).then(res => {
          if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(r, copy)); }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
