const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// In-memory rate limiter — tracks failed attempts per IP
// Resets on each serverless function cold start (good enough for our scale)
const failedAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(ip) {
  const now = Date.now();
  const record = failedAttempts.get(ip);
  if (!record) return false;
  // Clear if window has passed
  if (now - record.firstAttempt > WINDOW_MS) {
    failedAttempts.delete(ip);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const record = failedAttempts.get(ip);
  if (!record || now - record.firstAttempt > WINDOW_MS) {
    failedAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    record.count++;
  }
}

function clearAttempts(ip) {
  failedAttempts.delete(ip);
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Get client IP
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";

  // Check rate limit
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many sign-in attempts. Please wait 15 minutes and try again." });
  }

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  // Sanitize inputs
  const cleanEmail = email.toLowerCase().trim().slice(0, 254);
  if (!cleanEmail.includes("@")) return res.status(400).json({ error: "Please enter a valid email address." });

  const hashedPassword = await hashPassword(password);

  const result = await supabase(
    `mystory_users?email=eq.${encodeURIComponent(cleanEmail)}&select=*`,
    "GET"
  );

  if (!result.ok || !result.data?.length) {
    recordFailedAttempt(ip);
    return res.status(401).json({ error: "That email and password don't match. Please try again." });
  }

  const user = result.data[0];
  if (user.password !== hashedPassword) {
    recordFailedAttempt(ip);
    return res.status(401).json({ error: "That email and password don't match. Please try again." });
  }

  // Successful login — clear failed attempts
  clearAttempts(ip);

  // Update last seen
  await supabase(
    `mystory_users?email=eq.${encodeURIComponent(cleanEmail)}`,
    "PATCH",
    { last_seen: new Date().toISOString() }
  );

  // Load their session if it exists
  const sessionResult = await supabase(
    `mystory_sessions?user_email=eq.${encodeURIComponent(cleanEmail)}&select=session_data`,
    "GET"
  );

  const sessionData = sessionResult.ok && sessionResult.data?.length
    ? sessionResult.data[0].session_data
    : null;

  // Merge hasPaid from database into session
  const hasPaid = user.has_paid === true;
  const mergedSession = sessionData
    ? { ...sessionData, hasPaid: sessionData.hasPaid || hasPaid }
    : null;

  return res.status(200).json({
    user: {
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    },
    hasPaid,
    session: mergedSession,
  });
}
