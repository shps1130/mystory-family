const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function supabase(path, method, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Prefer": method === "POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "mystory_salt_2025");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const hashedPassword = await hashPassword(password);

  const result = await supabase(
    `mystory_users?email=eq.${encodeURIComponent(email.toLowerCase())}&select=*`,
    "GET"
  );

  if (!result.ok || !result.data?.length) {
    return res.status(401).json({ error: "That email and password don't match. Please try again." });
  }

  const user = result.data[0];
  if (user.password !== hashedPassword) {
    return res.status(401).json({ error: "That email and password don't match. Please try again." });
  }

  // Update last seen
  await supabase(
    `mystory_users?email=eq.${encodeURIComponent(email.toLowerCase())}`,
    "PATCH",
    { last_seen: new Date().toISOString() }
  );

  // Load their session if it exists
  const sessionResult = await supabase(
    `mystory_sessions?user_email=eq.${encodeURIComponent(email.toLowerCase())}&select=session_data`,
    "GET"
  );

  const sessionData = sessionResult.ok && sessionResult.data?.length
    ? sessionResult.data[0].session_data
    : null;

  return res.status(200).json({
    user: {
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    },
    session: sessionData,
  });
}
