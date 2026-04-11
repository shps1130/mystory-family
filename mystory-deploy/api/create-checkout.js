const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { buyerName, buyerEmail, recipientName, hardcover } = req.body;

  if (!buyerName || !buyerEmail || !recipientName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const lineItems = [
    { price: 'price_1TCkylJnz5eB57ouay1oU0BF', quantity: 1 }
  ];

  if (hardcover) {
    lineItems.push({ price: 'price_1TKNL5Jnz5eB57ou8OcGGpww', quantity: 1 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.APP_URL}/gift-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/gift`,
      customer_email: buyerEmail,
      metadata: {
        buyerName,
        buyerEmail,
        recipientName,
        hardcover: hardcover ? 'true' : 'false',
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
};
