// api/beta-signup.js
// Captures beta tester signups from the unlisted recruitment page.
//
// Deliberately open — the whole point is that people who haven't signed in
// can reach it. So the protection is input limits, a honeypot, and the fact
// that the worst case is junk rows in a table only you can read.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'tim@mystory.family';

const MAX = { name: 120, email: 254, subject: 400, notes: 2000 };

function clean(value, limit) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, limit);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};

  // Honeypot. The field is hidden off-screen, so a human never fills it.
  // Return 200 rather than an error — telling a bot it failed just invites
  // it to try again without the field.
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

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/beta_signups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(row),
    });

    if (!r.ok) {
      console.error('beta-signup insert failed:', r.status, await r.text());
      return res.status(502).json({ error: 'Could not save signup' });
    }
  } catch (err) {
    console.error('beta-signup error:', err);
    return res.status(502).json({ error: 'Could not save signup' });
  }

  // Notify yourself. Failure here is logged but not surfaced — the signup is
  // already saved, and making someone retry a form that worked is worse than
  // you finding them in the table later.
  if (RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'MyStory.Family <grace@mystory.family>',
          to: [NOTIFY_EMAIL],
          subject: `Beta signup: ${name}`,
          text:
            `${name}\n${email}\n\n` +
            `Interviewing: ${row.subject_note || '(not said)'}\n\n` +
            `Notes: ${row.notes || '(none)'}\n`,
        }),
      });
    } catch (e) {
      console.error('beta-signup notify failed:', e);
    }
  }

  return res.status(200).json({ ok: true });
}
