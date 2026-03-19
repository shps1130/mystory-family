const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Store codes in Supabase temporarily
async function saveCode(email, code) {
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min
  await fetch(`${SUPABASE_URL}/rest/v1/mystory_users?email=eq.${encodeURIComponent(email.toLowerCase())}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ reset_code: code, reset_code_expires: expires }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  // Check user exists
  const r = await fetch(`${SUPABASE_URL}/rest/v1/mystory_users?email=eq.${encodeURIComponent(email.toLowerCase())}&select=email`, {
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  const users = await r.json();
  if (!users?.length) return res.status(404).json({ error: "No account found with that email address." });

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await saveCode(email, code);

  // Send email
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Grace at MyStory.Family <grace@mystory.family>",
      to: [email.toLowerCase()],
      subject: "Your MyStory.Family verification code",
      html: `
        <div style="max-width:480px;margin:0 auto;padding:40px 24px;background:#fdf6ec;font-family:'Georgia',serif;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="font-size:40px;margin-bottom:12px;">🕊️</div>
            <h1 style="font-size:24px;font-weight:300;color:#3d2b1a;margin:0;">MyStory.Family</h1>
          </div>
          <div style="background:white;border-radius:12px;padding:32px;border:1px solid rgba(180,140,80,0.2);text-align:center;">
            <p style="font-size:16px;color:#5c4a35;margin:0 0 24px;">Your password reset code is:</p>
            <div style="font-size:48px;font-weight:600;color:#3d2b1a;letter-spacing:8px;margin:0 0 24px;">${code}</div>
            <p style="font-size:13px;color:#a89070;margin:0;">This code expires in 15 minutes.</p>
          </div>
          <p style="font-size:12px;color:#a89070;text-align:center;margin-top:20px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  return res.status(200).json({ ok: true });
}
