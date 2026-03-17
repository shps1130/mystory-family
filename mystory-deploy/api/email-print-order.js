const RESEND_API_KEY = process.env.RESEND_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userEmail, userName, option, price, shipping } = req.body;

  // Email to YOU — order notification
  const adminHtml = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;background:#fdf6ec;">
  <h2 style="color:#3d2b1a;margin-bottom:24px;">📚 New Print Order — MyStory.Family</h2>
  <div style="background:white;border-radius:12px;padding:28px;border:1px solid rgba(180,140,80,0.2);margin-bottom:20px;">
    <h3 style="color:#b8860b;margin:0 0 16px;font-size:18px;">Order Details</h3>
    <p style="margin:0 0 8px;"><strong>Option:</strong> ${option}</p>
    <p style="margin:0 0 8px;"><strong>Price:</strong> $${price}</p>
    <p style="margin:0 0 8px;"><strong>Customer Email:</strong> ${userEmail}</p>
  </div>
  <div style="background:white;border-radius:12px;padding:28px;border:1px solid rgba(180,140,80,0.2);margin-bottom:20px;">
    <h3 style="color:#b8860b;margin:0 0 16px;font-size:18px;">Ship To</h3>
    <p style="margin:0 0 6px;"><strong>${shipping.name}</strong></p>
    <p style="margin:0 0 6px;">${shipping.address}</p>
    <p style="margin:0 0 6px;">${shipping.city}, ${shipping.state} ${shipping.zip}</p>
    <p style="margin:0;">${shipping.country}</p>
  </div>
  <p style="color:#8b7355;font-size:13px;">Download their PDF from the app, then send to your printer.</p>
</body>
</html>`;

  // Email to CUSTOMER — confirmation
  const customerHtml = `
<!DOCTYPE html>
<html>
<body style="font-family:'Georgia',serif;max-width:560px;margin:0 auto;padding:48px 24px;background:#fdf6ec;">
  <div style="text-align:center;margin-bottom:36px;">
    <div style="font-size:40px;margin-bottom:16px;">📚</div>
    <h1 style="font-size:30px;font-weight:300;color:#3d2b1a;font-style:italic;margin:0 0 8px;">Your order is confirmed.</h1>
    <p style="font-size:14px;color:#8b7355;letter-spacing:2px;text-transform:uppercase;margin:0;font-family:Arial,sans-serif;">MyStory.Family Print Order</p>
  </div>
  <div style="background:white;border-radius:16px;padding:32px;border:1px solid rgba(180,140,80,0.15);margin-bottom:24px;">
    <p style="font-size:17px;color:#5c4a35;line-height:1.9;font-style:italic;margin:0 0 16px;">Dear ${shipping.name},</p>
    <p style="font-size:16px;color:#6b5540;line-height:1.85;margin:0 0 16px;">We've received your order for <strong>${option}</strong>. Your legacy book will be professionally printed and shipped to:</p>
    <div style="background:#fdf6ec;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 4px;font-size:15px;color:#3d2b1a;"><strong>${shipping.name}</strong></p>
      <p style="margin:0 0 4px;font-size:15px;color:#6b5540;">${shipping.address}</p>
      <p style="margin:0 0 4px;font-size:15px;color:#6b5540;">${shipping.city}, ${shipping.state} ${shipping.zip}</p>
      <p style="margin:0;font-size:15px;color:#6b5540;">${shipping.country}</p>
    </div>
    <p style="font-size:15px;color:#6b5540;line-height:1.8;margin:0;">We'll send you a tracking number as soon as your book ships. If you have any questions, reply to this email.</p>
  </div>
  <p style="font-size:14px;color:#a89070;text-align:center;font-family:Arial,sans-serif;">
    Thank you for preserving your story. 🕊️<br>
    <a href="https://mystory.family" style="color:#b8860b;">MyStory.Family</a>
  </p>
</body>
</html>`;

  try {
    // Send order notification to you
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "MyStory.Family Orders <orders@mystory.family>",
        to: ["hello@mystory.family"],
        subject: `📚 New Print Order — ${shipping.name} — ${option}`,
        html: adminHtml,
      }),
    });

    // Send confirmation to customer
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "MyStory.Family <grace@mystory.family>",
        to: [userEmail],
        subject: `Your print order is confirmed — ${option}`,
        html: customerHtml,
      }),
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Print order email error:", e);
    return res.status(500).json({ error: "Could not send order confirmation" });
  }
}
