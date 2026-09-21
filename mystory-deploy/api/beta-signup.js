// api/beta-signup.js
// Captures beta tester signups from the unlisted recruitment page.
//
// Deliberately open — the whole point is that people who haven't signed in
// can reach it. Protection is input limits, a honeypot, and the fact that the
// worst case is junk rows in a table only the service key can read.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'timothy@mystory.family';
const FROM_EMAIL = process.env.FROM_EMAIL || 'MyStory.Family <grace@mystory.family>';

const MAX = { name: 120, email: 254, subject: 400, notes: 2000 };

function clean(value, limit) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, limit);
}

// Every email failure is logged with the response body, so a rejection from
// Resend — unverified domain, bad key, sandbox restrictions — shows up in
// Vercel's logs instead of vanishing.
async function sendEmail({ to, subject, text, html, label }) {
  if (!RESEND_API_KEY) {
    console.error(`[email:${label}] RESEND_API_KEY is not set — skipping send to ${to}`);
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, text, html }),
    });

    const bodyText = await res.text();

    if (!res.ok) {
      console.error(`[email:${label}] Resend returned ${res.status}: ${bodyText}`);
      return false;
    }

    console.log(`[email:${label}] sent to ${to}: ${bodyText}`);
    return true;
  } catch (err) {
    console.error(`[email:${label}] threw:`, err);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};

  // Honeypot. Hidden off-screen, so a human never fills it. Return 200 rather
  // than an error — telling a bot it failed just invites a retry without it.
  if (clean(body.company, 100)) {
    console.log('beta-signup: honeypot triggered');
    return res.status(200).json({ ok: true });
  }

  const name = clean(body.name, MAX.name);
  const email = clean(body.email, MAX.email).toLowerCase();

  if (!name || !email || !email.includes('@')) {
    return res.status(400).json({ error: 'Name and a valid email are required' });
  }

  const row = {
    name,
    email,
    subject_note: clean(body.subject, MAX.subject) || null,
    notes: clean(body.notes, MAX.notes) || null,
    status: 'new',
  };

  // Repeat signups are success, not failure.
  //
  // The previous version asked for merge-duplicates but never told PostgREST
  // which column to match on. Without on_conflict it only checks the primary
  // key, so a second signup with the same email hit the unique constraint on
  // email and came back 409 — and the form showed "That didn't go through" to
  // someone who was already signed up.
  //
  // ignore-duplicates (rather than merge) keeps the original row untouched.
  // Merging would reset status back to 'new' on someone you've already
  // invited, just because they filled the form in twice.
  let repeat = false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/beta_signups?on_conflict=email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'resolution=ignore-duplicates,return=representation',
      },
      body: JSON.stringify(row),
    });

    if (r.status === 409) {
      // Belt and braces: if the conflict still surfaces, treat it as a repeat.
      repeat = true;
      console.log(`beta-signup: ${email} already signed up (409)`);
    } else if (!r.ok) {
      console.error('beta-signup insert failed:', r.status, await r.text());
      return res.status(502).json({ error: 'Could not save signup' });
    } else {
      // With ignore-duplicates, a skipped row comes back as an empty array.
      const inserted = await r.json().catch(() => []);
      repeat = Array.isArray(inserted) && inserted.length === 0;
      if (repeat) console.log(`beta-signup: ${email} already signed up`);
    }
  } catch (err) {
    console.error('beta-signup error:', err);
    return res.status(502).json({ error: 'Could not save signup' });
  }

  // Both emails are best-effort. The signup is already saved, and making
  // someone re-submit a form that worked is worse than finding them in the
  // table later. Failures are logged, not surfaced.
  //
  // A repeat signup still gets the confirmation — they probably resubmitted
  // because they never saw the first one. Your notification is flagged so you
  // don't mistake it for a new person.
  const [confirmed, notified] = await Promise.all([
    sendEmail({
      label: 'confirmation',
      to: email,
      subject: 'Thank you — a few things before we start',
      text: confirmationText(name),
      html: confirmationHtml(name),
    }),
    sendEmail({
      label: 'notify',
      to: NOTIFY_EMAIL,
      subject: repeat ? `Beta signup (repeat): ${name}` : `Beta signup: ${name}`,
      text:
        (repeat ? `Already in the table — this is a second submission.\n\n` : '') +
        `${name}\n${email}\n\n` +
        `Interviewing: ${row.subject_note || '(not said)'}\n\n` +
        `Notes: ${row.notes || '(none)'}\n`,
    }),
  ]);

  console.log(`beta-signup: ${email} ${repeat ? 'repeat' : 'saved'}. confirmation=${confirmed} notify=${notified}`);

  return res.status(200).json({ ok: true });
}

