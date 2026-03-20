const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  const email = req.query.email || req.body?.email;

  if (!email) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Unsubscribe — MyStory.Family</title></head>
      <body style="margin:0;padding:60px 24px;background:#fdf6ec;font-family:'Georgia',serif;text-align:center;">
        <div style="max-width:480px;margin:0 auto;">
          <div style="font-size:40px;margin-bottom:20px;">🕊️</div>
          <h1 style="font-size:28px;font-weight:300;color:#3d2b1a;font-style:italic;">Invalid unsubscribe link</h1>
          <p style="font-size:16px;color:#6b5540;font-family:'Arial',sans-serif;line-height:1.7;">
            This link doesn't look right. Please contact us at <a href="mailto:grace@mystory.family" style="color:#b8860b;">grace@mystory.family</a> and we'll remove you manually.
          </p>
        </div>
      </body>
      </html>
    `);
  }

  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Prefer": "return=minimal",
  };

  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/mystory_users?email=eq.${encodeURIComponent(email.toLowerCase())}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ unsubscribed: true }),
      }
    );
  } catch (e) {
    console.error("Unsubscribe error:", e);
  }

  // Always show success — don't reveal whether email exists
  return res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Unsubscribed — MyStory.Family</title>
    </head>
    <body style="margin:0;padding:60px 24px;background:#fdf6ec;font-family:'Georgia',serif;text-align:center;">
      <div style="max-width:480px;margin:0 auto;">
        <div style="font-size:48px;margin-bottom:24px;">🕊️</div>
        <h1 style="font-size:32px;font-weight:300;color:#3d2b1a;font-style:italic;margin-bottom:16px;">
          You've been unsubscribed.
        </h1>
        <p style="font-size:16px;color:#6b5540;font-family:'Arial',sans-serif;line-height:1.8;margin-bottom:24px;">
          We've removed <strong>${email}</strong> from our mailing list. You won't receive any more emails from us.
        </p>
        <p style="font-size:15px;color:#8b7355;font-family:'Arial',sans-serif;line-height:1.7;margin-bottom:32px;font-style:italic;">
          Your story and account are still saved — you can always return to mystory.family to continue writing.
        </p>
        <a href="https://mystory.family" style="display:inline-block;background:linear-gradient(135deg,#5c3d1e,#8b5e34);color:#fdf6ec;text-decoration:none;padding:14px 36px;border-radius:100px;font-size:17px;font-family:'Georgia',serif;letter-spacing:0.5px;">
          Return to MyStory.Family
        </a>
        <p style="font-size:13px;color:#c4a882;font-family:'Arial',sans-serif;margin-top:32px;">
          Changed your mind? Email us at <a href="mailto:grace@mystory.family" style="color:#b8860b;">grace@mystory.family</a>
        </p>
      </div>
    </body>
    </html>
  `);
}
