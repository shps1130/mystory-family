const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
  let code = "";
  for (let i = 0; i < 12; i++) {
    if (i === 4 || i === 8) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code; // format: XXXX-XXXX-XXXX
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { buyerName, buyerEmail, recipientName } = req.body;
  if (!buyerName || !buyerEmail) return res.status(400).json({ error: "Missing fields" });

  const code = generateCode();
  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  // Save code to Supabase
  const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/gift_codes`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      code,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      recipient_name: recipientName || null,
      redeemed: false,
    }),
  });

  if (!dbRes.ok) {
    const err = await dbRes.text();
    console.error("Supabase gift insert error:", err);
    return res.status(500).json({ error: "Could not create gift code" });
  }

  // Email the buyer
  const recipientDisplay = recipientName ? recipientName : "your loved one";
  const buyerHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#fdf6ec;font-family:'Georgia',serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">

    <div style="text-align:center;margin-bottom:40px;">
      <img src="https://mystory.family/logo.png" alt="MyStory.Family" style="width:72px;height:72px;object-fit:contain;display:block;margin:0 auto 16px;" />
      <h1 style="font-size:30px;font-weight:300;color:#3d2b1a;font-style:italic;margin:0 0 8px;">
        Your gift is ready, ${buyerName}.
      </h1>
      <p style="font-size:14px;color:#8b7355;letter-spacing:2px;text-transform:uppercase;margin:0;font-family:'Arial',sans-serif;">
        A Legacy Book for ${recipientDisplay}
      </p>
    </div>

    <div style="background:white;border-radius:16px;padding:36px;border:1px solid rgba(180,140,80,0.15);margin-bottom:28px;">
      <p style="font-size:16px;color:#6b5540;line-height:1.85;margin:0 0 24px;">
        What a beautiful gift — the gift of story. ${recipientDisplay} will have a personal guide walking alongside them to capture their memories, faith, and wisdom in a beautifully formatted legacy book.
      </p>

      <p style="font-size:14px;color:#8b7355;font-family:'Arial',sans-serif;margin:0 0 12px;letter-spacing:1px;text-transform:uppercase;">Their gift code:</p>

      <div style="background:#fdf6ec;border:2px solid #b8860b;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <div style="font-size:28px;font-weight:700;color:#3d2b1a;letter-spacing:4px;font-family:'Arial',sans-serif;">
          ${code}
        </div>
      </div>

      <p style="font-size:15px;color:#6b5540;line-height:1.85;margin:0 0 20px;">
        <strong>How to share it:</strong><br>
        Tell ${recipientDisplay} to visit <a href="https://mystory.family" style="color:#b8860b;">mystory.family</a>, click <em>"I have a gift code"</em> on the home screen, and enter the code above. Their story will be unlocked immediately — no payment needed.
      </p>

      <div style="text-align:center;">
        <a href="https://mystory.family" style="display:inline-block;background:linear-gradient(135deg,#5c3d1e,#8b5e34);color:#fdf6ec;text-decoration:none;padding:14px 36px;border-radius:100px;font-size:16px;font-family:'Georgia',serif;letter-spacing:0.5px;">
          Visit MyStory.Family ✦
        </a>
      </div>
    </div>

    <p style="font-size:13px;color:#a89070;text-align:center;line-height:1.7;font-family:'Arial',sans-serif;">
      Questions? Reply to this email — we're here to help.<br>
      <a href="https://mystory.family" style="color:#a89070;">mystory.family</a>
    </p>

  </div>
</body>
</html>`;

  try {
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Grace at MyStory.Family <grace@mystory.family>",
        to: [buyerEmail],
        subject: `Your gift code for ${recipientDisplay} 🕊️`,
        html: buyerHtml,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json();
      console.error("Resend error:", err);
    }
  } catch (e) {
    console.error("Email send error:", e);
  }

  return res.status(200).json({ ok: true, code });
}
