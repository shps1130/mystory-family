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

// Simple hash — good enough for this use case
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "mystory_salt_2025");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: "All fields required" });
  }

  // Check if email already exists
  const check = await supabase(`mystory_users?email=eq.${encodeURIComponent(email.toLowerCase())}&select=email`, "GET");
  if (check.ok && check.data?.length > 0) {
    return res.status(409).json({ error: "An account with that email already exists. Please sign in instead." });
  }

  const hashedPassword = await hashPassword(password);

  const result = await supabase("mystory_users", "POST", {
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    first_name: firstName.trim(),
    last_name: lastName.trim(),
  });

  if (!result.ok) {
    return res.status(500).json({ error: "Could not create account. Please try again." });
  }

  const user = Array.isArray(result.data) ? result.data[0] : result.data;
  return res.status(200).json({
    user: {
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    }
  });
}
