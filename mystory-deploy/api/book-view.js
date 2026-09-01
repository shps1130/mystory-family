const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Every value below is interpolated into HTML. Before this, user_name,
// chapter titles and narratives went in raw, and book-save.js accepts them
// from an unauthenticated POST — so anyone could publish arbitrary markup and
// script at mystory.family/book/<id>, on the apex domain with a valid
// certificate. That combination is what made it worth fixing ahead of the
// other XSS issues.
function esc(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id || typeof id !== "string" || !/^[a-zA-Z0-9]{6,40}$/.test(id)) {
    return res.status(400).send("Missing or invalid book ID");
  }

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/mystory_books?share_id=eq.${encodeURIComponent(id)}&select=*`,
    {
      headers: {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  const data = await r.json();
  if (!data?.length) return res.status(404).send("Book not found");

  const book = data[0];
  const { user_name, chapters, chapter_narratives } = book;

  const chaptersHtml = (Array.isArray(chapters) ? chapters : []).map(ch => {
    const narrative = chapter_narratives?.[ch.id || ch.title];
    if (!narrative) return "";
    const paragraphs = narrative.split(/\n+/).filter(p => p.trim()).map((p, i) =>
      `<p style="font-size:18px;line-height:2.1;color:#2a1a0a;margin:0 0 24px;font-family:'Georgia',serif;text-indent:${i === 0 ? "0" : "1.5em"};">${esc(p)}</p>`
    ).join("");
    return `
      <div style="margin-bottom:60px;page-break-inside:avoid;">
        <div style="background:${/^#[0-9a-fA-F]{3,8}$/.test(ch.color || "") ? ch.color : "#f5ede0"};padding:20px 36px;border-radius:12px 12px 0 0;border-bottom:1px solid rgba(180,140,80,0.2);">
          <div style="font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#7a5c3a;font-family:Arial,sans-serif;margin-bottom:6px;">Chapter</div>
          <div style="font-size:28px;font-weight:600;color:#3d2b1a;font-family:'Georgia',serif;">${esc(ch.icon)} ${esc(ch.title)}</div>
        </div>
        <div style="background:white;padding:36px;border-radius:0 0 12px 12px;border:1px solid rgba(180,140,80,0.15);border-top:none;">
          ${paragraphs}
        </div>
      </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(user_name)} — A Legacy Story</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Lato:wght@300;400;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fdf6ec; font-family: 'Cormorant Garamond', Georgia, serif; -webkit-font-smoothing: antialiased; }
    .container { max-width: 780px; margin: 0 auto; padding: 60px 24px 100px; }
    @media (max-width: 600px) { .container { padding: 40px 16px 80px; } }
  </style>
</head>
<body>
  <div class="container">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:60px;padding-bottom:40px;border-bottom:1px solid rgba(180,140,80,0.2);">
      <div style="font-size:56px;margin-bottom:20px;">🕊️</div>
      <h1 style="font-size:clamp(36px,6vw,60px);font-weight:300;color:#3d2b1a;font-style:italic;margin:0 0 12px;">${esc(user_name)}</h1>
      <p style="font-size:12px;color:#b8860b;font-family:'Lato',sans-serif;letter-spacing:3px;text-transform:uppercase;margin:0 0 20px;">A Legacy Story</p>
      <div style="width:60px;height:1px;background:#b8860b;margin:0 auto 20px;"></div>
      <p style="font-size:15px;color:#8b7355;font-style:italic;line-height:1.8;">Preserved for the people I love most</p>
    </div>

    <!-- Chapters -->
    ${chaptersHtml}

    <!-- Footer -->
    <div style="text-align:center;padding-top:40px;border-top:1px solid rgba(180,140,80,0.2);">
      <div style="font-size:32px;margin-bottom:12px;">🕊️</div>
      <p style="font-size:14px;color:#8b7355;font-family:'Lato',sans-serif;margin:0 0 6px;">Preserved with love by</p>
      <p style="font-size:16px;color:#b8860b;font-family:'Lato',sans-serif;font-weight:600;margin:0 0 4px;">MyStory.Family</p>
      <a href="https://mystory.family" style="font-size:12px;color:#c4a882;font-family:'Lato',sans-serif;">mystory.family</a>
    </div>

  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.status(200).send(html);
}
