const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const APP_URL = process.env.APP_URL || "https://mystory.family";

const supabaseHeaders = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_SERVICE_KEY,
  "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
};

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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET not configured — refusing webhook");
    return res.status(500).json({ error: "Not configured" });
  }

  const sig = req.headers["stripe-signature"];
  if (!sig) return res.status(400).json({ error: "Missing signature" });

  const rawBody = await getRawBody(req);

  let event;
  try {
    event = await verifyStripeWebhook(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).json({ error: "Webhook signature verification failed" });
  }

  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object;

  // Only act on sessions that are actually paid. `checkout.session.completed`
  // can fire for async payment methods before funds settle.
  if (session.payment_status !== "paid") {
    console.log(`Session ${session.id} completed but payment_status=${session.payment_status}; ignoring`);
    return res.status(200).json({ received: true });
  }

  // --- Idempotency ------------------------------------------------------
  // Stripe retries webhooks. Without this, a retry mints a second gift code
  // and sends a duplicate email. Insert-first: the unique constraint on
  // event_id makes the DB the arbiter, so concurrent retries can't both win.
  const claimed = await claimEvent(event.id);
  if (!claimed) {
    console.log(`Event ${event.id} already processed; skipping`);
    return res.status(200).json({ received: true, duplicate: true });
  }

  const metadata = session.metadata || {};

  // Three products now. metadata.product is set explicitly by
  // create-interview-checkout.js; gifts are identified by recipientName,
  // which the older gift checkout sets. Anything else is a memoir purchase.
  let product;
  if (metadata.product === "interview") product = "interview";
  else if (metadata.recipientName) product = "gift";
  else product = "memoir";

  try {
    if (product === "gift") {
      await handleGiftPurchase(session, metadata);
    } else if (product === "interview") {
      await handleInterviewPurchase(session);
    } else {
      await handleDirectPurchase(session);
    }
  } catch (err) {
    // Release the claim so Stripe's retry can have another go.
    await releaseEvent(event.id);
    console.error("Webhook processing error:", err);
    return res.status(500).json({ error: "Processing failed" });
  }

  return res.status(200).json({ received: true });
}

// --- Shared helpers ------------------------------------------------------

function emailFromSession(session) {
  return (
    session.client_reference_id ||
    session.customer_details?.email ||
    session.customer_email ||
    ""
  ).toLowerCase().trim();
}

async function grantEntitlement({ email, product, sessionId }) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/entitlements`, {
    method: "POST",
    headers: { ...supabaseHeaders, "Prefer": "return=minimal" },
    body: JSON.stringify({
      email,
      product,
      stripe_session_id: sessionId,
    }),
  });

  // 409 means this session already granted — the unique constraint on
  // stripe_session_id doing its job. Not an error.
  if (!r.ok && r.status !== 409) {
    const detail = await r.text();
    console.error(`Failed to grant ${product} entitlement:`, r.status, detail);
    throw new Error("Could not grant entitlement");
  }
}

// --- Interview purchase: bought before the buyer has an account ----------
// No user_id exists yet. The entitlement is keyed to the email Stripe
// collected, and claim_entitlements() binds it on first sign-in.

async function handleInterviewPurchase(session) {
  const email = emailFromSession(session);
  if (!email) {
    console.error(`No email on interview session ${session.id}`);
    throw new Error("No email on checkout session");
  }

  await grantEntitlement({
    email,
    product: "interview",
    sessionId: session.id,
  });

  // The buyer is sitting on the success page with no account. Tell them
  // exactly which address to sign in with — if they use a different one,
  // the claim silently finds nothing and they'll hit the paywall again.
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Grace at MyStory.Family <grace@mystory.family>",
        to: [email],
        subject: "Your interview plan is ready — here's how to start",
        html: buildInterviewWelcomeEmail(email),
      }),
    });
  } catch (e) {
    console.error("Interview welcome email failed:", e);
  }

  console.log(`Granted interview access to ${email} (session ${session.id})`);
}

function buildInterviewWelcomeEmail(email) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8F5F0;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
    <div style="text-align:center;margin-bottom:36px;">
      <img src="https://mystory.family/logo.png" alt="MyStory.Family" style="width:72px;height:72px;object-fit:contain;display:block;margin:0 auto 16px;" />
      <h1 style="font-size:30px;font-weight:300;color:#1A2330;font-style:italic;margin:0;">
        You're all set.
      </h1>
    </div>

    <div style="background:#fff;border-radius:16px;padding:36px;border:1px solid #E8E0D0;margin-bottom:24px;">
      <p style="font-size:16px;color:#5C6470;line-height:1.85;margin:0 0 20px;">
        I'm Grace. Over the next fifteen minutes or so, we'll build a real plan
        for capturing your loved one's stories — who they are, what matters most
        to you, and how this is actually going to happen in your life.
      </p>
      <p style="font-size:16px;color:#5C6470;line-height:1.85;margin:0 0 24px;">
        To begin, sign in with <strong>${email}</strong>. That's the address
        your purchase is attached to, so please use that one. We'll email you a
        link — no password to remember.
      </p>
      <div style="text-align:center;">
        <a href="${APP_URL}/interview" style="display:inline-block;background:#B08856;color:#FFFBF5;text-decoration:none;padding:16px 40px;border-radius:100px;font-size:17px;letter-spacing:0.5px;">
          Begin ✦
        </a>
      </div>
    </div>

    <p style="font-size:13px;color:#8B8478;text-align:center;line-height:1.7;font-family:Arial,sans-serif;">
      Questions? Just reply to this email.<br>
      <a href="https://mystory.family" style="color:#8B8478;">mystory.family</a>
    </p>
  </div>
</body>
</html>`;
}

