/**
 * Cloud Function agendada — lembrete diário do Ciclo Consciente.
 *
 * Roda todo dia às 20h (horário de São Paulo) e envia uma notificação push
 * para cada usuária que:
 *   - tem um token de notificação salvo (fcmToken em users/{uid}), e
 *   - ainda não registrou nada hoje (users/{uid}/records/{hoje} não existe).
 *
 * Deploy (requer plano Blaze — funções agendadas usam Cloud Scheduler):
 *   cd functions
 *   npm install
 *   firebase deploy --only functions
 */
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

function todayStr(tz) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(new Date()); // YYYY-MM-DD
}

exports.dailyReminder = onSchedule(
  { schedule: '0 20 * * *', timeZone: 'America/Sao_Paulo' },
  async () => {
    const db = getFirestore();
    const messaging = getMessaging();
    const today = todayStr('America/Sao_Paulo');

    const usersSnap = await db.collection('users').where('fcmToken', '!=', null).get();
    const staleTokens = [];

    await Promise.all(
      usersSnap.docs.map(async (doc) => {
        const user = doc.data();
        if (!user.fcmToken) return;

        const todayRecord = await doc.ref.collection('records').doc(today).get();
        if (todayRecord.exists) return; // já registrou hoje, não incomoda

        try {
          await messaging.send({
            token: user.fcmToken,
            notification: {
              title: 'Ciclo Consciente',
              body: 'Não esqueça de registrar sua observação de hoje 🌸',
            },
            webpush: { fcmOptions: { link: '/' } },
          });
        } catch (err) {
          if (err.code === 'messaging/registration-token-not-registered') {
            staleTokens.push(doc.ref);
          } else {
            console.error(`Falha ao notificar ${doc.id}:`, err.message);
          }
        }
      })
    );

    // limpa tokens inválidos (usuária desinstalou/revogou permissão)
    await Promise.all(staleTokens.map((ref) => ref.update({ fcmToken: null })));
  }
);

/**
 * getSharedChart — usada pela página pública share.html.
 *
 * Por que uma Cloud Function e não uma regra do Firestore?
 * As Regras de Segurança conseguem validar "é o dono do documento" ou
 * "existe um documento neste caminho fixo", mas não conseguem validar
 * "o token aleatório que o cliente está apresentando corresponde a um
 * compartilhamento válido" — esse tipo de checagem de posse de um
 * segredo (o shareId) precisa acontecer em código de servidor. Aqui a
 * função usa o Admin SDK (que ignora as Regras) para validar o shareId
 * e devolve só os campos necessários para o gráfico — nunca e-mail,
 * plano ou qualquer outro dado da conta.
 */
exports.getSharedChart = onRequest({ cors: true }, async (req, res) => {
  // Para reforçar a segurança em produção, depois de configurar o Firebase
  // App Check (ver README, seção 2.2), troque a linha acima por:
  //   onRequest({ cors: true, enforceAppCheck: true }, async (req, res) => {
  // Deixamos desabilitado por padrão para o recurso não quebrar antes de
  // você configurar a chave reCAPTCHA — mas o rate limit abaixo já reduz
  // bastante o risco de abuso mesmo sem o App Check.
  const shareId = req.query.shareId;
  if (!shareId || typeof shareId !== 'string') {
    res.status(400).json({ error: 'shareId ausente.' });
    return;
  }

  const db = getFirestore();
  try {
    const shareSnap = await db.collection('shares').doc(shareId).get();
    if (!shareSnap.exists) {
      res.status(404).json({ error: 'Link de compartilhamento inválido ou revogado.' });
      return;
    }
    const share = shareSnap.data();
    if (!share.expiresAt || share.expiresAt.toMillis() < Date.now()) {
      res.status(410).json({ error: 'Este link de compartilhamento expirou.' });
      return;
    }

    const recordsSnap = await db
      .collection('users')
      .doc(share.ownerUid)
      .collection('records')
      .orderBy('date', 'asc')
      .get();

    res.status(200).json({
      ownerName: share.ownerName || 'Usuária',
      records: recordsSnap.docs.map((d) => d.data()),
    });
  } catch (err) {
    console.error('getSharedChart error:', err);
    res.status(500).json({ error: 'Erro ao carregar o gráfico compartilhado.' });
  }
});