// --- Confirmation email --------------------------------------------------
// Sent to the person who signed up. Without it they get a thank-you screen
// and then silence, which reads as broken and produces "did that work?"
// emails. It also repeats the time commitment while they're still deciding,
// and asks them to line up the person they'll interview — the step most
// likely to stall a beta tester.

function confirmationText(name) {
  return `${name},

Thank you for putting your hand up. I'll email you a code within a day or two
that unlocks everything. No payment, nothing to cancel.

While you wait, one thing would help enormously: ask the person you want to
interview whether they're up for it. Tell them it's five conversations, that
you'll be recording, and that they get to decide what ends up in the book. If
they'd rather not, that's a complete answer, and it's much better to know now
than halfway through.

A reminder of what you're signing up for: about twenty minutes of setup, then
five conversations of roughly an hour each, spread over a month or two. It's a
real amount of time. It's also the whole point.

If anything goes wrong, or you just have a question, reply to this. It comes
straight to me.

Timothy
MyStory.Family
`;
}

function confirmationHtml(name) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8F5F0;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:0 auto;padding:44px 24px;">

    <div style="text-align:center;margin-bottom:32px;">
      <img src="https://mystory.family/logo.png" alt="MyStory.Family" style="width:64px;height:64px;object-fit:contain;display:block;margin:0 auto 14px;" />
      <h1 style="font-size:27px;font-weight:300;color:#1A2330;font-style:italic;margin:0;">
        Thank you, ${esc(name)}.
      </h1>
    </div>

    <div style="background:#fff;border-radius:16px;padding:34px;border:1px solid #E8E0D0;margin-bottom:22px;">
      <p style="font-size:16px;color:#5C6470;line-height:1.8;margin:0 0 20px;">
        I'll email you a code within a day or two that unlocks everything.
        No payment, nothing to cancel.
      </p>

      <p style="font-size:16px;color:#5C6470;line-height:1.8;margin:0 0 20px;">
        While you wait, one thing would help enormously:
        <strong style="color:#1A2330;">ask the person you want to interview
        whether they're up for it.</strong> Tell them it's five conversations,
        that you'll be recording, and that they get to decide what ends up in
        the book. If they'd rather not, that's a complete answer, and much
        better to know now than halfway through.
      </p>

      <div style="background:#FBF8F3;border-radius:12px;padding:18px 20px;border:1px solid #E8E0D0;">
        <p style="font-size:14.5px;color:#5C6470;line-height:1.75;margin:0;">
          A reminder of the commitment: about twenty minutes of setup, then
          five conversations of roughly an hour each, spread across a month or
          two. It's a real amount of time. It's also the whole point.
        </p>
      </div>
    </div>

    <p style="font-size:14px;color:#8B8478;text-align:center;line-height:1.7;font-family:Arial,sans-serif;">
      Something go wrong, or just have a question? Reply to this email —
      it comes straight to me.<br><br>
      Timothy · <a href="https://mystory.family" style="color:#8B8478;">mystory.family</a>
    </p>

  </div>
</body>
</html>`;
}
