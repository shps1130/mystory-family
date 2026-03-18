export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  const { email } = req.method === "POST" ? req.body : req.query;
  if (!email) return res.status(400).json({ error: "Email required" });
  const normalizedEmail = email.toLowerCase();

  // GET — check if user has paid
  if (req.method === "GET") {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/mystory_users?email=eq.${encodeURIComponent(normalizedEmail)}&select=has_paid`,
      { headers }
    );
    const data = await r.json();
    return res.status(200).json({ hasPaid: data?.[0]?.has_paid === true });
  }

  // POST — mark user as paid
  if (req.method === "POST") {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/mystory_users?email=eq.${encodeURIComponent(normalizedEmail)}`,
      { method: "PATCH", headers: { ...headers, "Prefer": "return=representation" }, body: JSON.stringify({ has_paid: true }) }
    );
    const result = await r.json();
    console.log("paid-status PATCH result:", r.status, JSON.stringify(result));
    return res.status(200).json({ ok: true, status: r.status });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
