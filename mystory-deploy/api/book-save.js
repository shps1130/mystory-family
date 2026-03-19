const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userEmail, userName, chapters, chapterNarratives } = req.body;
  if (!userEmail || !chapters) return res.status(400).json({ error: "Missing fields" });

  // Generate a unique share ID
  const shareId = crypto.randomUUID().replace(/-/g, "").substring(0, 12);

  const bookData = {
    share_id: shareId,
    user_email: userEmail.toLowerCase(),
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
