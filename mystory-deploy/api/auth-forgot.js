const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "mystory_salt_2025");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.status(400).json({ error: "Email, code, and new password required" });

  // Verify code
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/mystory_users?email=eq.${encodeURIComponent(email.toLowerCase())}&select=reset_code,reset_code_expires`,
    {
      headers: {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  const users = await r.json();
  if (!users?.length) return res.status(404).json({ error: "Account not found." });

  const user = users[0];
  if (!user.reset_code || user.reset_code !== code) {
    return res.status(401).json({ error: "That code is incorrect. Please try again." });
  }
  if (new Date(user.reset_code_expires) < new Date()) {
    return res.status(401).json({ error: "That code has expired. Please request a new one." });
  }

  // Update password and clear code
  const hashedPassword = await hashPassword(newPassword);
  await fetch(
    `${SUPABASE_URL}/rest/v1/mystory_users?email=eq.${encodeURIComponent(email.toLowerCase())}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ password: hashedPassword, reset_code: null, reset_code_expires: null }),
    }
  );

  return res.status(200).json({ ok: true });
}