// --- Direct purchase: the user bought their own book --------------------
// This is the path that was missing entirely. has_paid used to be set by
// the browser POSTing /api/paid-status after redirect, which meant anyone
// could grant themselves access. It is now granted here and nowhere else.

async function handleDirectPurchase(session) {
  // Prefer client_reference_id (set it on the payment link — see notes),
  // fall back to the email Stripe collected at checkout.
  const email = emailFromSession(session);

  if (!email) {
    console.error(`No email on session ${session.id}; cannot grant access`);
    throw new Error("No email on checkout session");
  }

  // Write to both stores during the transition: `entitlements` is the new
  // source of truth, `mystory_users.has_paid` is what App.jsx still reads.
  // Drop the has_paid write once App.jsx moves onto Supabase Auth.
  await grantEntitlement({ email, product: "memoir", sessionId: session.id });

  // Upsert: the user may have paid before creating an account.
  const r = await fetch(`${SUPABASE_URL}/rest/v1/mystory_users`, {
    method: "POST",
    headers: { ...supabaseHeaders, "Prefer": "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      email,
      has_paid: true,
      paid_at: new Date().toISOString(),
      stripe_session_id: session.id,
    }),
  });

  if (!r.ok) {
    const detail = await r.text();
    console.error("Failed to mark user paid:", r.status, detail);
    throw new Error("Could not grant access");
  }

  console.log(`Granted paid access to ${email} (session ${session.id})`);
}

// --- Gift purchase (unchanged behaviour, moved into its own function) ---

async function handleGiftPurchase(session, metadata) {
  const { buyerName, buyerEmail, recipientName, hardcover } = metadata;
  const code = generateCode();

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
    throw new Error("Could not save gift code");
  }

  // Email failure is logged but does not fail the webhook — the code exists
  // in the DB and can be resent manually. Retrying the whole webhook would
  // mint a second code.
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
        subject: `${recipientName}'s story is waiting — your gift is ready 🌸`,
        html: buildGiftEmail({
          buyerName,
          recipientName,
          code,
          hardcover: hardcover === "true",
        }),
      }),
    });

    if (!emailRes.ok) {
      console.error("Resend error:", await emailRes.text());
    }
  } catch (e) {
    console.error("Email error:", e);
  }

  console.log(`Gift code ${code} created for ${recipientName}, sent to ${buyerEmail}`);
}

// --- Idempotency helpers ------------------------------------------------

async function claimEvent(eventId) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/stripe_events`, {
    method: "POST",
    headers: { ...supabaseHeaders, "Prefer": "return=minimal" },
    body: JSON.stringify({ event_id: eventId }),
  });
  if (r.ok) return true;
  if (r.status === 409) return false; // unique violation — already handled
  console.error("Idempotency claim failed:", r.status, await r.text());
  return true; // fail open: better a rare duplicate than a dropped payment
}

async function releaseEvent(eventId) {
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/stripe_events?event_id=eq.${encodeURIComponent(eventId)}`,
      { method: "DELETE", headers: supabaseHeaders }
    );
  } catch (e) {
    console.error("Could not release event claim:", e);
  }
}

// --- Raw body + signature verification ----------------------------------

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  // Buffer, not string: concatenating chunks as strings can split a
  // multi-byte UTF-8 character across a chunk boundary and corrupt the
  // bytes the HMAC is computed over.
  return Buffer.concat(chunks);
}

async function verifyStripeWebhook(rawBody, sig, secret) {
  const crypto = (await import("crypto")).default;

  const parts = {};
  const v1Signatures = [];
  for (const part of sig.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key === "v1") v1Signatures.push(val);
    else parts[key] = val;
  }

  const timestamp = parts["t"];
  if (!timestamp || v1Signatures.length === 0) {
    throw new Error("Malformed signature header");
  }

  // Check the timestamp before the HMAC so a replayed body is rejected
  // even if its signature is still valid.
  const tolerance = 300; // seconds
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (!Number.isFinite(age) || Math.abs(age) > tolerance) {
    throw new Error("Webhook timestamp outside tolerance");
  }

  const signedPayload = Buffer.concat([
    Buffer.from(`${timestamp}.`, "utf8"),
    rawBody,
  ]);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest();

  // Stripe may send several v1 signatures during secret rotation; any match
  // is valid. timingSafeEqual avoids leaking the signature byte-by-byte
  // through comparison timing.
  const matched = v1Signatures.some((candidate) => {
    let buf;
    try { buf = Buffer.from(candidate, "hex"); } catch { return false; }
    return buf.length === expected.length && crypto.timingSafeEqual(buf, expected);
  });

  if (!matched) throw new Error("Signature mismatch");

  return JSON.parse(rawBody.toString("utf8"));
}

export const config = {
  api: { bodyParser: false },
};
