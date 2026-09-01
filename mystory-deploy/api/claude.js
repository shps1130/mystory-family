// claude.js — hardened proxy to the Anthropic Messages API.
//
// The previous version forwarded req.body verbatim with no auth, no model
// restriction and no rate limit. Anyone who found the URL could spend your
// API budget, on any model, with any max_tokens.
//
// This version is the INTERIM step: it cannot verify a real user yet,
// because the app has no session tokens (auth-signin returns a bare user
// object). Everything here is a cost ceiling, not an identity check.
// When Supabase Auth lands, fill in verifySupabaseJWT below and switch
// REQUIRE_AUTH to true — the rest of the file stays as it is.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET; // set at migration time

const REQUIRE_AUTH = false; // flip to true once Supabase Auth is live

// Only models this app actually uses. Anything else is rejected — this is
// what stops someone pointing your key at the most expensive model available.
const ALLOWED_MODELS = new Set([
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-5",
]);

const MAX_TOKENS_CEILING = 2000;   // highest max_tokens any caller may request
const MAX_BODY_BYTES = 200 * 1024; // 200KB
const MAX_MESSAGES = 60;
const RATE_LIMIT = 40;             // requests per window
const RATE_WINDOW_MINUTES = 10;

const ALLOWED_ORIGINS = [
  "https://mystory.family",
  "https://www.mystory.family",
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key not configured" });
  }

  // --- Origin check ---
  // Weak on its own (trivially forged outside a browser) but it costs
  // nothing and stops other sites embedding your proxy.
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // --- Identity (placeholder until Supabase Auth) ---
  let userId = null;
  if (REQUIRE_AUTH) {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    userId = await verifySupabaseJWT(token);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
  }

  // --- Rate limit ---
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.socket?.remoteAddress
    || "unknown";
  const limitKey = userId || `ip:${ip}`;

  const allowed = await checkRateLimit(limitKey);
  if (!allowed) {
    res.setHeader("Retry-After", String(RATE_WINDOW_MINUTES * 60));
    return res.status(429).json({ error: "Too many requests. Please wait a moment." });
  }

  // --- Validate and rebuild the request ---
  // Rebuilt field by field rather than forwarded. Passing req.body through
  // would let a caller set anything the Anthropic API accepts.
  const body = req.body || {};

  const rawSize = Buffer.byteLength(JSON.stringify(body));
  if (rawSize > MAX_BODY_BYTES) {
    return res.status(413).json({ error: "Request too large" });
  }

  if (!ALLOWED_MODELS.has(body.model)) {
    return res.status(400).json({ error: "Unsupported model" });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: "messages required" });
  }
  if (body.messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: "Too many messages" });
  }

  for (const m of body.messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) {
      return res.status(400).json({ error: "Invalid message role" });
    }
    if (typeof m.content !== "string" && !Array.isArray(m.content)) {
      return res.status(400).json({ error: "Invalid message content" });
    }
  }

  const maxTokens = Math.min(
    Number.isFinite(body.max_tokens) ? body.max_tokens : 1000,
    MAX_TOKENS_CEILING
  );

  const payload = {
    model: body.model,
    max_tokens: maxTokens,
    messages: body.messages.map(m => ({ role: m.role, content: m.content })),
  };
  if (typeof body.system === "string") payload.system = body.system.slice(0, 20000);
  if (typeof body.temperature === "number") {
    payload.temperature = Math.max(0, Math.min(1, body.temperature));
  }

  // --- Forward ---
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      // Don't hand upstream error bodies to the client — they can carry
      // account and configuration detail.
      console.error("Anthropic API error:", response.status, JSON.stringify(data));
      return res.status(response.status === 429 ? 429 : 502).json({
        error: response.status === 429
          ? "Service is busy. Please try again shortly."
          : "Upstream error",
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(502).json({ error: "Proxy error" });
  }
}

// --- Rate limiting -------------------------------------------------------
// Backed by Postgres, not a Map. In-memory counters (as in auth-signin.js
// and auth-signup.js) are per-instance: Vercel runs many concurrent
// instances and recycles them, so an attacker gets a fresh budget on every
// cold start and the limit never really binds.

async function checkRateLimit(key) {
  const windowStart = new Date(Date.now() - RATE_WINDOW_MINUTES * 60 * 1000).toISOString();
  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  try {
    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/api_rate_limit` +
      `?limit_key=eq.${encodeURIComponent(key)}` +
      `&created_at=gte.${encodeURIComponent(windowStart)}` +
      `&select=id`,
      { headers: { ...headers, "Prefer": "count=exact", "Range": "0-0" } }
    );

    const contentRange = countRes.headers.get("content-range") || "";
    const total = parseInt(contentRange.split("/")[1], 10);

    if (Number.isFinite(total) && total >= RATE_LIMIT) return false;

    await fetch(`${SUPABASE_URL}/rest/v1/api_rate_limit`, {
      method: "POST",
      headers: { ...headers, "Prefer": "return=minimal" },
      body: JSON.stringify({ limit_key: key, created_at: new Date().toISOString() }),
    });

    return true;
  } catch (err) {
    // Fail open: a rate-limiter outage shouldn't take the product down.
    // Revisit if abuse becomes real — failing closed is the safer default
    // once you have paying users who'd notice either way.
    console.error("Rate limit check failed:", err);
    return true;
  }
}

// --- Supabase Auth seam --------------------------------------------------
// Fill this in during the migration. Verify the HS256 JWT against
// SUPABASE_JWT_SECRET and return the `sub` claim, or null.
//
// async function verifySupabaseJWT(token) {
//   const { jwtVerify } = await import("jose");
//   try {
//     const { payload } = await jwtVerify(
//       token,
//       new TextEncoder().encode(SUPABASE_JWT_SECRET)
//     );
//     return payload.sub || null;
//   } catch { return null; }
// }

async function verifySupabaseJWT() {
  throw new Error("verifySupabaseJWT not implemented — REQUIRE_AUTH must stay false");
}
