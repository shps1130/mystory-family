const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APP_URL = "https://mystory.family";

const unsubscribeFooter = (email) => `
  <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(180,140,80,0.15);text-align:center;">
    <p style="font-size:12px;color:#c4a882;font-family:'Arial',sans-serif;line-height:1.7;margin:0;">
      MyStory.Family · Preserve your story for the people who matter most<br>
      <a href="${APP_URL}" style="color:#c4a882;">mystory.family</a> &nbsp;·&nbsp;
      <a href="${APP_URL}/api/unsubscribe?email=${encodeURIComponent(email)}" style="color:#c4a882;">Click here to unsubscribe</a>
    </p>
  </div>`;

async function supabase(path, method) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  const text = await res.text();
  try { return { ok: res.ok, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, data: [] }; }
}

async function sendReminder(firstName, email, dayNumber) {
  const isDay3 = dayNumber === 3;
  const subject = isDay3 ? `${firstName}, Grace is waiting for you 🕊️` : `Your story deserves to be finished, ${firstName}`;
  const headline = isDay3 ? `Grace hasn't forgotten you.` : `Your story is still waiting.`;
  const body = isDay3
    ? `You started something meaningful a few days ago. Grace has kept everything you shared — your story is right where you left it, ready to continue whenever you are.`
    : `Life gets busy. We understand. But the stories you're carrying — the memories, the wisdom, the moments your family will treasure — those deserve to be preserved. It only takes a few minutes to pick up where you left off.`;
  const cta = isDay3 ? "Continue My Story →" : "Finish My Legacy Book ✦";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#fdf6ec;font-family:'Georgia',serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">

    <div style="text-align:center;margin-bottom:40px;">
      <img src="https://mystory.family/logo.png" alt="MyStory.Family" style="width:72px;height:72px;object-fit:contain;display:block;margin:0 auto 16px;" />
      <h1 style="font-size:30px;font-weight:300;color:#3d2b1a;font-style:italic;margin:0;">${headline}</h1>
    </div>

    <div style="background:white;border-radius:16px;padding:36px;border:1px solid rgba(180,140,80,0.15);margin-bottom:28px;">
      <p style="font-size:17px;color:#5c4a35;line-height:1.9;font-style:italic;margin:0 0 20px;">Dear ${firstName},</p>
      <p style="font-size:16px;color:#6b5540;line-height:1.85;margin:0 0 28px;font-family:'Arial',sans-serif;">${body}</p>
      ${!isDay3 ? `
      <div style="background:#fdf6ec;border-radius:10px;padding:18px;margin-bottom:24px;border-left:3px solid #b8860b;">
        <p style="font-size:15px;color:#6b5540;line-height:1.8;margin:0;font-style:italic;">
          "The stories you don't tell are the ones your family will never know. The ones you do tell become their greatest treasure."
        </p>
      </div>` : ""}
      <div style="text-align:center;">
        <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#5c3d1e,#8b5e34);color:#fdf6ec;text-decoration:none;padding:16px 40px;border-radius:100px;font-size:17px;font-family:'Georgia',serif;letter-spacing:0.5px;">
          ${cta}
        </a>
      </div>
    </div>

    <p style="font-size:14px;color:#a89070;text-align:center;line-height:1.7;font-family:'Arial',sans-serif;">
      Your story is saved and waiting — sign in to pick up right where you left off.
    </p>

    ${unsubscribeFooter(email)}

  </div>
</body>
</html>`;

  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "Grace at MyStory.Family <grace@mystory.family>",
      to: [email],
      subject,
      html,
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const now = new Date();
  const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Only send to users who have NOT unsubscribed
  const day3Users = await supabase(
    `mystory_users?created_at=gte.${threeDaysAgo}T00:00:00&created_at=lt.${threeDaysAgo}T23:59:59&unsubscribed=neq.true&select=first_name,email`,
    "GET"
  );
  const day7Users = await supabase(
    `mystory_users?created_at=gte.${sevenDaysAgo}T00:00:00&created_at=lt.${sevenDaysAgo}T23:59:59&unsubscribed=neq.true&select=first_name,email`,
    "GET"
  );

  const results = { day3: 0, day7: 0, errors: [] };

  for (const user of (day3Users.data || [])) {
    try { await sendReminder(user.first_name, user.email, 3); results.day3++; }
    catch (e) { results.errors.push(user.email); }
  }
  for (const user of (day7Users.data || [])) {
    try { await sendReminder(user.first_name, user.email, 7); results.day7++; }
    catch (e) { results.errors.push(user.email); }
  }

  return res.status(200).json({ ok: true, ...results });
}
