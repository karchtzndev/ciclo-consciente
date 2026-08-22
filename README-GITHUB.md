# 🌸 Ciclo Consciente — App de Rastreamento Billings

Acompanhamento do Método de Ovulação Billings (MOB) com Firebase, Stripe e PWA.

## 🚀 Deploy Rápido

### 1️⃣ No seu computador

```bash
# Clonar este repositório
git clone https://github.com/SEU-USUARIO/ciclo-consciente.git
cd ciclo-consciente

# Instalar dependências (se precisar)
npm install
```

### 2️⃣ No Vercel

1. Abra https://vercel.com/import
2. Selecione este repositório
3. Clique "Deploy"
4. Aguarde 2-3 minutos
5. Seu app está online! 🎉

### 3️⃣ No Firebase

Copie suas credenciais em `index.html` e `share.html`:

```javascript
window.__FIREBASE_CONFIG__ = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID"
};
```

## ✨ Features

- ✅ Login com email/senha
- ✅ Registro de ciclo (Método Billings)
- ✅ Gráfico visual com cores
- ✅ Algoritmo automático de fertilidade
- ✅ Assinatura Stripe
- ✅ Notificações push
- ✅ Compartilhamento com instrutora
- ✅ Funciona offline (PWA)
- ✅ LGPD compliant

## 🛠️ Stack

- Frontend: HTML5, Vanilla JS, Tailwind CSS
- Backend: Firebase (Auth, Firestore, Cloud Functions)
- Hosting: Vercel + Firebase
- Payments: Stripe
- Database: Firestore

## 📱 Pré-requisitos

- Conta Firebase (grátis em firebase.google.com)
- Conta Stripe (grátis em stripe.com)
- Conta Vercel (grátis em vercel.com)
- Node.js (para Cloud Functions)

## 📚 Documentação

Veja a pasta `docs/` para guias completos:

- `CHECKLIST-VISUAL.md` — Deploy passo a passo
- `GUIA-COMPLETO-DEPLOY.md` — Muito detalhado
- `FAQ-TROUBLESHOOTING.md` — Problemas comuns
- `PWA-BUILDER-GOOGLE-PLAY.md` — Android distribution

## 🔐 Segurança

- Firestore Rules configuradas para isolamento por usuária
- App Check para proteção contra bots
- Rate limiting para compartilhamentos
- HTTPS obrigatório
- Sem armazenamento de senhas

## 📄 Licença

MIT

## 🙋 Suporte

Procure em `docs/FAQ-TROUBLESHOOTING.md` ou abra uma issue.

---

**Desenvolvido com ❤️ para a comunidade Billings**
