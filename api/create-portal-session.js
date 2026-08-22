// POST /api/create-portal-session
// Abre o Portal de Cobrança do Stripe, onde a usuária pode atualizar
// o cartão ou cancelar a assinatura Premium.
const Stripe = require('stripe');
const { getAuth, getFirestore } = require('../lib/firebaseAdmin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  try {
    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!idToken) {
      res.status(401).json({ error: 'Não autenticado.' });
      return;
    }

    const decoded = await getAuth().verifyIdToken(idToken);
    const db = getFirestore();
    const userSnap = await db.collection('users').doc(decoded.uid).get();
    const customerId = userSnap.exists ? userSnap.data().stripeCustomerId : null;

    if (!customerId) {
      res.status(400).json({ error: 'Nenhuma assinatura encontrada para esta conta.' });
      return;
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`;

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/`,
    });

    res.status(200).json({ url: portal.url });
  } catch (err) {
    console.error('create-portal-session error:', err);
    res.status(500).json({ error: 'Não foi possível abrir o portal de assinatura.' });
  }
};
