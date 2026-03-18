const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, session } = req.body;
  if (!email || !session) return res.status(400).json({ error: "Email and session required" });

  const normalizedEmail = email.toLowerCase();

  // Try update first
  const updateRes = await fetch(
    `${SUPABASE_URL}/rest/v1/mystory_sessions?user_email=eq.${encodeURIComponent(normalizedEmail)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ session_data: session, updated_at: new Date().toISOString() }),
    }
  );

  const updateText = await updateRes.text();
  let updateData;
  try { updateData = JSON.parse(updateText); } catch { updateData = []; }

  // If no rows updated, insert
  if (!updateData?.length) {
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/mystory_sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify({
        user_email: normalizedEmail,
        session_data: session,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error("Session insert error:", errText);
      return res.status(500).json({ error: "Could not save session" });
    }
  }

  return res.status(200).json({ ok: true });
}
