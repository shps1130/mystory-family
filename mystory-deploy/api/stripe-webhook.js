const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const APP_URL = process.env.APP_URL || "https://mystory.family";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 12; i++) {
    if (i === 4 || i === 8) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code; // format: XXXX-XXXX-XXXX
}

function buildGiftEmail({ buyerName, recipientName, code, hardcover }) {
  const redeemUrl = `${APP_URL}/?redeem=${code}`;

  return `
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
        A Legacy Story for ${recipientName}
      </p>
    </div>

    <div style="background:white;border-radius:16px;padding:36px;border:1px solid rgba(180,140,80,0.15);margin-bottom:28px;">
      <p style="font-size:16px;color:#6b5540;line-height:1.85;margin:0 0 24px;">
        What a beautiful gift. ${recipientName} will have a personal guide walking alongside her — capturing her memories, her faith, and her wisdom in a story your whole family will treasure.
      </p>

      <p style="font-size:14px;color:#8b7355;font-family:'Arial',sans-serif;margin:0 0 8px;letter-spacing:1px;text-transform:uppercase;">
        How to give it:
      </p>
      <p style="font-size:15px;color:#6b5540;line-height:1.85;margin:0 0 24px;">
        Forward this email to ${recipientName} or share the button below. When she clicks it, she'll be welcomed straight into her story — no codes to type, no tech headaches.
      </p>

      <div style="text-align:center;margin-bottom:28px;">
        <a href="${redeemUrl}" style="display:inline-block;background:#8b5e34;color:#fdf6ec;text-decoration:none;padding:16px 40px;border-radius:100px;font-size:17px;font-family:'Georgia',serif;letter-spacing:0.5px;">
          Start ${recipientName}'s Story ✦
        </a>
      </div>

      ${hardcover ? `
      <div style="background:#fdf6ec;border-radius:12px;padding:18px 20px;border:1px solid rgba(180,140,80,0.2);margin-bottom:24px;">
        <p style="font-size:13px;color:#8b7355;font-family:'Arial',sans-serif;margin:0 0 6px;letter-spacing:1px;text-transform:uppercase;">Hardcover Book Included</p>
        <p style="font-size:14px;color:#6b5540;line-height:1.7;margin:0;">
          When ${recipientName} finishes her story, we'll print and ship a beautiful hardcover edition to you. We'll be in touch with details when she's ready.
        </p>
      </div>` : ""}

      <p style="font-size:13px;color:#a89070;line-height:1.7;font-family:'Arial',sans-serif;margin:0;">
        If the button doesn't work, copy this link into her browser:<br>
        <span style="color:#8b5e34;">${redeemUrl}</span>
      </p>
    </div>

    <p style="font-size:13px;color:#a89070;text-align:center;line-height:1.7;font-family:'Arial',sans-serif;">
      Questions? Reply to this email — we're here to help.<br>
      <a href="https://mystory.family" style="color:#a89070;">mystory.family</a>
    </p>

  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const sig = req.headers["stripe-signature"];
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = await verifyStripeWebhook(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object;
  const { buyerName, buyerEmail, recipientName, hardcover } = session.metadata;

  const code = generateCode();

  const supabaseHeaders = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  // Save gift code to Supabase
  const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/gift_codes`, {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify({
      code,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      recipient_name: recipientName || null,
      hardcover: hardcover === "true",
      stripe_session_id: session.id,
      redeemed: false,
    }),
  });

  if (!dbRes.ok) {
    const err = await dbRes.text();
    console.error("Supabase insert error:", err);
    return res.status(500).json({ error: "Could not save gift code" });
  }

  // Send gift email to buyer
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
        subject: `${recipientName}'s story is waiting — your Mother's Day gift is ready 🌸`,
        html: buildGiftEmail({
          buyerName,
          recipientName,
          code,
          hardcover: hardcover === "true",
        }),
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json();
      console.error("Resend error:", err);
    }
  } catch (e) {
    console.error("Email error:", e);
  }

  console.log(`Gift code ${code} created for ${recipientName}, sent to ${buyerEmail}`);
  return res.status(200).json({ received: true });
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function verifyStripeWebhook(rawBody, sig, secret) {
  const crypto = await import("crypto");
  const parts = sig.split(",").reduce((acc, part) => {
    const [key, val] = part.split("=");
    acc[key] = val;
    return acc;
  }, {});

  const timestamp = parts["t"];
  const signature = parts["v1"];
  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSig = crypto
    .default.createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  if (expectedSig !== signature) throw new Error("Signature mismatch");

  const tolerance = 300;
  if (Math.floor(Date.now() / 1000) - parseInt(timestamp) > tolerance) {
    throw new Error("Webhook timestamp too old");
  }

  return JSON.parse(rawBody);
}

export const config = {
  api: { bodyParser: false },
};
