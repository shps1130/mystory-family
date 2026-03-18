const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, session } = req.body;
  if (!email || !session) return res.status(400).json({ error: "Email and session required" });

  const normalizedEmail = email.toLowerCase();

  // Trim session to essentials only — keep messages small to avoid payload limits
  const trimmed = {
    user: session.user,
    hasPaid: session.hasPaid,
    screen: session.screen,
    bookSize: session.bookSize,
    promoCode: session.promoCode,
    promoInfo: session.promoInfo,
    onboardAnswers: session.onboardAnswers,
    persona: session.persona,
    systemPrompt: session.systemPrompt,
    enabledChapters: session.enabledChapters,
    chapters: session.chapters,
    activeChapter: session.activeChapter,
    chapterNarratives: session.chapterNarratives,
    // Keep only last 20 messages to avoid size limits
    messages: Array.isArray(session.messages) ? session.messages.slice(-20) : [],
    // Keep chapter history but trim each to last 10 messages
    chapterHistory: session.chapterHistory
      ? Object.fromEntries(
          Object.entries(session.chapterHistory).map(([k, v]) => [
            k, Array.isArray(v) ? v.slice(-10) : v
          ])
        )
      : {},
    previewChapter: session.previewChapter,
  };

  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Prefer": "return=representation",
  };

  // Try PATCH first
  const updateRes = await fetch(
    `${SUPABASE_URL}/rest/v1/mystory_sessions?user_email=eq.${encodeURIComponent(normalizedEmail)}`,
    { method: "PATCH", headers, body: JSON.stringify({ session_data: trimmed, updated_at: new Date().toISOString() }) }
  );

  const updateText = await updateRes.text();
  let updated = [];
  try { updated = JSON.parse(updateText); } catch {}

  // If nothing updated, INSERT
  if (!Array.isArray(updated) || updated.length === 0) {
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/mystory_sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ user_email: normalizedEmail, session_data: trimmed, updated_at: new Date().toISOString() }),
    });
    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error("Session insert failed:", insertRes.status, errText);
      return res.status(500).json({ error: "Could not save session", detail: errText });
    }
  }

  return res.status(200).json({ ok: true });
}
