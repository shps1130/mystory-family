// RedeemGift.jsx
// Drop this component into App.jsx and render it at the /redeem route
// It reads ?code=XXXX from the URL, validates it, and creates Mom's account

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function RedeemGift({ onSuccess }) {
  const [code, setCode] = useState('');
  const [giftRecord, setGiftRecord] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('loading'); // loading | invalid | welcome | creating | done | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (!codeParam) { setStep('invalid'); return; }
    setCode(codeParam);
    validateCode(codeParam);
  }, []);

  async function validateCode(c) {
    const { data, error } = await supabase
      .from('gift_codes')
      .select('*')
      .eq('code', c)
      .single();

    if (error || !data) { setStep('invalid'); return; }
    if (data.redeemed) { setStep('invalid'); return; }

    setGiftRecord(data);
    setStep('welcome');
  }

  async function handleCreate() {
    if (!email || !password) return;
    if (password.length < 6) { setErrorMsg('Password must be at least 6 characters'); return; }

    setStep('creating');
    setErrorMsg('');

    try {
      // Check if user already exists
      const { data: existing } = await supabase
        .from('mystory_users')
        .select('email')
        .eq('email', email)
        .single();

      if (existing) {
        setErrorMsg('An account with this email already exists. Please use a different email.');
        setStep('welcome');
        return;
      }

      // Create user account
      const { error: insertError } = await supabase
        .from('mystory_users')
        .insert({
          email,
          password, // Note: hash this server-side in production
          first_name: giftRecord.recipient_name,
          last_name: '',
        });

      if (insertError) throw insertError;

      // Mark gift code as redeemed
      await supabase
        .from('gift_codes')
        .update({
          redeemed: true,
          redeemed_by: email,
          redeemed_at: new Date().toISOString(),
        })
        .eq('code', code);

      setStep('done');

      // Hand off to the main app — pass credentials so Grace can log her in
      setTimeout(() => {
        if (onSuccess) onSuccess({ email, password });
      }, 2500);

    } catch (err) {
      console.error('Redemption error:', err);
      setErrorMsg('Something went wrong — please try again or email grace@mystory.family');
      setStep('welcome');
    }
  }

  // ── Styles ──────────────────────────────────────────────────
  const styles = {
    page: {
      minHeight: '100vh',
      background: '#1C2B1A',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: "'Outfit', system-ui, sans-serif",
    },
    logo: {
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: '20px',
      fontWeight: 600,
      color: '#F7F3EC',
      marginBottom: '36px',
      textAlign: 'center',
    },
    logoSpan: { color: '#E8B85A' },
    card: {
      background: '#FDFAF5',
      borderRadius: '24px',
      width: '100%',
      maxWidth: '480px',
      overflow: 'hidden',
      color: '#1A1A1A',
    },
    cardHeader: {
      background: '#2D4329',
      padding: '36px 40px',
      textAlign: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    },
    eyebrow: {
      fontSize: '11px',
      fontWeight: 500,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: '#E8B85A',
      marginBottom: '10px',
    },
    headline: {
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: '28px',
      fontWeight: 300,
      color: '#F7F3EC',
      lineHeight: 1.25,
      margin: 0,
    },
    headlineEm: { fontStyle: 'italic', color: '#E8B85A' },
    cardBody: { padding: '36px 40px' },
    subtext: {
      fontSize: '15px',
      fontWeight: 300,
      color: '#4A4A4A',
      lineHeight: 1.7,
      marginBottom: '28px',
    },
    label: {
      display: 'block',
      fontSize: '11px',
      fontWeight: 500,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: '#7A7A7A',
      marginBottom: '8px',
    },
    input: {
      width: '100%',
      padding: '14px 16px',
      border: '1.5px solid rgba(0,0,0,0.12)',
      borderRadius: '10px',
      fontSize: '16px',
      fontWeight: 300,
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#1A1A1A',
      background: '#fff',
      outline: 'none',
      marginBottom: '18px',
      boxSizing: 'border-box',
    },
    btn: {
      width: '100%',
      background: '#C8973A',
      color: '#fff',
      fontFamily: "'Outfit', system-ui, sans-serif",
      fontSize: '17px',
      fontWeight: 500,
      padding: '17px',
      border: 'none',
      borderRadius: '100px',
      cursor: 'pointer',
      letterSpacing: '0.02em',
      marginTop: '4px',
      boxShadow: '0 4px 20px rgba(200,151,58,0.35)',
    },
    errorMsg: {
      background: '#FDECEA',
      border: '1px solid #F5C6C2',
      borderRadius: '10px',
      padding: '12px 16px',
      fontSize: '13px',
      color: '#C0392B',
      marginBottom: '18px',
    },
    successIcon: { fontSize: '48px', marginBottom: '16px' },
    successText: {
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: '26px',
      fontWeight: 300,
      color: '#F7F3EC',
      lineHeight: 1.3,
    },
  };

  // ── Render states ────────────────────────────────────────────

  if (step === 'loading') {
    return (
      <div style={styles.page}>
        <div style={{ color: 'rgba(247,243,236,0.5)', fontSize: '15px', fontWeight: 300 }}>
          Checking your gift...
        </div>
      </div>
    );
  }

  if (step === 'invalid') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.eyebrow}>Gift Redemption</div>
            <h1 style={styles.headline}>This link doesn't look right.</h1>
          </div>
          <div style={styles.cardBody}>
            <p style={styles.subtext}>
              This gift link may have already been used or the code is invalid. Please check the email your gift came from and try again, or reach out to us at <strong>grace@mystory.family</strong> and we'll sort it out right away.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ ...styles.cardHeader, textAlign: 'center', padding: '48px 40px' }}>
            <div style={styles.successIcon}>🌸</div>
            <h1 style={styles.successText}>
              Welcome, {giftRecord?.recipient_name}.<br />
              <em style={{ color: '#E8B85A' }}>Your story is waiting.</em>
            </h1>
          </div>
          <div style={styles.cardBody}>
            <p style={{ ...styles.subtext, textAlign: 'center' }}>
              Taking you to Grace now...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.logo}>
        MyStory<span style={styles.logoSpan}>.Family</span>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.eyebrow}>Your gift is here</div>
          <h1 style={styles.headline}>
            Hello, <em style={styles.headlineEm}>{giftRecord?.recipient_name}.</em><br />
            Let's get you started.
          </h1>
        </div>

        <div style={styles.cardBody}>
          <p style={styles.subtext}>
            {giftRecord?.buyer_name} gave you something special — your own space to tell your story, your way. Just create a password and you'll meet Grace.
          </p>

          {errorMsg && <div style={styles.errorMsg}>{errorMsg}</div>}

          <label style={styles.label}>Your email address</label>
          <input
            type="email"
            style={styles.input}
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
          />

          <label style={styles.label}>Create a password</label>
          <input
            type="password"
            style={styles.input}
            placeholder="At least 6 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
          />

          <button
            style={{ ...styles.btn, opacity: step === 'creating' ? 0.65 : 1 }}
            disabled={step === 'creating'}
            onClick={handleCreate}
          >
            {step === 'creating' ? 'Setting up your story...' : 'Meet Grace →'}
          </button>
        </div>
      </div>
    </div>
  );
}
