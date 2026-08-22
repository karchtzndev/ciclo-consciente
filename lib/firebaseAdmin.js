// Inicialização compartilhada do Firebase Admin SDK para as funções
// serverless do Vercel (/api). Usa uma variável de ambiente com a
// service account em base64 para evitar problemas com quebras de linha.
const admin = require('firebase-admin');

function initAdmin() {
  if (admin.apps.length) return admin;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 não configurada nas variáveis de ambiente do Vercel.'
    );
  }
  const json = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  admin.initializeApp({ credential: admin.credential.cert(json) });
  return admin;
}

module.exports = {
  getAuth: () => initAdmin().auth(),
  getFirestore: () => initAdmin().firestore(),
};
