const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = "https://mystory.family";

const unsubscribeFooter = (email) => `
  <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(180,140,80,0.15);text-align:center;">
    <p style="font-size:12px;color:#c4a882;font-family:'Arial',sans-serif;line-height:1.7;margin:0;">
      MyStory.Family · Preserve your story for the people who matter most<br>
      <a href="${APP_URL}" style="color:#c4a882;">mystory.family</a> &nbsp;·&nbsp;
      <a href="${APP_URL}/api/unsubscribe?email=${encodeURIComponent(email)}" style="color:#c4a882;">Click here to unsubscribe</a>
    </p>
  </div>`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { firstName, email } = req.body;
  if (!firstName || !email) return res.status(400).json({ error: "Missing fields" });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to MyStory.Family</title>
</head>
<body style="margin:0;padding:0;background:#fdf6ec;font-family:'Georgia',serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">

    <div style="text-align:center;margin-bottom:40px;">
      <div style="font-size:40px;margin-bottom:16px;">🕊️</div>
      <h1 style="font-size:32px;font-weight:300;color:#3d2b1a;font-style:italic;margin:0 0 8px;">
        Welcome, ${firstName}.
      </h1>
      <p style="font-size:14px;color:#8b7355;letter-spacing:2px;text-transform:uppercase;margin:0;font-family:'Arial',sans-serif;">
        Your story is waiting to be told
      </p>
    </div>

    <div style="background:white;border-radius:16px;padding:36px;border:1px solid rgba(180,140,80,0.15);margin-bottom:28px;">
      <p style="font-size:18px;color:#5c4a35;line-height:1.9;font-style:italic;margin:0 0 20px;">
        I've been looking forward to meeting you.
      </p>
      <p style="font-size:16px;color:#6b5540;line-height:1.85;margin:0 0 24px;font-family:'Arial',sans-serif;">
        I'm Grace, and I'm here to help you tell the story only you can tell — the one your family will carry long after this moment. Your first section is waiting for you, and there's no rush.
      </p>
      <div style="text-align:center;">
        <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#5c3d1e,#8b5e34);color:#fdf6ec;text-decoration:none;padding:16px 40px;border-radius:100px;font-size:17px;font-family:'Georgia',serif;letter-spacing:0.5px;">
          Continue My Story ✦
        </a>
      </div>
    </div>

    <p style="font-size:14px;color:#a89070;text-align:center;line-height:1.7;font-family:'Arial',sans-serif;">
      Questions? Reply to this email — we read every one.
    </p>

    ${unsubscribeFooter(email)}

  </div>
</body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Grace at MyStory.Family <grace@mystory.family>",
        to: [email],
        subject: `Welcome, ${firstName} — your story is waiting`,
        html,
      }),
    });
    const data = await response.json();
    if (!response.ok) { console.error("Resend error:", data); return res.status(500).json({ error: "Could not send email" }); }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Email error:", e);
    return res.status(500).json({ error: "Email failed" });
  }
}
