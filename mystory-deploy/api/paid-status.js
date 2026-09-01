// paid-status.js — READ ONLY.
//
// Entitlement is granted server-side only, in two places:
//   1. api/stripe-webhook.js   (direct purchase, verified Stripe signature)
//   2. api/gift-redeem.js      (valid unredeemed gift code)
//
// This route can no longer write. The previous POST handler let anyone
// PATCH has_paid=true for any email with a single unauthenticated request.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email required" });
  }

  const normalizedEmail = email.toLowerCase().trim().slice(0, 254);
  if (!normalizedEmail.includes("@")) {
    return res.status(400).json({ error: "Invalid email" });
  }

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/mystory_users?email=eq.${encodeURIComponent(normalizedEmail)}&select=has_paid`,
      {
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (!r.ok) {
      console.error("paid-status lookup failed:", r.status, await r.text());
      return res.status(502).json({ error: "Could not check payment status" });
    }

    const data = await r.json();
    return res.status(200).json({ hasPaid: data?.[0]?.has_paid === true });
  } catch (err) {
    console.error("paid-status error:", err);
    return res.status(500).json({ error: "Could not check payment status" });
  }
}
