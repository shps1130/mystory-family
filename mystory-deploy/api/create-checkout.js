const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const APP_URL = process.env.APP_URL || "https://mystory.family";

const GIFT_PRICE_ID     = "price_1TCkylJnz5eB57ouay1oU0BF";
const HARDCOVER_PRICE_ID = "price_1TKNL5Jnz5eB57ou8OcGGpww";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { buyerName, buyerEmail, recipientName, hardcover } = req.body;

  if (!buyerName || !buyerEmail || !recipientName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const lineItems = [
    { price: GIFT_PRICE_ID, quantity: 1 }
  ];

  if (hardcover) {
    lineItems.push({ price: HARDCOVER_PRICE_ID, quantity: 1 });
  }

  try {
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "payment_method_types[0]": "card",
        "line_items[0][price]": lineItems[0].price,
        "line_items[0][quantity]": "1",
        ...(hardcover ? {
          "line_items[1][price]": lineItems[1].price,
          "line_items[1][quantity]": "1",
        } : {}),
        "mode": "payment",
        "success_url": `${APP_URL}/gift.html?success=true`,
        "cancel_url": `${APP_URL}/gift.html`,
        "customer_email": buyerEmail,
        "metadata[buyerName]": buyerName,
        "metadata[buyerEmail]": buyerEmail,
        "metadata[recipientName]": recipientName,
        "metadata[hardcover]": hardcover ? "true" : "false",
      }).toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error("Stripe error:", session);
      return res.status(500).json({ error: session.error?.message || "Stripe error" });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return res.status(500).json({ error: err.message });
  }
}
