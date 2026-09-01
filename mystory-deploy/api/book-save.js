const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userEmail, userName, chapters, chapterNarratives } = req.body;
  if (!userEmail || !chapters) return res.status(400).json({ error: "Missing fields" });

  if (!Array.isArray(chapters) || chapters.length > 50) {
    return res.status(400).json({ error: "Invalid chapters" });
  }
  if (JSON.stringify(req.body).length > 400_000) {
    return res.status(413).json({ error: "Book too large" });
  }

  // Interim gate. This route publishes a page at mystory.family/book/<id>,
  // and it used to accept any content from anyone — arbitrary hosting on the
  // apex domain. Real auth isn't possible yet because the memoir side has no
  // session tokens, so for now the email must belong to a paying account.
  // Replace with a Supabase JWT check when App.jsx migrates.
  const email = String(userEmail).toLowerCase().trim();
  const check = await fetch(
    `${SUPABASE_URL}/rest/v1/mystory_users?email=eq.${encodeURIComponent(email)}&select=has_paid`,
    {
      headers: {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  const rows = check.ok ? await check.json() : null;
  if (!rows?.[0]?.has_paid) {
    return res.status(403).json({ error: "Not authorized to publish a book" });
  }

  // Generate a unique share ID
  const { randomUUID } = await import("crypto");
  const shareId = randomUUID().replace(/-/g, "").substring(0, 16);

  const bookData = {
    share_id: shareId,
    user_email: email,
    user_name: userName,
    chapters: chapters,
    chapter_narratives: chapterNarratives,
    created_at: new Date().toISOString(),
  };

  // Save to Supabase
  const r = await fetch(`${SUPABASE_URL}/rest/v1/mystory_books`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify(bookData),
  });

  if (!r.ok) {
    const err = await r.text();
    console.error("book-save error:", err);
    return res.status(500).json({ error: "Could not save book" });
  }

  return res.status(200).json({ shareId, url: `https://mystory.family/book/${shareId}` });
}
