const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { code, email, firstName } = req.body;
  if (!code || !email) return res.status(400).json({ error: "Missing fields" });

  const normalizedCode = code.trim().toUpperCase();
  const normalizedEmail = email.toLowerCase();

  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  // Look up the code
  const lookupRes = await fetch(
    `${SUPABASE_URL}/rest/v1/gift_codes?code=eq.${encodeURIComponent(normalizedCode)}&select=*`,
    { headers }
  );
  const codes = await lookupRes.json();

  if (!codes || codes.length === 0) {
    return res.status(404).json({ error: "That gift code wasn't found. Please check and try again." });
  }

  const gift = codes[0];

  if (gift.redeemed) {
    return res.status(400).json({ error: "This gift code has already been redeemed." });
  }

  // Mark code as redeemed
  await fetch(
    `${SUPABASE_URL}/rest/v1/gift_codes?code=eq.${encodeURIComponent(normalizedCode)}`,
    {
      method: "PATCH",
      headers: { ...headers, "Prefer": "return=minimal" },
      body: JSON.stringify({ redeemed: true, redeemed_by: normalizedEmail, redeemed_at: new Date().toISOString() }),
    }
  );

  // Mark user as paid in mystory_users
  await fetch(
    `${SUPABASE_URL}/rest/v1/mystory_users?email=eq.${encodeURIComponent(normalizedEmail)}`,
    {
      method: "PATCH",
      headers: { ...headers, "Prefer": "return=minimal" },
      body: JSON.stringify({ has_paid: true }),
    }
  );

  // Send welcome email to recipient
  if (firstName) {
    const recipientHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#fdf6ec;font-family:'Georgia',serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">

    <div style="text-align:center;margin-bottom:40px;">
      <div style="font-size:40px;margin-bottom:16px;">🕊️</div>
      <h1 style="font-size:32px;font-weight:300;color:#3d2b1a;font-style:italic;margin:0 0 8px;">
        Welcome, ${firstName}.
      </h1>
      <p style="font-size:14px;color:#8b7355;letter-spacing:2px;text-transform:uppercase;margin:0;font-family:'Arial',sans-serif;">
        Someone loves you enough to give you this
      </p>
    </div>

    <div style="background:white;border-radius:16px;padding:36px;border:1px solid rgba(180,140,80,0.15);margin-bottom:28px;">
      <p style="font-size:18px;color:#5c4a35;line-height:1.9;font-style:italic;margin:0 0 20px;">
        I've been looking forward to meeting you.
      </p>
      <p style="font-size:16px;color:#6b5540;line-height:1.85;margin:0 0 20px;">
        I'm Grace, and someone who loves you has given you the gift of story. Your full legacy book is unlocked and ready — I'll walk alongside you, one memory at a time, until your story is preserved forever for the people you love most.
      </p>
      <div style="text-align:center;">
        <a href="https://mystory.family" style="display:inline-block;background:linear-gradient(135deg,#5c3d1e,#8b5e34);color:#fdf6ec;text-decoration:none;padding:16px 40px;border-radius:100px;font-size:17px;font-family:'Georgia',serif;letter-spacing:0.5px;">
          Begin My Story ✦
        </a>
      </div>
    </div>

    <p style="font-size:13px;color:#a89070;text-align:center;line-height:1.7;font-family:'Arial',sans-serif;">
      <a href="https://mystory.family" style="color:#a89070;">mystory.family</a>
    </p>

  </div>
</body>
</html>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Grace at MyStory.Family <grace@mystory.family>",
        to: [normalizedEmail],
        subject: `Someone gave you a beautiful gift, ${firstName} 🕊️`,
        html: recipientHtml,
      }),
    });
  }

  // Notify buyer that code was redeemed
  if (gift.buyer_email) {
    const buyerNotifyHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fdf6ec;font-family:'Georgia',serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:36px;margin-bottom:12px;">🕊️</div>
      <h1 style="font-size:26px;font-weight:300;color:#3d2b1a;font-style:italic;margin:0;">
        Your gift has been received.
      </h1>
    </div>
    <div style="background:white;border-radius:16px;padding:32px;border:1px solid rgba(180,140,80,0.15);">
      <p style="font-size:16px;color:#6b5540;line-height:1.85;margin:0;">
        ${firstName || "Your loved one"} just redeemed your MyStory.Family gift and has begun writing their legacy book. What a meaningful gift you gave. 🕊️
      </p>
    </div>
  </div>
</body>
</html>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Grace at MyStory.Family <grace@mystory.family>",
        to: [gift.buyer_email],
        subject: "Your gift has been received 🕊️",
        html: buyerNotifyHtml,
      }),
    });
  }

  return res.status(200).json({ ok: true });
}
