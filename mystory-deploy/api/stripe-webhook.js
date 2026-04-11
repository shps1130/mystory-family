const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

function generateGiftCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function buildEmailHtml({ buyerName, recipientName, code, hardcover, redeemUrl }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F7F3EC;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EC;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#1C2B1A;border-radius:16px;overflow:hidden;">
        
        <!-- Header -->
        <tr><td style="padding:40px 48px 32px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#E8B85A;font-family:sans-serif;">MyStory.Family</p>
          <h1 style="margin:0;font-size:32px;font-weight:300;color:#F7F3EC;line-height:1.2;">
            Your gift is ready,<br><em style="color:#E8B85A;">${buyerName}.</em>
          </h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 48px;">
          <p style="margin:0 0 20px;font-size:16px;font-weight:300;color:rgba(247,243,236,0.75);line-height:1.7;">
            You've given ${recipientName} something that will last long after the flowers have faded — the chance to tell her story, in her own words, at her own pace.
          </p>
          <p style="margin:0 0 32px;font-size:16px;font-weight:300;color:rgba(247,243,236,0.75);line-height:1.7;">
            All she needs to do is click the button below. She'll create a password and be welcomed by Grace — no codes to type, no tech headaches.
          </p>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding-bottom:32px;">
              <a href="${redeemUrl}" style="display:inline-block;background:#C8973A;color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:500;padding:16px 40px;border-radius:100px;text-decoration:none;letter-spacing:0.02em;">
                Start Mom's Story →
              </a>
            </td></tr>
          </table>

          <!-- What's included -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.05);border-radius:12px;margin-bottom:32px;">
            <tr><td style="padding:24px 28px;">
              <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#E8B85A;font-family:sans-serif;">What ${recipientName} receives</p>
              <p style="margin:0 0 8px;font-size:14px;font-weight:300;color:rgba(247,243,236,0.7);">✦ &nbsp;Guided story sessions with Grace</p>
              <p style="margin:0 0 8px;font-size:14px;font-weight:300;color:rgba(247,243,236,0.7);">✦ &nbsp;Her own pace — no pressure, no deadline</p>
              <p style="margin:0 0 8px;font-size:14px;font-weight:300;color:rgba(247,243,236,0.7);">✦ &nbsp;A beautifully formatted keepsake PDF</p>
              ${hardcover ? `<p style="margin:0;font-size:14px;font-weight:300;color:rgba(247,243,236,0.7);">✦ &nbsp;Printed hardcover book — shipped to you when complete</p>` : ''}
            </td></tr>
          </table>

          <p style="margin:0;font-size:13px;font-weight:300;color:rgba(247,243,236,0.35);line-height:1.7;text-align:center;">
            If the button doesn't work, copy this link into her browser:<br>
            <span style="color:rgba(247,243,236,0.5);">${redeemUrl}</span>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 48px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
          <p style="margin:0;font-size:12px;font-weight:300;color:rgba(247,243,236,0.25);font-family:sans-serif;">
            MyStory.Family · Preserving stories that matter.<br>
            Questions? Reply to this email.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { buyerName, buyerEmail, recipientName, hardcover } = session.metadata;

    const code = generateGiftCode();
    const redeemUrl = `${process.env.APP_URL}/redeem?code=${code}`;

    try {
      // Save to Supabase
      const { error: dbError } = await supabase.from('gift_codes').insert({
        code,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        recipient_name: recipientName,
        hardcover: hardcover === 'true',
        stripe_session_id: session.id,
        redeemed: false,
      });

      if (dbError) throw dbError;

      // Send gift email to buyer
      await resend.emails.send({
        from: 'Grace at MyStory.Family <grace@mystory.family>',
        to: buyerEmail,
        subject: `🌸 ${recipientName}'s story is waiting — your Mother's Day gift is ready`,
        html: buildEmailHtml({
          buyerName,
          recipientName,
          code,
          hardcover: hardcover === 'true',
          redeemUrl,
        }),
      });

      console.log(`Gift code ${code} created for ${recipientName}, sent to ${buyerEmail}`);
    } catch (err) {
      console.error('Post-payment error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  res.json({ received: true });
};

// Required for Stripe webhook signature verification - disable body parsing
module.exports.config = {
  api: { bodyParser: false },
};
