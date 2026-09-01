// create-interview-checkout.js
// Checkout for the interview product, bought before the buyer has an account.
//
// Stripe collects the email; the webhook writes an entitlement keyed to it;
// the buyer then signs in at /interview with that same address and
// claim_entitlements() binds the purchase to their new user id.
//
// Set INTERVIEW_PRICE_ID in the Vercel environment. Don't hardcode it the
// way create-checkout.js does — that file has live price ids in source,
// which makes switching between test and live mode a code change.

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const INTERVIEW_PRICE_ID = process.env.INTERVIEW_PRICE_ID;
const APP_URL = process.env.APP_URL || "https://mystory.family";

const ALLOWED_ORIGINS = [
  "https://mystory.family",
  "https://www.mystory.family",
];

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!STRIPE_SECRET_KEY || !INTERVIEW_PRICE_ID) {
    console.error("Stripe not configured for interview product");
    return res.status(500).json({ error: "Not configured" });
  }

  // Email is optional here — Stripe will collect it if we don't pass one.
  // If the buyer typed it on our page, prefill so the address they use for
  // sign-in is the one we key the entitlement to.
  const { email } = req.body || {};
  const cleanEmail =
    typeof email === "string" && email.includes("@")
      ? email.toLowerCase().trim().slice(0, 254)
      : null;

  try {
    const params = new URLSearchParams({
      "mode": "payment",
      "line_items[0][price]": INTERVIEW_PRICE_ID,
      "line_items[0][quantity]": "1",
      "success_url": `${APP_URL}/interview?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      "cancel_url": `${APP_URL}/interview?purchase=cancelled`,
      // Read by stripe-webhook.js to decide which entitlement to write.
      "metadata[product]": "interview",
    });

    if (cleanEmail) params.set("customer_email", cleanEmail);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error("Stripe error:", session);
      return res.status(502).json({ error: "Could not start checkout" });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return res.status(502).json({ error: "Could not start checkout" });
  }
}
