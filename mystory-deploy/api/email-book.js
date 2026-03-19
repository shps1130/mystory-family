const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userEmail, userName, recipientEmail, shareUrl, chapters, chapterNarratives } = req.body;
  if (!userEmail) return res.status(400).json({ error: "Missing required fields" });

  // Build summary for Grace to read
  const bookSummary = chapters?.map(ch => {
    const narrative = chapterNarratives?.[ch.id || ch.title];
    return narrative ? `${ch.title}: ${narrative.substring(0, 300)}...` : null;
  }).filter(Boolean).join("\n\n") || "";

  // Have Grace write a personal letter
  let graceLetter = "";
  try {
    const graceRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        system: `You are Grace, a warm memoir guide. Write a short personal letter (3-4 sentences) introducing this person's legacy book to their family. Address it "Dear Family," and sign it "With love, Grace at MyStory.Family". Reference 1-2 specific details from the book to make it feel personal and warm.`,
        messages: [{ role: "user", content: `The person's name is ${userName}. Here is a summary of their book:\n\n${bookSummary}` }],
      }),
    });
    const graceData = await graceRes.json();
    graceLetter = graceData.content?.[0]?.text || "";
  } catch {}

  const bookLink = shareUrl || "https://mystory.family";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fdf6ec;font-family:'Georgia',serif;">
<div style="max-width:600px;margin:0 auto;padding:48px 24px;">

  <div style="text-align:center;margin-bottom:40px;">
    <div style="font-size:48px;margin-bottom:16px;">🕊️</div>
    <h1 style="font-size:36px;font-weight:300;color:#3d2b1a;font-style:italic;margin:0 0 8px;">${userName}'s Legacy Story</h1>
    <p style="font-size:12px;color:#b8860b;font-family:Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;margin:0;">A gift for your family</p>
  </div>

  ${graceLetter ? `
  <div style="background:white;border-radius:16px;padding:32px;border:1px solid rgba(180,140,80,0.2);margin-bottom:32px;border-left:4px solid #b8860b;">
    <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b8860b;font-family:Arial,sans-serif;margin:0 0 14px;">A note from Grace</p>
    <div style="font-size:17px;color:#5c4a35;line-height:1.9;font-style:italic;">${graceLetter.replace(/\n/g, '<br>')}</div>
  </div>` : ""}

  <div style="background:white;border-radius:16px;padding:32px;border:1px solid rgba(180,140,80,0.15);text-align:center;margin-bottom:28px;">
    <p style="font-size:17px;color:#5c4a35;line-height:1.85;margin:0 0 24px;">
      ${userName} has preserved their life story — their memories, faith, and wisdom — as a legacy book for your family. Click below to read it.
    </p>
    <a href="${bookLink}" style="display:inline-block;background:linear-gradient(135deg,#5c3d1e,#8b5e34);color:#fdf6ec;text-decoration:none;padding:18px 44px;border-radius:100px;font-size:18px;font-family:'Georgia',serif;letter-spacing:0.5px;">
      ✦ Read ${userName}'s Story
    </a>
    <p style="font-size:12px;color:#a89070;font-family:Arial,sans-serif;margin:16px 0 0;">
      Or copy this link: <a href="${bookLink}" style="color:#b8860b;">${bookLink}</a>
    </p>
  </div>

  <p style="font-size:13px;color:#a89070;text-align:center;font-family:Arial,sans-serif;line-height:1.7;">
    This story was preserved using MyStory.Family.<br>
    <a href="https://mystory.family" style="color:#b8860b;">Start your own legacy story →</a>
  </p>

</div>
</body>
</html>`;

  const toAddresses = [userEmail];
  if (recipientEmail && recipientEmail !== userEmail) toAddresses.push(recipientEmail);

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Grace at MyStory.Family <grace@mystory.family>",
        to: toAddresses,
        subject: `${userName}'s Legacy Story — A Gift for Your Family`,
        html,
      }),
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Book email error:", e);
    return res.status(500).json({ error: "Could not send email" });
  }
}
