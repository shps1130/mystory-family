
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

  const { buyerName, buyerEmail, recipientName, recipientEmail } = req.body;
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
      recipient_email: recipientEmail || null,
      redeemed: false,
    }),
  });

  if (!dbRes.ok) {
    const err = await dbRes.text();
    console.error("Supabase gift insert error:", err);
    return res.status(500).json({ error: "Could not create gift code" });
  }

  const recipientDisplay = recipientName ? recipientName : "your loved one";

  // ── EMAIL TO BUYER ────────────────────────────────────────────────────────
  const buyerHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#fdf6ec;font-family:'Georgia',serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
    <div style="text-align:center;margin-bottom:40px;">
      <div style="font-size:40px;margin-bottom:16px;">🕊️</div>
      <h1 style="font-size:30px;font-weight:300;color:#3d2b1a;font-style:italic;margin:0 0 8px;">Your gift is ready, ${buyerName}.</h1>
      <p style="font-size:14px;color:#8b7355;letter-spacing:2px;text-transform:uppercase;margin:0;font-family:'Arial',sans-serif;">A Legacy Book for ${recipientDisplay}</p>
    </div>
    <div style="background:white;border-radius:16px;padding:36px;border:1px solid rgba(180,140,80,0.15);margin-bottom:28px;">
      <p style="font-size:16px;color:#6b5540;line-height:1.85;margin:0 0 24px;">
        What a beautiful gift — the gift of story. ${recipientDisplay} will have a personal guide walking alongside them to capture their memories, faith, and wisdom in a beautifully formatted legacy book.
      </p>
      ${recipientEmail ? `<p style="font-size:15px;color:#6b5540;line-height:1.8;margin:0 0 20px;background:rgba(184,134,11,0.06);border-radius:8px;padding:12px 16px;">
        ✦ We've also sent a gift notification directly to <strong>${recipientEmail}</strong> so they know a gift is waiting for them.
      </p>` : ""}
      <p style="font-size:14px;color:#8b7355;font-family:'Arial',sans-serif;margin:0 0 12px;letter-spacing:1px;text-transform:uppercase;">Their gift code:</p>
      <div style="background:#fdf6ec;border:2px solid #b8860b;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <div style="font-size:28px;font-weight:700;color:#3d2b1a;letter-spacing:4px;font-family:'Arial',sans-serif;">${code}</div>
      </div>
      <p style="font-size:15px;color:#6b5540;line-height:1.85;margin:0 0 20px;">
        <strong>How to share it:</strong><br>
        Tell ${recipientDisplay} to visit <a href="https://mystory.family" style="color:#b8860b;">mystory.family</a>, click <em>"Already have a gift code?"</em> on the home screen, and enter the code above. Their story will be unlocked immediately — no payment needed.
      </p>
      <div style="text-align:center;">
        <a href="https://mystory.family" style="display:inline-block;background:linear-gradient(135deg,#5c3d1e,#8b5e34);color:#fdf6ec;text-decoration:none;padding:14px 36px;border-radius:100px;font-size:16px;font-family:'Georgia',serif;letter-spacing:0.5px;">Visit MyStory.Family ✦</a>
      </div>
    </div>
    <p style="font-size:13px;color:#a89070;text-align:center;line-height:1.7;font-family:'Arial',sans-serif;">
      Questions? Reply to this email — we're here to help.<br>
      <a href="https://mystory.family" style="color:#a89070;">mystory.family</a>
    </p>
  </div>
</body>
</html>`;

  // ── EMAIL TO RECIPIENT (if email provided) ────────────────────────────────
  const recipientHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#fdf6ec;font-family:'Georgia',serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
    <div style="text-align:center;margin-bottom:40px;">
      <div style="font-size:48px;margin-bottom:16px;">🎁</div>
      <h1 style="font-size:30px;font-weight:300;color:#3d2b1a;font-style:italic;margin:0 0 8px;">
        ${recipientName ? recipientName + ", you've received a gift." : "You've received a gift."}
      </h1>
      <p style="font-size:14px;color:#8b7355;letter-spacing:2px;text-transform:uppercase;margin:0;font-family:'Arial',sans-serif;">From ${buyerName} with love</p>
    </div>
    <div style="background:white;border-radius:16px;padding:36px;border:1px solid rgba(180,140,80,0.15);margin-bottom:28px;">
      <p style="font-size:17px;color:#5c4a35;line-height:1.9;margin:0 0 24px;font-style:italic;">
        "${buyerName} has given you something truly special — the chance to preserve your life story in a beautifully formatted book your family will treasure for generations."
      </p>
      <p style="font-size:15px;color:#6b5540;line-height:1.8;margin:0 0 24px;">
        Your personal guide, Grace, will walk alongside you through your memories, your faith, and the stories only you can tell. There's no rush — start whenever you're ready.
      </p>
      <p style="font-size:14px;color:#8b7355;font-family:'Arial',sans-serif;margin:0 0 12px;letter-spacing:1px;text-transform:uppercase;">Your gift code:</p>
      <div style="background:#fdf6ec;border:2px solid #b8860b;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <div style="font-size:28px;font-weight:700;color:#3d2b1a;letter-spacing:4px;font-family:'Arial',sans-serif;">${code}</div>
      </div>
      <p style="font-size:15px;color:#6b5540;line-height:1.85;margin:0 0 24px;">
        To get started, visit <a href="https://mystory.family" style="color:#b8860b;">mystory.family</a> and click <em>"Already have a gift code?"</em> on the home screen. Enter the code above and your story begins — completely free.
      </p>
      <div style="text-align:center;">
        <a href="https://mystory.family" style="display:inline-block;background:linear-gradient(135deg,#b8860b,#d4a843);color:#fdf6ec;text-decoration:none;padding:16px 40px;border-radius:100px;font-size:17px;font-family:'Georgia',serif;letter-spacing:0.5px;">Begin My Story ✦</a>
      </div>
    </div>
    <p style="font-size:13px;color:#a89070;text-align:center;line-height:1.7;font-family:'Arial',sans-serif;">
      Your code never expires — begin whenever you're ready.<br>
      Questions? Email us at <a href="mailto:timothy@mystory.family" style="color:#a89070;">timothy@mystory.family</a>
    </p>
  </div>
</body>
</html>`;

  try {
    // Always send to buyer
    const buyerEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "Grace at MyStory.Family <grace@mystory.family>",
        to: [buyerEmail],
        subject: `Your gift code for ${recipientDisplay} 🕊️`,
        html: buyerHtml,
      }),
    });
    if (!buyerEmailRes.ok) console.error("Buyer email error:", await buyerEmailRes.json());

    // Also send to recipient if email provided
    if (recipientEmail && recipientEmail.includes("@")) {
      const recipEmailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Grace at MyStory.Family <grace@mystory.family>",
          to: [recipientEmail],
          reply_to: buyerEmail,
          subject: `${buyerName} gave you a legacy book 🎁`,
          html: recipientHtml,
        }),
      });
      if (!recipEmailRes.ok) console.error("Recipient email error:", await recipEmailRes.json());
    }
  } catch (e) {
    console.error("Email send error:", e);
  }

  return res.status(200).json({ ok: true, code });
}
