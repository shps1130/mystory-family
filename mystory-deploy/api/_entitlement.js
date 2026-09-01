// _entitlement.js — server-side auth + entitlement guard.
//
// Used by the interview API routes, which until now accepted requests from
// anyone. claude-draft.js in particular runs at max_tokens: 4000, so an
// open endpoint there is the most expensive hole in the codebase.
//
// Files prefixed with _ are not routed by Vercel, so this is importable
// without becoming an endpoint itself.
//
// Verification uses supabase.auth.getUser(token), which checks the token
// against the Auth server rather than trusting its contents. getClaims()
// is faster if your project uses asymmetric signing keys, but it validates
// signature and expiry only — it won't notice a session that was signed
// out. getUser is the right default here.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Exported so routes can run their own reads with the service key after the
// caller has been authenticated and their ownership of the project confirmed.
// Anything queried through this client bypasses RLS, so only use it behind
// requireEntitlement/requireProject, never on unvalidated input.
export const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Verifies the caller's token and confirms they hold the given product.
 * Returns { user } on success, or { error, status } on failure.
 */
export async function requireEntitlement(req, product = 'interview') {
  const token = getBearerToken(req);
  if (!token) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const user = data.user;

  const { data: rows, error: entError } = await admin
    .from('entitlements')
    .select('id')
    .eq('user_id', user.id)
    .eq('product', product)
    .limit(1);

  if (entError) {
    console.error('Entitlement lookup failed:', entError);
    return { error: 'Could not verify access', status: 503 };
  }

  if (!rows || rows.length === 0) {
    // 402 rather than 403: the caller is who they say they are, they just
    // haven't bought this. The client uses it to show the paywall.
    return { error: 'Payment required', status: 402 };
  }

  return { user };
}

/**
 * Confirms the caller owns the project they're acting on. Routes that take
 * a projectId should call this too — entitlement alone doesn't stop one
 * paying customer from passing another customer's project id.
 */
export async function requireProject(userId, projectId) {
  if (!projectId) return { error: 'projectId required', status: 400 };

  const { data, error } = await admin
    .from('interview_projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Project lookup failed:', error);
    return { error: 'Could not load project', status: 503 };
  }
  if (!data) return { error: 'Not found', status: 404 };

  return { project: data };
}
