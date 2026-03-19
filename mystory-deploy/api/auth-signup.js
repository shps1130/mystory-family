const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Rate limiter — max 3 signups per IP per hour
const signupAttempts = new Map();
const MAX_SIGNUPS = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip) {
  const now = Date.now();
  const record = signupAttempts.get(ip);
  if (!record) return false;
  if (now - record.firstAttempt > WINDOW_MS) {
    signupAttempts.delete(ip);
    return false;
  }
  return record.count >= MAX_SIGNUPS;
}

function recordAttempt(ip) {
  const now = Date.now();
  const record = signupAttempts.get(ip);
  if (!record || now - record.firstAttempt > WINDOW_MS) {
    signupAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    record.count++;
  }
}

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

function validatePassword(password) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one capital letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many accounts created from this device. Please try again later." });
  }

  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: "All fields required" });
  }

  // Sanitize inputs
  const cleanEmail = email.toLowerCase().trim().slice(0, 254);
  const cleanFirst = firstName.trim().slice(0, 50);
  const cleanLast = lastName.trim().slice(0, 50);

  if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (cleanFirst.length < 1) return res.status(400).json({ error: "Please enter your first name." });
  if (cleanLast.length < 1) return res.status(400).json({ error: "Please enter your last name." });

  // Password strength
  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ error: passwordError });

  // Check if email already exists
  const check = await supabase(`mystory_users?email=eq.${encodeURIComponent(cleanEmail)}&select=email`, "GET");
  if (check.ok && check.data?.length > 0) {
    return res.status(409).json({ error: "An account with that email already exists. Please sign in instead." });
  }

  recordAttempt(ip);
  const hashedPassword = await hashPassword(password);

  const result = await supabase("mystory_users", "POST", {
    email: cleanEmail,
    password: hashedPassword,
    first_name: cleanFirst,
    last_name: cleanLast,
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
