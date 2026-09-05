// InterviewPaywall.jsx
// Shown when someone is signed in but holds no interview entitlement.
//
// Two audiences land here, and they need different things:
//   - Someone who hasn't bought yet → send them to checkout.
//   - Someone who bought, then signed in with a different address than the
//     one Stripe collected → their entitlement exists but can't be matched.
//     Without the second message they'd just see a paywall for something
//     they already paid for, which is the worst possible outcome.

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const colors = {
  gold: '#D4A574',
  goldDark: '#B08856',
  cream: '#F8F5F0',
  creamWarm: '#FFFBF5',
  border: '#E8E0D0',
  text: '#1A2330',
  textSecondary: '#5C6470',
  textTertiary: '#8B8478',
};

const fonts = {
  serif: '"Playfair Display", Georgia, "Times New Roman", serif',
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

// Wording for each failure the function can return. Generic messages here
// would be actively unhelpful: "expired" and "already used up" need
// different responses from the person holding the code.
const CODE_ERRORS = {
  invalid: "That code isn't one we recognize. Check for typos — it's twelve characters with two dashes.",
  expired: 'That code has expired. Get in touch and we\'ll sort you out with a new one.',
  used_up: 'That code has already been used. If it was meant for you, let us know.',
  disabled: "That code is no longer active. Let us know and we'll get you another.",
  not_signed_in: 'Please sign in again, then try the code.',
};

export default function InterviewPaywall({ userEmail, onSignOut }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [codeError, setCodeError] = useState('');

  const startCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/create-interview-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not start checkout');
      }
      window.location.href = data.url;
    } catch (err) {
      setError("Something went wrong starting checkout. Please try again.");
      setLoading(false);
    }
  };

  const redeemCode = async () => {
    setRedeeming(true);
    setCodeError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('redeem_access_code', {
        p_code: code,
      });
      if (rpcError) throw rpcError;

      if (!data?.ok) {
        setCodeError(CODE_ERRORS[data?.error] || "That code didn't work. Try again in a moment.");
        setRedeeming(false);
        return;
      }

      // Reload rather than flipping state locally. The gate re-runs its
      // entitlement check on load, so this proves the grant actually landed
      // instead of showing access that isn't really there.
      window.location.reload();
    } catch (err) {
      console.error('Redeem error:', err);
      setCodeError("We couldn't check that code just now. Try again in a moment.");
      setRedeeming(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.cream,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: fonts.sans,
    }}>
      <div style={{
        maxWidth: 520,
        width: '100%',
        background: colors.creamWarm,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: '44px 40px',
      }}>
        <h1 style={{
          fontFamily: fonts.serif,
          fontSize: 30,
          fontWeight: 400,
          color: colors.text,
          margin: '0 0 16px',
          lineHeight: 1.3,
        }}>
          Let's get your plan started
        </h1>

        <p style={{
          fontSize: 16,
          color: colors.textSecondary,
          lineHeight: 1.8,
          margin: '0 0 28px',
        }}>
          I'll walk you through building a real, personalized plan for capturing
          your loved one's stories — who they are, what matters most to you, and
          how this is actually going to happen in your life.
        </p>

        <button
          onClick={startCheckout}
          disabled={loading}
          style={{
            width: '100%',
            background: loading ? colors.gold : colors.goldDark,
            color: colors.creamWarm,
            border: 'none',
            borderRadius: 100,
            padding: '16px 32px',
            fontSize: 17,
            fontFamily: fonts.serif,
            letterSpacing: '0.5px',
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'One moment…' : 'Continue ✦'}
        </button>

        {error && (
          <p style={{ fontSize: 14, color: '#A6503B', margin: '16px 0 0' }}>
            {error}
          </p>
        )}

        <div style={{
          marginTop: 28,
          paddingTop: 24,
          borderTop: `1px solid ${colors.border}`,
        }}>
          <p style={{
            fontSize: 14,
            color: colors.textSecondary,
            margin: '0 0 10px',
          }}>
            Have a code?
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setCodeError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && code.trim() && !redeeming) redeemCode(); }}
              placeholder="XXXX-XXXX-XXXX"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              style={{
                flex: 1,
                minWidth: 180,
                padding: '12px 14px',
                fontSize: 15,
                letterSpacing: '1px',
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                fontFamily: 'inherit',
                color: colors.text,
                background: '#fff',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={redeemCode}
              disabled={redeeming || !code.trim()}
              style={{
                background: 'none',
                border: `1px solid ${colors.border}`,
                color: code.trim() ? colors.goldDark : colors.textTertiary,
                borderRadius: 100,
                padding: '12px 24px',
                fontSize: 15,
                fontFamily: 'inherit',
                cursor: redeeming || !code.trim() ? 'default' : 'pointer',
              }}
            >
              {redeeming ? 'Checking…' : 'Apply'}
            </button>
          </div>
          {codeError && (
            <p style={{ fontSize: 13.5, color: '#A6503B', margin: '10px 0 0', lineHeight: 1.6 }}>
              {codeError}
            </p>
          )}
        </div>

        <div style={{
          marginTop: 28,
          paddingTop: 24,
          borderTop: `1px solid ${colors.border}`,
        }}>
          <p style={{
            fontSize: 14,
            color: colors.textTertiary,
            lineHeight: 1.7,
            margin: 0,
          }}>
            <strong style={{ color: colors.textSecondary }}>Already purchased?</strong>{' '}
            Your purchase is attached to the email address you used at checkout.
            You're signed in as <strong>{userEmail}</strong>. If you paid with a
            different address,{' '}
            <button
              onClick={onSignOut}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: colors.goldDark,
                textDecoration: 'underline',
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              sign in with that one instead
            </button>
            . Still stuck? Reply to your receipt and we'll sort it out.
          </p>
        </div>
      </div>
    </div>
  );
}
