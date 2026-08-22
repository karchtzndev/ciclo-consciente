// POST /api/stripe-webhook
// Recebe eventos do Stripe e mantém o campo `plan` do Firestore em sincronia
// com o status real da assinatura. Configure esta URL no Dashboard do
// Stripe (Developers > Webhooks) ouvindo:
//   checkout.session.completed
//   customer.subscription.updated
//   customer.subscription.deleted
const Stripe = require('stripe');
const { getFirestore } = require('../lib/firebaseAdmin');

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', (chunk) => chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Assinatura do webhook inválida:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const db = getFirestore();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const uid = session.metadata && session.metadata.uid;
        if (uid) {
          await db.collection('users').doc(uid).update({
            plan: 'premium',
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
          });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const snap = await db.collection('users').where('stripeSubscriptionId', '==', sub.id).limit(1).get();
        if (!snap.empty) {
          const active = sub.status === 'active' || sub.status === 'trialing';
          await snap.docs[0].ref.update({ plan: active ? 'premium' : 'free' });
        }
        break;
      }
      default:
        break; // eventos não tratados são ignorados
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('stripe-webhook handler error:', err);
    res.status(500).json({ error: 'internal error' });
  }
}

module.exports = handler;
// Necessário para validar a assinatura do webhook: precisamos do corpo
// bruto (raw), não do JSON já interpretado pelo Vercel. Este export TEM
// que vir depois de `module.exports = handler`, senão é perdido.
module.exports.config = { api: { bodyParser: false } };
