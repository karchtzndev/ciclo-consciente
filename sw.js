// Service worker único do Ciclo Consciente.
// Um só arquivo cuida de duas coisas (de propósito — dois service workers
// registrados na mesma raiz "/" entrariam em conflito de escopo):
//   1) Cache do app-shell, para instalação como PWA e uso offline.
//   2) Recebimento de notificações push em segundo plano (Firebase Cloud Messaging).

const CACHE_NAME = 'ciclo-consciente-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Nunca cachear chamadas a APIs, Firebase ou Stripe — só o app-shell estático.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || network;
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
