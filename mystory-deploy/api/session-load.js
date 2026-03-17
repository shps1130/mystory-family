
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function supabase(path, method) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  const text = await res.text();
  try { return { ok: res.ok, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, data: null }; }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email required" });

  const result = await supabase(
    `mystory_sessions?user_email=eq.${encodeURIComponent(email.toLowerCase())}&select=session_data`,
    "GET"
  );

  if (!result.ok || !result.data?.length) {
    return res.status(404).json({ session: null });
  }

  return res.status(200).json({ session: result.data[0].session_data });
}
