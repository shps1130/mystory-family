const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function supabase(path, method, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Prefer": "return=representation,resolution=merge-duplicates",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, session } = req.body;
  if (!email || !session) return res.status(400).json({ error: "Email and session required" });

  // Upsert — insert if not exists, update if exists
  const result = await supabase("mystory_sessions", "POST", {
    user_email: email.toLowerCase(),
    session_data: session,
    updated_at: new Date().toISOString(),
  });

  if (!result.ok) {
    return res.status(500).json({ error: "Could not save session" });
  }

  return res.status(200).json({ ok: true });
}
