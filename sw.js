// Service worker único do Ciclo Consciente.
// Um só arquivo cuida de duas coisas (de propósito — dois service workers
// registrados na mesma raiz "/" entrariam em conflito de escopo):
//   1) Cache do app-shell, para instalação como PWA e uso offline.
//   2) Recebimento de notificações push em segundo plano (Firebase Cloud Messaging).
//
// ESTRATÉGIA DE CACHE
// -------------------
// HTML (navegação)  -> network-first: sempre tenta a rede antes. Assim uma
//                      correção publicada aparece na próxima abertura, sem
//                      a pessoa precisar limpar nada. O cache só entra em
//                      cena se estiver offline.
// Demais estáticos  -> stale-while-revalidate: responde rápido pelo cache e
//                      atualiza a cópia em segundo plano.
//
// Ao mudar CACHE_VERSION, todo cache antigo é descartado no activate.
const CACHE_VERSION = 'v5';
const CACHE_NAME = `ciclo-consciente-${CACHE_VERSION}`;
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  // Assume o controle sem esperar as abas antigas fecharem.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Permite que a página peça a ativação imediata de uma versão nova.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function ehNavegacao(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && (request.headers.get('accept') || '').includes('text/html'));
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca cachear APIs, Firebase ou Stripe — só o app-shell estático.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // --- HTML: network-first ---
  if (ehNavegacao(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return resp;
        })
        .catch(() =>
          // Offline: usa a última cópia guardada.
          caches.match(event.request).then((cached) => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  // --- Demais estáticos: stale-while-revalidate ---
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const rede = fetch(event.request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || rede;
    })
  );
});

/* -------------------------------------------------------------------
   Firebase Cloud Messaging — notificações push em segundo plano.
   Service workers não enxergam window.__FIREBASE_CONFIG__ do index.html,
   então a config precisa ficar duplicada aqui. Mantenha os dois em sincronia.
------------------------------------------------------------------- */
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey: "AIzaSyBCEx6fsO-u20dQTCf5WYRv7BqGLf_uiQ8",
    authDomain: "ciclo-consciente-ce313.firebaseapp.com",
    projectId: "ciclo-consciente-ce313",
    storageBucket: "ciclo-consciente-ce313.firebasestorage.app",
    messagingSenderId: "748848950217",
    appId: "1:748848950217:web:98abbbdf0e4a4cee941618"
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = (payload.notification && payload.notification.title) || 'Ciclo Consciente';
    const options = {
      body: (payload.notification && payload.notification.body) || 'Não esqueça de registrar sua observação de hoje.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: '/' },
    };
    self.registration.showNotification(title, options);
  });
} catch (e) {
  // Se a config ainda não foi preenchida (SUA_API_KEY_AQUI), o cache do
  // app-shell acima continua funcionando normalmente — só o push fica inativo.
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});
