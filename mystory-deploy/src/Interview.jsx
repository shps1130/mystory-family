// Interview.jsx
// MyStory.Family — Buyer dashboard and Getting Started flow (v2)
// Lives at /interview on mystory.family
//
// V2 changes:
// - Seven chunks instead of six (added optional Logistics chunk)
// - Named, visible chunk indicator (replaces numbered dots)
// - Plan-in-progress panel (future-visible, fills in as Grace learns)
// - New Grace voice (thoughtful friend, wedding planner, quiet motivator)

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import InterviewPaywall from './InterviewPaywall.jsx';

// ============================================================
// Supabase client
// ============================================================
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ============================================================
// Brand palette
// ============================================================
const colors = {
  navy: '#2C3E50',
  gold: '#D4A574',
  goldDark: '#B08856',
  olive: '#7A8B6F',
  tan: '#A67B5B',
  cream: '#F8F5F0',
  creamLight: '#FBF8F3',
  creamWarm: '#FFFBF5',
  gray: '#C4B5A0',
  border: '#E8E0D0',
  borderSubtle: '#F0EBE2',
  text: '#1A2330',
  textSecondary: '#5C6470',
  textTertiary: '#8B8478',
};

const fonts = {
  serif: '"Playfair Display", Georgia, "Times New Roman", serif',
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

// ============================================================
// Chunk definitions — the seven chunks of Getting Started
// ============================================================
const CHUNKS = {
  1: { name: 'welcome', label: 'Welcome', shortLabel: 'Welcome' },
  2: { name: 'about_you', label: 'About you', shortLabel: 'You' },
  3: { name: 'about_subject', label: 'About your mom', shortLabel: 'Your mom' },
  4: { name: 'sensitivities', label: 'Sensitivities', shortLabel: 'Sensitive' },
  5: { name: 'hopes', label: 'What you hope for', shortLabel: 'Hopes' },
  6: { name: 'logistics', label: 'Logistics', shortLabel: 'Logistics' },
  7: { name: 'plan', label: 'Your plan', shortLabel: 'Plan' },
};

const TOTAL_CHUNKS = 7;

// Function to get the subject-aware chunk label
function getChunkLabel(chunkNumber, subjectName, relationship) {
  if (chunkNumber === 3) {
    if (relationship) {
      return `About your ${relationship}`;
    }
    if (subjectName) {
      return `About ${subjectName}`;
    }
    return 'About your loved one';
  }
  return CHUNKS[chunkNumber].label;
}

// ============================================================
// Chunk 1 — scripted welcome
// ============================================================
const CHUNK_1_WELCOME = (buyerName) => [
  { type: 'heading', text: `Hello, ${buyerName || 'there'}. I'm Grace.` },
  { type: 'paragraph', text: "I'm so glad you're here. Before we go any further, I want to tell you what we're doing together — and what you can expect from me." },
  { type: 'paragraph', text: "Over the next fifteen minutes or so, we're going to build a real, personalized plan for capturing your loved one's stories. I'll ask about who they are, what matters most to you, and what we should be careful with along the way. Together, we'll figure out how this is actually going to happen in your real life — when, where, how often, with whom." },
  { type: 'paragraph', text: "Two things I want you to know up front." },
  { type: 'paragraph', text: "First: there are no wrong answers. You can pause anytime and come back — I'll save where we are. If a question doesn't fit, just tell me, and we'll move on." },
  { type: 'paragraph', text: "Second — and this matters: I'm not here to tell their story for them. Their story is theirs to tell, in their own words, when you sit down with them. What we're doing together right now is making sure I can help you draw those stories out as carefully as they deserve." },
  { type: 'paragraph', text: "Most people think about doing this for years before they actually start. You started. Let's keep going." },
  { type: 'paragraph', text: "Ready when you are." },
];

// ============================================================
// Main Interview app
// ============================================================
// Authenticated fetch — the interview API routes now require a bearer token
// ============================================================
async function authedFetch(url, body) {
  // getSession refreshes the access token automatically when it's near
  // expiry, so this is always a live token rather than whatever was issued
  // when the page loaded.
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  });

  // 401 = the session is gone. 402 = the entitlement is gone (a refund, say).
  // Either way the page's current state is wrong, and the call-site catch
  // blocks all show a generic "try again" that would send the user in
  // circles. Reloading re-runs the gate, which lands them on the sign-in
  // screen or the paywall — whichever is actually true now.
  if (res.status === 401 || res.status === 402) {
    window.location.reload();
    throw new Error('Session or access changed — reloading.');
  }

  return res;
}

// ============================================================
export default function Interview() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [view, setView] = useState('dashboard');
  const [entitled, setEntitled] = useState(null); // null = still checking

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);
    };
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    // Order matters: claim, then check, then create. Buyers arrive here
    // straight from Stripe having never signed in, so their entitlement is
    // sitting in the table keyed only by email. Skip the claim and every
    // first-time buyer sees the paywall for something they just paid for.
    const bootstrap = async () => {
      // 1. Bind any purchase made before this account existed. Safe to call
      //    on every load — it only touches unclaimed rows matching the
      //    verified email in the caller's token.
      const { error: claimError } = await supabase.rpc('claim_entitlements');
      if (claimError) console.error('Entitlement claim failed:', claimError);

      // 2. Check access. No .eq('user_id', ...) here — RLS already scopes
      //    this to the current user, and leaning on the policy rather than a
      //    client-side filter means a mistake in the query can't widen access.
      const { data: ents, error: entError } = await supabase
        .from('entitlements')
        .select('id')
        .eq('product', 'interview')
        .limit(1);

      if (cancelled) return;

      if (entError) {
        console.error('Entitlement check failed:', entError);
        setEntitled(false);
        return;
      }

      const hasAccess = Boolean(ents && ents.length > 0);
      setEntitled(hasAccess);
      if (!hasAccess) return; // don't create a project for someone who hasn't paid

      // 3. Load or create the project.
      const { data: projects, error } = await supabase
        .from('interview_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (cancelled) return;

      if (error) {
        console.error('Error loading project:', error);
        return;
      }

      if (projects && projects.length > 0) {
        setProject(projects[0]);
        return;
      }

      const buyerName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        '';

      const { data: newProject, error: createError } = await supabase
        .from('interview_projects')
        .insert({ user_id: user.id, buyer_name: buyerName })
        .select()
        .single();

      if (cancelled) return;

      if (createError) {
        console.error('Error creating project:', createError);
        return;
      }
      setProject(newProject);
    };

    bootstrap();
    return () => { cancelled = true; };
  }, [user]);

  if (authLoading) return <LoadingScreen />;
  if (!user) return <SignInScreen />;
  if (entitled === null) return <LoadingScreen message="Checking your account..." />;
  if (!entitled) {
    return (
      <InterviewPaywall
        userEmail={user.email}
        onSignOut={() => supabase.auth.signOut()}
      />
    );
  }
  if (!project) return <LoadingScreen message="Setting up your project..." />;

  if (view === 'getting_started') {
    return (
      <GettingStarted
        project={project}
        onProjectUpdate={setProject}
        onReturnToDashboard={() => setView('dashboard')}
        onOpenGuide={() => setView('interviewer_guide')}
      />
    );
  }

  if (view === 'interviewer_guide') {
    return (
      <InterviewerGuide
        project={project}
        onProjectUpdate={setProject}
        onReturnToDashboard={() => setView('dashboard')}
      />
    );
  }

  if (view === 'capture') {
    return (
      <CaptureConversation
        project={project}
        onProjectUpdate={setProject}
        onReturnToDashboard={() => setView('dashboard')}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      project={project}
      onBeginGettingStarted={() => setView('getting_started')}
      onOpenGuide={() => setView('interviewer_guide')}
      onOpenCapture={() => setView('capture')}
    />
  );
}

// ============================================================
// Loading screen
// ============================================================
function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: colors.cream,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: fonts.sans,
      color: colors.textSecondary,
    }}>
      {message}
    </div>
  );
}

// ============================================================
// Sign-in screen
// ============================================================
function SignInScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Buyers land here straight from Stripe with no account yet. Their
  // entitlement is keyed to the email Stripe collected, so signing in with a
  // different address silently finds nothing and drops them on the paywall
  // for something they just paid for. Saying which address to use is the
  // cheapest fix for what would otherwise be the most common support ticket.
  const justPurchased =
    new URLSearchParams(window.location.search).get('purchase') === 'success';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.cream,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: fonts.sans,
      padding: '2rem',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '440px',
        width: '100%',
        border: `0.5px solid ${colors.border}`,
      }}>
        <h1 style={{
          fontFamily: fonts.serif,
          fontSize: '24px',
          fontWeight: 500,
          color: colors.navy,
          margin: '0 0 8px',
        }}>
          MyStory<span style={{ color: colors.gold }}>.</span>Family
        </h1>
        <p style={{ fontSize: '14px', color: colors.textSecondary, margin: '0 0 24px' }}>
          Sign in to continue your project.
        </p>

        {justPurchased && (
          <div style={{
            background: colors.creamWarm,
            border: `0.5px solid ${colors.border}`,
            borderRadius: '10px',
            padding: '14px 16px',
            margin: '0 0 20px',
          }}>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.65, margin: 0 }}>
              Thank you — your purchase is complete. Sign in with the email
              address you used at checkout and we'll pick up right where you
              left off.
            </p>
          </div>
        )}

        {sent ? (
          <p style={{ fontSize: '14px', color: colors.olive, lineHeight: 1.6 }}>
            Check your email — we've sent you a link to sign in.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '15px',
                border: `0.5px solid ${colors.border}`,
                borderRadius: '8px',
                marginBottom: '12px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                background: colors.navy,
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                cursor: 'pointer',
                fontWeight: 500,
                fontFamily: 'inherit',
              }}
            >
              Send sign-in link
            </button>
            {error && <p style={{ color: '#B8543D', fontSize: '13px', marginTop: '12px' }}>{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Dashboard
// ============================================================
function Dashboard({ user, project, onBeginGettingStarted, onOpenGuide, onOpenCapture }) {
  const subject = project.subject_name || 'your loved one';
  const buyerInitials = (project.buyer_name || user.email || '?')
    .split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();

  const getGreeting = () => {
    if (!project.getting_started_complete) {
      return {
        eyebrow: project.subject_name ? `${project.subject_name}'s life story` : 'A new project',
        heading: `Welcome${project.buyer_name ? `, ${project.buyer_name}` : ''}.`,
        body: "Let's begin by getting to know your family. Start with Getting Started below.",
      };
    }
    return {
      eyebrow: `${subject}'s life story`,
      heading: `Welcome back${project.buyer_name ? `, ${project.buyer_name}` : ''}.`,
      body: 'Your next step is ready when you are.',
    };
  };

  const greeting = getGreeting();

  const activeStep = !project.getting_started_complete
    ? 'getting_started'
    : !project.interviewer_guide_complete
    ? 'interviewer_guide'
    : !project.capturing_conversations_complete
    ? 'capturing_conversations'
    : 'conversation_1';

  const totalSteps = 8;
  const completedSteps =
    (project.getting_started_complete ? 1 : 0) +
    (project.interviewer_guide_complete ? 1 : 0) +
    (project.capturing_conversations_complete ? 1 : 0);

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.cream,
      fontFamily: fonts.sans,
      color: colors.text,
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          overflow: 'hidden',
          border: `0.5px solid ${colors.border}`,
        }}>
          <Header buyerInitials={buyerInitials} buyerName={project.buyer_name} />
          <Hero greeting={greeting} />
          <ProgressBar completed={completedSteps} total={totalSteps} />

          <Section
            barColor={colors.gold}
            title={activeStep === 'getting_started' ? 'Start here' : 'Continue where you left off'}
          >
            {activeStep === 'getting_started' && (
              <ActiveCard
                eyebrow="Begin · Step 1 of 3"
                title="Getting started"
                description="Together we'll build a real plan for capturing your loved one's stories. About 15 minutes."
                buttonText="Begin →"
                onClick={onBeginGettingStarted}
                icon={<IconGetting />}
              />
            )}
            {activeStep === 'interviewer_guide' && (
              <ActiveCard
                eyebrow="Up next · Step 2 of 3"
                title="Your interviewer guide"
                description={`Your personalized guide for your first conversation${project.subject_name ? ` with ${project.subject_name}` : ''} — how to set them at ease, what to cover, and what to do if something comes up.`}
                buttonText="Open your guide →"
                onClick={onOpenGuide}
                icon={<IconGuide />}
              />
            )}
            {activeStep !== 'getting_started' && activeStep !== 'interviewer_guide' && (
              <ActiveCard
                eyebrow="Up next · Step 3 of 3"
                title="Capturing your conversations"
                description={`Bring your first conversation${project.subject_name ? ` with ${project.subject_name}` : ''} into the book — upload the audio or paste a transcript, and Grace writes the section.`}
                buttonText="Capture a conversation →"
                onClick={onOpenCapture}
                icon={<IconRecord />}
              />
            )}
          </Section>

          <Section
            barColor={colors.gray}
            title="Your preparation"
            subtitle={!project.getting_started_complete ? '— unlocks after Getting started' : null}
          >
            <CardGrid>
              <LockedCard
                title="Your interviewer guide"
                subtitle="Step 2 of 3"
                icon={<IconGuide />}
                locked={!project.getting_started_complete}
                onClick={project.getting_started_complete ? onOpenGuide : null}
              />
              <LockedCard
                title="Capturing your conversations"
                subtitle="Step 3 of 3"
                icon={<IconRecord />}
                locked={!project.interviewer_guide_complete}
                onClick={project.interviewer_guide_complete ? onOpenCapture : null}
              />
            </CardGrid>
          </Section>

          <Section
            barColor={colors.gray}
            title="Your conversations"
            subtitle={!project.capturing_conversations_complete ? '— unlocks after preparation' : null}
          >
            <CardGrid>
              <LockedCard title="Beginnings" subtitle="Conversation 1" icon={<IconHouse />} locked />
              <LockedCard title="Becoming herself" subtitle="Conversation 2" icon={<IconPerson />} locked />
              <LockedCard title="The life she built" subtitle="Conversation 3" icon={<IconFamily />} locked />
              <LockedCard title="What she came through" subtitle="Conversation 4" icon={<IconReflect />} locked />
              <LockedCard title="Looking back" subtitle="Conversation 5" icon={<IconCross />} locked />
              <LockedCard title="Add a topic" subtitle="Optional · After Conversation 5" icon={<IconPlus />} locked dashed />
            </CardGrid>
          </Section>

          <BookFooter subject={subject} hasContent={!!project.capturing_conversations_complete} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Dashboard sub-components
// ============================================================
function Header({ buyerInitials, buyerName }) {
  return (
    <div style={{
      background: colors.navy,
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{
        fontFamily: fonts.serif,
        fontSize: '17px',
        fontWeight: 500,
        color: 'white',
      }}>
        MyStory<span style={{ color: colors.gold }}>.</span>Family
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {buyerName && (
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>
            {buyerName}
          </div>
        )}
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%',
          background: colors.gold,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 500, color: colors.navy,
        }}>
          {buyerInitials}
        </div>
      </div>
    </div>
  );
}

function Hero({ greeting }) {
  return (
    <div style={{
      position: 'relative',
      height: '240px',
      overflow: 'hidden',
      background: `linear-gradient(135deg, #E8D5B7 0%, #C9A574 50%, #A67B5B 100%)`,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(44,62,80,0.05) 0%, rgba(44,62,80,0.55) 100%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '0 32px 24px',
      }}>
        <p style={{
          fontSize: '12px', color: 'rgba(255,255,255,0.85)',
          margin: '0 0 6px', letterSpacing: '1.5px', textTransform: 'uppercase',
        }}>
          {greeting.eyebrow}
        </p>
        <h1 style={{
          fontFamily: fonts.serif, fontSize: '30px', fontWeight: 500,
          color: 'white', margin: '0 0 6px',
          lineHeight: 1.15, letterSpacing: '-0.5px',
        }}>
          {greeting.heading}
        </h1>
        <p style={{
          fontSize: '14px', color: 'rgba(255,255,255,0.92)',
          margin: 0, lineHeight: 1.5, maxWidth: '460px',
        }}>
          {greeting.body}
        </p>
      </div>
    </div>
  );
}

function ProgressBar({ completed, total }) {
  const pct = (completed / total) * 100;
  return (
    <div style={{
      padding: '24px 24px 18px',
      borderBottom: `0.5px solid ${colors.border}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        <span style={{
          fontSize: '12px', color: colors.textSecondary,
          letterSpacing: '0.5px', textTransform: 'uppercase',
        }}>
          Your progress
        </span>
        <span style={{ fontSize: '13px', color: colors.text, fontWeight: 500 }}>
          {completed} of {total} steps
        </span>
      </div>
      <div style={{
        height: '6px', background: colors.borderSubtle,
        borderRadius: '3px', overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: colors.gold,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}

function Section({ barColor, title, subtitle, children }) {
  return (
    <div style={{ padding: '24px 24px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <div style={{ width: '4px', height: '16px', background: barColor, borderRadius: '2px' }} />
        <h2 style={{
          fontFamily: fonts.serif, fontSize: '18px', fontWeight: 500, margin: 0,
        }}>
          {title}
        </h2>
        {subtitle && (
          <span style={{ fontSize: '12px', color: colors.textTertiary, marginLeft: '4px' }}>
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function ActiveCard({ eyebrow, title, description, buttonText, onClick, icon }) {
  return (
    <div style={{
      background: colors.creamWarm,
      border: `1.5px solid ${colors.gold}`,
      borderRadius: '12px',
      padding: '18px',
      display: 'flex',
      alignItems: 'center',
      gap: '18px',
    }}>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '11px', color: colors.tan, fontWeight: 500,
          letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '4px',
        }}>
          {eyebrow}
        </div>
        <div style={{
          fontFamily: fonts.serif, fontSize: '18px', fontWeight: 500, marginBottom: '4px',
        }}>
          {title}
        </div>
        <div style={{
          fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5, marginBottom: '12px',
        }}>
          {description}
        </div>
        <button onClick={onClick} style={{
          fontSize: '13px', padding: '9px 22px',
          background: colors.navy, color: 'white',
          border: 'none', borderRadius: '999px', cursor: 'pointer',
          fontWeight: 500, fontFamily: 'inherit',
        }}>
          {buttonText}
        </button>
      </div>
    </div>
  );
}

function LockedCard({ title, subtitle, icon, locked, dashed, onClick }) {
  return (
    <div onClick={onClick || undefined} style={{
      background: colors.creamLight,
      border: `0.5px ${dashed ? 'dashed' : 'solid'} ${onClick ? colors.gold : colors.border}`,
      borderRadius: '12px',
      padding: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      opacity: locked ? 0.6 : 1,
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>{title}</div>
        <div style={{ fontSize: '11px', color: colors.textTertiary }}>
          {subtitle}{locked ? ' · Locked' : onClick ? ' · Ready' : ''}
        </div>
      </div>
    </div>
  );
}

function CardGrid({ children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '12px',
    }}>
      {children}
    </div>
  );
}

function BookFooter({ subject, hasContent }) {
  return (
    <div style={{
      borderTop: `0.5px solid ${colors.border}`,
      padding: '20px 24px',
      background: colors.creamLight,
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    }}>
      <IconBook locked={!hasContent} />
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: fonts.serif, fontSize: '16px', fontWeight: 500, marginBottom: '3px',
        }}>
          {subject}'s book
        </div>
        <div style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: 1.5 }}>
          {hasContent
            ? "View what we've captured so far"
            : 'Begins taking shape after your first conversation'}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Getting Started — NEW: seven chunks with plan panel
// ============================================================
function GettingStarted({ project, onProjectUpdate, onReturnToDashboard, onOpenGuide }) {
  const [currentChunk, setCurrentChunk] = useState(1);
  const [chunkStatuses, setChunkStatuses] = useState({});
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState('');
  const [currentProject, setCurrentProject] = useState(project);
  // When a chunk completes, holds that chunk number until the buyer clicks Continue.
  const [awaitingContinue, setAwaitingContinue] = useState(null);
  // True once all seven chunks are finished — shows the completion moment.
  const [allComplete, setAllComplete] = useState(false);
  const [kickstartChunk, setKickstartChunk] = useState(null);
  const messagesEndRef = useRef(null);
  // Always-current mirror of messages, so sendToGrace never reads a stale closure.
  const messagesRef = useRef([]);
  const setMessagesSafe = (updater) => {
    setMessages(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      messagesRef.current = next;
      return next;
    });
  };

  // If a chunk loaded with no Grace message (interrupted transition), prompt her to start it.
  useEffect(() => {
    if (kickstartChunk && !loading) {
      const chunk = kickstartChunk;
      setKickstartChunk(null);
      sendToGrace(null, chunk);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kickstartChunk]);

  // Load existing progress
  useEffect(() => {
    const loadProgress = async () => {
      const { data: chunks } = await supabase
        .from('interview_orientation_chunks')
        .select('*')
        .eq('project_id', project.id)
        .order('chunk_number');

      const { data: msgs } = await supabase
        .from('interview_messages')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at');

      if (chunks) {
        const statusMap = {};
        chunks.forEach(c => { statusMap[c.chunk_number] = c.status; });
        setChunkStatuses(statusMap);

        const firstIncomplete = chunks.find(c => c.status !== 'complete');
        if (firstIncomplete) {
          setCurrentChunk(firstIncomplete.chunk_number);
          setHasStarted(firstIncomplete.chunk_number > 1);
          // If this chunk has no Grace message yet (e.g. interrupted transition),
          // flag it so Grace gets prompted to start it instead of showing a silent input box.
          const chunkHasGraceMsg = (msgs || []).some(
            m => m.chunk_number === firstIncomplete.chunk_number && m.role === 'grace'
          );
          if (firstIncomplete.chunk_number > 1 && !chunkHasGraceMsg) {
            setKickstartChunk(firstIncomplete.chunk_number);
          }
        } else if (chunks.length > 0) {
          setCurrentChunk(7);
          setHasStarted(true);
          // Every chunk is done — show the completion moment rather than a dead input box.
          setAllComplete(true);
        }
      }

      if (msgs) setMessagesSafe(msgs);
    };

    loadProgress();
  }, [project.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Refresh project from DB (used after Grace updates fields)
  const refreshProject = async () => {
    const { data } = await supabase
      .from('interview_projects')
      .select('*')
      .eq('id', project.id)
      .single();
    if (data) {
      setCurrentProject(data);
      onProjectUpdate(data);
    }
  };

  const handleBegin = async () => {
    setHasStarted(true);
    setCurrentChunk(2);

    await supabase.from('interview_orientation_chunks').upsert({
      project_id: project.id,
      chunk_number: 1,
      chunk_name: 'welcome',
      status: 'complete',
      completed_at: new Date().toISOString(),
    }, { onConflict: 'project_id,chunk_number' });

    await supabase.from('interview_orientation_chunks').upsert({
      project_id: project.id,
      chunk_number: 2,
      chunk_name: 'about_you',
      status: 'in_progress',
      started_at: new Date().toISOString(),
    }, { onConflict: 'project_id,chunk_number' });

    setChunkStatuses(prev => ({ ...prev, 1: 'complete', 2: 'in_progress' }));
    await sendToGrace(null, 2);
  };

  const sendToGrace = async (userMessage, chunkNumber) => {
    setLoading(true);
    setError('');

    try {
      if (userMessage) {
        const { data: savedMsg } = await supabase
          .from('interview_messages')
          .insert({
            project_id: project.id,
            chunk_number: chunkNumber,
            role: 'buyer',
            content: userMessage,
          })
          .select()
          .single();

        if (savedMsg) setMessagesSafe(prev => [...prev, savedMsg]);
      }

      const history = messagesRef.current.map(m => ({
        role: m.role === 'grace' ? 'assistant' : 'user',
        content: m.content,
      }));

      if (userMessage) {
        history.push({ role: 'user', content: userMessage });
      } else {
        history.push({
          role: 'user',
          content: `[System: The buyer has just started chunk ${chunkNumber}. Begin this chunk with the framing opener described in your instructions.]`,
        });
      }

      const response = await authedFetch('/api/claude-interview', {
        messages: history,
        project: currentProject,
        currentChunk: chunkNumber,
        mode: 'getting_started',
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      let graceResponse = data.response || data.content || '';

      const isComplete = graceResponse.includes('[CHUNK_COMPLETE]');
      if (isComplete) {
        graceResponse = graceResponse.replace('[CHUNK_COMPLETE]', '').trim();
      }
      // Backstop: strip stray markdown bold markers
      graceResponse = graceResponse.replace(/\*\*/g, '');

      const { data: savedGrace } = await supabase
        .from('interview_messages')
        .insert({
          project_id: project.id,
          chunk_number: chunkNumber,
          role: 'grace',
          content: graceResponse,
        })
        .select()
        .single();

      if (savedGrace) setMessagesSafe(prev => [...prev, savedGrace]);

      // Save structured fields Grace extracted this exchange (drives the plan panel)
      if (data.data && Object.keys(data.data).length > 0) {
        await applyExtractedData(data.data);
      }

      if (isComplete) {
        await supabase.from('interview_orientation_chunks').upsert({
          project_id: project.id,
          chunk_number: chunkNumber,
          chunk_name: CHUNKS[chunkNumber].name,
          status: 'complete',
          completed_at: new Date().toISOString(),
        }, { onConflict: 'project_id,chunk_number' });

        setChunkStatuses(prev => ({ ...prev, [chunkNumber]: 'complete' }));

        if (chunkNumber < TOTAL_CHUNKS) {
          // Do NOT auto-advance. Show a Continue button so the buyer can read
          // Grace's closing message at their own pace, then move on when ready.
          setAwaitingContinue(chunkNumber);
        } else {
          // All chunks complete — mark done and show the completion moment
          await supabase
            .from('interview_projects')
            .update({ getting_started_complete: true, current_step: 'interviewer_guide' })
            .eq('id', project.id);

          const done = { ...currentProject, getting_started_complete: true, current_step: 'interviewer_guide' };
          setCurrentProject(done);
          onProjectUpdate(done);
          setAllComplete(true);
        }
      }
    } catch (err) {
      console.error('Error talking to Grace:', err);
      setError('Something went wrong. Please try again, or come back later — your progress is saved.');
    } finally {
      setLoading(false);
    }
  };

  // Save fields Grace extracted via the API's DATA block. Whitelisted columns only.
  const applyExtractedData = async (extracted) => {
    const ALLOWED = [
      'buyer_name', 'buyer_relationship', 'buyer_motivation',
      'subject_name', 'subject_age', 'subject_living_situation',
      'subject_communication_style', 'subject_one_thing_to_know',
      'sensitivities', 'hopes_territory',
      'logistics_format', 'logistics_cadence', 'logistics_first_conversation',
      'logistics_setting', 'logistics_others', 'logistics_guide_style',
    ];
    const updates = {};
    for (const key of ALLOWED) {
      if (extracted[key] !== undefined && extracted[key] !== null && extracted[key] !== '') {
        updates[key] = key === 'subject_age' ? parseInt(extracted[key]) || null : String(extracted[key]);
      }
    }
    // The plan array is saved to the project_plan JSONB column
    if (Array.isArray(extracted.plan) && extracted.plan.length > 0) {
      updates.project_plan = { conversations: extracted.plan };
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from('interview_projects').update(updates).eq('id', project.id);
      await refreshProject();
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const message = input.trim();
    setInput('');
    await sendToGrace(message, currentChunk);
  };

  const handleSkip = async () => {
    if (loading) return;
    await sendToGrace("[The buyer wants to skip this. Acknowledge gently and move on.]", currentChunk);
  };

  // Buyer clicked "Continue" after reading Grace's closing message for a chunk.
  const handleContinue = async () => {
    const completedChunk = awaitingContinue;
    if (!completedChunk || loading) return;
    const nextChunk = completedChunk + 1;
    setAwaitingContinue(null);
    setCurrentChunk(nextChunk);

    await supabase.from('interview_orientation_chunks').upsert({
      project_id: project.id,
      chunk_number: nextChunk,
      chunk_name: CHUNKS[nextChunk].name,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    }, { onConflict: 'project_id,chunk_number' });

    setChunkStatuses(prev => ({ ...prev, [nextChunk]: 'in_progress' }));
    await sendToGrace(null, nextChunk);
  };

  const buyerName = currentProject.buyer_name || '';
  const welcomeContent = CHUNK_1_WELCOME(buyerName);
  const subjectName = currentProject.subject_name;
  const relationship = currentProject.buyer_relationship;

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.cream,
      fontFamily: fonts.sans,
      color: colors.text,
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 16px' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          overflow: 'hidden',
          border: `0.5px solid ${colors.border}`,
        }}>
          {/* Header */}
          <div style={{
            background: colors.navy,
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button onClick={onReturnToDashboard} style={{
                fontSize: '12px', padding: '5px 10px',
                background: 'rgba(255,255,255,0.1)', color: 'white',
                border: '0.5px solid rgba(255,255,255,0.25)',
                borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {hasStarted ? '← Save & exit' : '← Dashboard'}
              </button>
              <div style={{ fontFamily: fonts.serif, fontSize: '15px', fontWeight: 500, color: 'white' }}>
                MyStory<span style={{ color: colors.gold }}>.</span>Family
              </div>
            </div>
            {hasStarted && (
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                Auto-saved
              </div>
            )}
          </div>

          {/* Step header with named chunk indicator */}
          <div style={{
            padding: '16px 24px',
            background: colors.creamLight,
            borderBottom: `0.5px solid ${colors.border}`,
          }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '11px', color: colors.textTertiary,
                letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '3px',
              }}>
                Step 1 of 3
              </div>
              <div style={{ fontFamily: fonts.serif, fontSize: '16px', fontWeight: 500 }}>
                Getting started
              </div>
            </div>
            <NamedChunkIndicator
              current={currentChunk}
              statuses={chunkStatuses}
              subjectName={subjectName}
              relationship={relationship}
            />
          </div>

          {/* Two-column layout: conversation + plan panel */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 320px',
            gap: 0,
            '@media (max-width: 900px)': {
              gridTemplateColumns: '1fr',
            },
          }} className="getting-started-layout">
            {/* Main conversation area */}
            <div style={{ padding: '36px 32px 32px', minWidth: 0 }}>
              {!hasStarted && (
                <WelcomeScreen
                  welcomeContent={welcomeContent}
                  onBegin={handleBegin}
                />
              )}

              {hasStarted && (
                <ConversationArea
                  chunkStatuses={chunkStatuses}
                  currentChunk={currentChunk}
                  messages={messages}
                  loading={loading}
                  input={input}
                  error={error}
                  onInputChange={setInput}
                  onSubmit={handleSubmit}
                  onSkip={handleSkip}
                  subjectName={subjectName}
                  relationship={relationship}
                  messagesEndRef={messagesEndRef}
                  plan={currentProject.project_plan}
                  awaitingContinue={awaitingContinue}
                  allComplete={allComplete}
                  onOpenGuide={onOpenGuide}
                  subjectNameForDone={currentProject.subject_name}
                  onBackToDashboard={onReturnToDashboard}
                  onContinue={handleContinue}
                />
              )}
            </div>

            {/* Plan-in-progress panel */}
            <PlanPanel
              project={currentProject}
              currentChunk={currentChunk}
              chunkStatuses={chunkStatuses}
            />
          </div>

          {/* Mobile: plan panel collapses below on small screens */}
          <style>{`
            @media (max-width: 900px) {
              .getting-started-layout {
                grid-template-columns: 1fr !important;
              }
              .plan-panel {
                border-left: none !important;
                border-top: 0.5px solid ${colors.border} !important;
              }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Welcome screen (chunk 1, before user clicks "Let's begin")
// ============================================================
function WelcomeScreen({ welcomeContent, onBegin }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <div style={{ width: '4px', height: '16px', background: colors.gold, borderRadius: '2px' }} />
        <div style={{
          fontFamily: fonts.serif, fontSize: '14px', fontWeight: 500,
          color: colors.textSecondary, letterSpacing: '0.3px',
        }}>
          A welcome from Grace
        </div>
      </div>

      <div style={{ display: 'flex', gap: '18px', marginBottom: '28px' }}>
        <GraceAvatar size="large" />
        <div style={{ flex: 1 }}>
          {welcomeContent.map((item, i) => (
            item.type === 'heading' ? (
              <div key={i} style={{
                fontFamily: fonts.serif, fontSize: '22px', fontWeight: 500,
                lineHeight: 1.45, color: colors.text, marginBottom: '16px',
              }}>
                {item.text}
              </div>
            ) : (
              <div key={i} style={{
                fontSize: '16px', lineHeight: 1.7, color: colors.navy, marginBottom: '14px',
              }}>
                {item.text}
              </div>
            )
          ))}
        </div>
      </div>

      <div style={{
        marginTop: '36px', paddingTop: '28px',
        borderTop: `0.5px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '13px', color: colors.textTertiary }}>
          Ready when you are.
        </div>
        <button onClick={onBegin} style={{
          fontSize: '14px', padding: '11px 28px',
          background: colors.navy, color: 'white',
          border: 'none', borderRadius: '999px', cursor: 'pointer',
          fontWeight: 500, fontFamily: 'inherit',
        }}>
          Let's begin →
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Conversation area (chunks 2-7)
// ============================================================
function ConversationArea({
  chunkStatuses, currentChunk, messages, loading, input, error,
  onInputChange, onSubmit, onSkip, subjectName, relationship, messagesEndRef, plan,
  awaitingContinue, onContinue, allComplete, onOpenGuide, subjectNameForDone, onBackToDashboard,
}) {
  const currentChunkLabel = getChunkLabel(currentChunk, subjectName, relationship);
  const currentChunkMessages = messages.filter(m => m.chunk_number === currentChunk);
  const hasGraceMessageThisChunk = currentChunkMessages.some(m => m.role === 'grace');

  return (
    <div>
      {/* Completed chunks as collapsed cards */}
      {[1, 2, 3, 4, 5, 6].filter(n => chunkStatuses[n] === 'complete' && n !== currentChunk).map(n => (
        <CompletedChunkCard key={n} chunkNumber={n} subjectName={subjectName} relationship={relationship} />
      ))}

      {/* Current chunk header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
        <div style={{ width: '4px', height: '16px', background: colors.gold, borderRadius: '2px' }} />
        <div style={{
          fontFamily: fonts.serif, fontSize: '14px', fontWeight: 500,
          color: colors.textSecondary, letterSpacing: '0.3px',
        }}>
          {currentChunkLabel}
        </div>
      </div>

      {/* Messages in current chunk */}
      {messages.filter(m => m.chunk_number === currentChunk).map((msg, i) => (
        <Message key={msg.id || i} message={msg} />
      ))}

      {/* Visual plan cards — rendered when the plan has been proposed (chunk 7) */}
      {currentChunk === 7 && plan?.conversations?.length > 0 && (
        <div style={{ marginLeft: '54px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {plan.conversations.map((c, i) => (
            <PlanRevealCard key={c.number || i} conversation={c} index={i} />
          ))}
        </div>
      )}

      {loading && <TypingIndicator />}

      <div ref={messagesEndRef} />

      {/* Continue button — shown after a chunk completes, lets the buyer read at their pace */}
      {!loading && awaitingContinue === currentChunk && (
        <div style={{
          marginLeft: '54px', marginTop: '24px', paddingTop: '20px',
          borderTop: `0.5px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ fontSize: '13px', color: colors.textTertiary }}>
            Take your time. Continue when you're ready.
          </div>
          <button onClick={onContinue} style={{
            fontSize: '14px', padding: '11px 28px',
            background: colors.navy, color: 'white',
            border: 'none', borderRadius: '999px', cursor: 'pointer',
            fontWeight: 500, fontFamily: 'inherit',
          }}>
            Continue →
          </button>
        </div>
      )}

      {/* Completion moment — all seven chunks done. Hands the buyer to their guide. */}
      {!loading && allComplete && (
        <div style={{
          marginLeft: '54px', marginTop: '28px',
          background: colors.creamWarm,
          border: `1.5px solid ${colors.gold}`,
          borderRadius: '14px',
          padding: '26px 28px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px',
          }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%',
              background: colors.olive, display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M3.5 7l2.5 2.5L10.5 4.5" stroke="white" strokeWidth="2"
                  fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{
              fontSize: '11px', color: colors.tan, fontWeight: 600,
              letterSpacing: '1px', textTransform: 'uppercase',
            }}>
              Getting started · Complete
            </div>
          </div>

          <div style={{
            fontFamily: fonts.serif, fontSize: '22px', fontWeight: 500,
            lineHeight: 1.35, marginBottom: '10px',
          }}>
            You have a plan{subjectNameForDone ? ` for ${subjectNameForDone}'s story` : ''}.
          </div>

          <div style={{
            fontSize: '15px', color: colors.textSecondary, lineHeight: 1.7, marginBottom: '20px',
          }}>
            Your interviewer guide is ready — everything you shared, turned into a plan for your
            first conversation. Read it before you sit down together.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button onClick={onOpenGuide} style={{
              fontSize: '15px', padding: '12px 30px',
              background: colors.navy, color: 'white',
              border: 'none', borderRadius: '999px', cursor: 'pointer',
              fontWeight: 500, fontFamily: 'inherit',
            }}>
              Open your guide →
            </button>
            <button onClick={onBackToDashboard} style={{
              fontSize: '13px', padding: '10px 18px',
              background: 'transparent', border: `0.5px solid ${colors.border}`,
              borderRadius: '999px', cursor: 'pointer',
              color: colors.textSecondary, fontFamily: 'inherit',
            }}>
              Back to dashboard
            </button>
          </div>
        </div>
      )}

      {/* If the chunk has no Grace message yet and nothing is loading, show a waiting
          state instead of a bare input. The kickstart effect will prompt Grace. */}
      {!loading && !allComplete && awaitingContinue !== currentChunk && !hasGraceMessageThisChunk && (
        <div style={{ marginLeft: '54px', marginTop: '20px' }}>
          <TypingIndicator />
        </div>
      )}

      {/* Input form — hidden while awaiting continue, before Grace has spoken, or when done */}
      {!loading && !allComplete && awaitingContinue !== currentChunk && hasGraceMessageThisChunk && (
        <div style={{ marginLeft: '54px', marginTop: '20px' }}>
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Type your answer here..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit();
            }}
            style={{
              width: '100%', minHeight: '110px',
              padding: '14px 16px',
              border: `0.5px solid ${colors.border}`,
              borderRadius: '8px',
              fontFamily: 'inherit', fontSize: '15px',
              lineHeight: 1.6, color: colors.text,
              background: 'white', resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: '14px', flexWrap: 'wrap', gap: '12px',
          }}>
            <button onClick={onSkip} style={{
              fontSize: '13px', padding: '7px 14px',
              background: 'transparent', border: `0.5px solid ${colors.border}`,
              borderRadius: '6px', cursor: 'pointer',
              color: colors.textSecondary, fontFamily: 'inherit',
            }}>
              Skip this one
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: colors.textTertiary }}>
                ⌘+Enter to send
              </span>
              <button onClick={onSubmit} disabled={!input.trim()} style={{
                fontSize: '14px', padding: '9px 22px',
                background: input.trim() ? colors.navy : colors.gray,
                color: 'white', border: 'none',
                borderRadius: '999px',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                fontWeight: 500, fontFamily: 'inherit',
              }}>
                Send
              </button>
            </div>
          </div>
          {error && (
            <div style={{
              marginTop: '12px', padding: '10px 14px',
              background: '#FBE9E7', color: '#B8543D',
              borderRadius: '6px', fontSize: '13px',
            }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Named chunk indicator (replaces numbered dots)
// ============================================================
function NamedChunkIndicator({ current, statuses, subjectName, relationship }) {
  const stepLabels = [
    { num: 1, label: 'Welcome' },
    { num: 2, label: 'You' },
    { num: 3, label: relationship ? `Your ${relationship}` : (subjectName ? subjectName : 'Your mom') },
    { num: 4, label: 'Sensitivities' },
    { num: 5, label: 'Hopes' },
    { num: 6, label: 'Logistics' },
    { num: 7, label: 'Your plan' },
  ];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap',
      gap: '6px',
    }}>
      {stepLabels.map((step, i) => {
        const isComplete = statuses[step.num] === 'complete';
        const isActive = step.num === current;
        const bg = isComplete ? colors.olive : isActive ? colors.navy : 'white';
        const border = isComplete || isActive ? 'none' : `1px solid ${colors.border}`;
        const labelColor = isComplete || isActive ? colors.text : colors.textTertiary;
        const fontWeight = isActive ? 600 : isComplete ? 500 : 400;

        return (
          <React.Fragment key={step.num}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px 4px 4px',
              borderRadius: '999px',
              background: isActive ? colors.creamWarm : 'transparent',
              border: isActive ? `1px solid ${colors.gold}` : '1px solid transparent',
            }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%',
                background: bg, border: border,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 500,
                color: isComplete || isActive ? 'white' : colors.textTertiary,
                flexShrink: 0,
              }}>
                {isComplete ? (
                  <svg width="10" height="10" viewBox="0 0 12 12">
                    <path d="M3 6l2 2 4-4" stroke="white" strokeWidth="1.8"
                      fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : step.num}
              </div>
              <span style={{
                fontSize: '12px',
                fontWeight,
                color: labelColor,
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div style={{
                width: '8px', height: '1px',
                background: isComplete ? colors.olive : colors.border,
                flexShrink: 0,
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ============================================================
// Plan-in-progress panel (NEW)
// ============================================================
function PlanPanel({ project, currentChunk, chunkStatuses }) {
  const subjectName = project.subject_name || 'your mom';
  const subjectLabel = subjectName.charAt(0).toUpperCase() + subjectName.slice(1);

  // Compute how complete the plan is
  const fieldsToTrack = [
    project.buyer_relationship,
    project.buyer_motivation,
    project.subject_name,
    project.subject_age,
    project.subject_communication_style || project.subject_living_situation,
    project.sensitivities,
    project.hopes_territory,
  ];
  const filledFields = fieldsToTrack.filter(f => f && f !== '').length;
  const totalFields = fieldsToTrack.length;
  const planPct = Math.round((filledFields / totalFields) * 100);

  return (
    <div className="plan-panel" style={{
      background: colors.creamLight,
      borderLeft: `0.5px solid ${colors.border}`,
      padding: '32px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    }}>
      {/* Header */}
      <div>
        <div style={{
          fontSize: '11px', color: colors.tan, fontWeight: 500,
          letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px',
        }}>
          Your plan, in progress
        </div>
        <div style={{
          fontFamily: fonts.serif, fontSize: '18px', fontWeight: 500,
          color: colors.text, marginBottom: '12px', lineHeight: 1.3,
        }}>
          {planPct < 30 ? "We're just getting started." :
           planPct < 60 ? "Building your plan." :
           planPct < 90 ? "Almost there." :
           "Your plan is ready."}
        </div>
        <div style={{
          height: '4px', background: colors.borderSubtle,
          borderRadius: '2px', overflow: 'hidden',
        }}>
          <div style={{
            width: `${planPct}%`, height: '100%', background: colors.gold,
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{
          fontSize: '11px', color: colors.textTertiary,
          marginTop: '6px', textAlign: 'right',
        }}>
          {planPct}% complete
        </div>
      </div>

      {/* About them */}
      <PlanSection title={`About ${project.subject_name || 'them'}`} active={currentChunk === 3}>
        <PlanField label="Name" value={project.subject_name} />
        <PlanField label="Age" value={project.subject_age} />
        <PlanField label="Lives" value={project.subject_living_situation} />
        <PlanField label="How they talk" value={project.subject_communication_style} multiline />
      </PlanSection>

      {/* Sensitivities */}
      <PlanSection title="Sensitivities" active={currentChunk === 4}>
        <PlanField label="What to avoid" value={project.sensitivities} multiline />
      </PlanSection>

      {/* Hopes */}
      <PlanSection title="Hopes" active={currentChunk === 5}>
        <PlanField label="Territory to cover" value={project.hopes_territory} multiline />
      </PlanSection>

      {/* Logistics (only if any logistics fields are filled) */}
      {(project.logistics_format || project.logistics_cadence ||
        project.logistics_first_conversation || project.logistics_setting) && (
        <PlanSection title="How we'll do this" active={currentChunk === 6}>
          <PlanField label="Format" value={project.logistics_format} />
          <PlanField label="Cadence" value={project.logistics_cadence} />
          <PlanField label="First one" value={project.logistics_first_conversation} />
          <PlanField label="Where" value={project.logistics_setting} />
        </PlanSection>
      )}

      {currentChunk === 6 && !project.logistics_format && (
        <PlanSection title="How we'll do this" active={true}>
          <div style={{
            fontSize: '12px', color: colors.textTertiary,
            fontStyle: 'italic', lineHeight: 1.5,
          }}>
            Optional — we can plan logistics here or you can figure it out later.
          </div>
        </PlanSection>
      )}

      {/* Conversations preview — generic titles until the plan personalizes them */}
      <PlanSection title="The conversations" active={currentChunk === 7}>
        {(project.project_plan?.conversations?.length > 0
          ? project.project_plan.conversations.map(c => ({
              num: c.number, title: c.title, filled: true,
            }))
          : [
              { num: 1, title: 'Beginnings', filled: false },
              { num: 2, title: 'Becoming herself', filled: false },
              { num: 3, title: 'The life she built', filled: false },
              { num: 4, title: 'What she came through', filled: false },
              { num: 5, title: 'Looking back', filled: false },
            ]
        ).map(c => (
          <ConversationPreview key={c.num} num={c.num} title={c.title} filled={c.filled} />
        ))}
      </PlanSection>
    </div>
  );
}

function PlanSection({ title, active, children }) {
  return (
    <div>
      <div style={{
        fontSize: '11px',
        color: active ? colors.tan : colors.textSecondary,
        fontWeight: 600,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        {active && <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: colors.gold, animation: 'pulse 2s ease-in-out infinite',
        }} />}
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {children}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function PlanField({ label, value, multiline }) {
  const isFilled = value !== null && value !== undefined && value !== '';
  return (
    <div style={{
      fontSize: '13px',
      lineHeight: 1.4,
      display: multiline ? 'block' : 'flex',
      gap: '6px',
      color: isFilled ? colors.text : colors.textTertiary,
    }}>
      <span style={{
        color: colors.textSecondary,
        fontSize: '12px',
        fontWeight: 500,
      }}>
        {label}:
      </span>{' '}
      <span style={{
        color: isFilled ? colors.text : colors.gray,
        fontStyle: isFilled ? 'normal' : 'italic',
      }}>
        {isFilled ? (
          typeof value === 'string' && value.length > 50
            ? value.slice(0, 50) + '…'
            : value
        ) : '—'}
      </span>
    </div>
  );
}

function ConversationPreview({ num, title, filled }) {
  return (
    <div style={{
      fontSize: '13px',
      color: filled ? colors.text : colors.textTertiary,
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
    }}>
      <span style={{
        width: '18px', height: '18px', borderRadius: '50%',
        background: filled ? colors.olive : colors.borderSubtle,
        color: filled ? 'white' : colors.textTertiary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '10px', fontWeight: 500, flexShrink: 0,
      }}>
        {num}
      </span>
      <span>{title}</span>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================
function GraceAvatar({ size = 'small' }) {
  const dim = size === 'large' ? 44 : 36;
  const fontSize = size === 'large' ? 16 : 14;
  return (
    <div style={{
      width: `${dim}px`, height: `${dim}px`, borderRadius: '50%',
      background: '#F4E4C1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      fontFamily: fonts.serif, fontSize: `${fontSize}px`,
      fontWeight: 500, color: colors.tan,
    }}>
      G
    </div>
  );
}

function Message({ message }) {
  if (message.role === 'grace') {
    const cleanContent = message.content.replace(/\*\*/g, '');
    return (
      <div style={{ display: 'flex', gap: '18px', marginBottom: '24px' }}>
        <GraceAvatar />
        <div style={{ flex: 1 }}>
          {cleanContent.split('\n').filter(p => p.trim()).map((para, i) => (
            <div key={i} style={{
              fontSize: '16px', lineHeight: 1.7,
              color: colors.navy,
              marginBottom: '12px',
            }}>
              {para}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginLeft: '54px', marginBottom: '20px' }}>
      <div style={{
        background: colors.creamLight,
        borderLeft: `2px solid ${colors.gold}`,
        padding: '14px 16px',
        borderRadius: '0 8px 8px 0',
        fontSize: '15px',
        lineHeight: 1.6,
        color: colors.text,
        whiteSpace: 'pre-wrap',
      }}>
        {message.content}
      </div>
    </div>
  );
}

// Visual card for each proposed conversation in the chunk 7 plan reveal
// Icons matched to the arc: 1 Beginnings (house), 2 Becoming Herself (person),
// 3 The Life She Built (family), 4 What She Came Through (cross/endurance),
// 5 Looking Back (reflect)
const PLAN_CARD_ICONS = [IconHouse, IconPerson, IconFamily, IconCross, IconReflect];

function PlanRevealCard({ conversation, index }) {
  const Icon = PLAN_CARD_ICONS[index] || IconReflect;
  return (
    <div style={{
      background: colors.creamWarm,
      border: `1px solid ${colors.gold}`,
      borderRadius: '12px',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      animation: `fadeUp 0.4s ease ${index * 0.12}s both`,
    }}>
      <Icon />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '11px', color: colors.tan, fontWeight: 500,
          letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '2px',
        }}>
          Conversation {conversation.number || index + 1}
        </div>
        <div style={{
          fontFamily: fonts.serif, fontSize: '16px', fontWeight: 500,
          color: colors.text, marginBottom: conversation.description ? '3px' : 0,
        }}>
          {conversation.title}
        </div>
        {conversation.description && (
          <div style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: 1.5 }}>
            {conversation.description}
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '18px', marginBottom: '24px' }}>
      <GraceAvatar />
      <div style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '14px 0', color: colors.textTertiary,
      }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: colors.tan,
          animation: 'typingPulse 1.4s ease-in-out infinite',
        }} />
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: colors.tan,
          animation: 'typingPulse 1.4s ease-in-out 0.2s infinite',
        }} />
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: colors.tan,
          animation: 'typingPulse 1.4s ease-in-out 0.4s infinite',
        }} />
        <style>{`
          @keyframes typingPulse {
            0%, 80%, 100% { opacity: 0.3; }
            40% { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}

function CompletedChunkCard({ chunkNumber, subjectName, relationship }) {
  const label = getChunkLabel(chunkNumber, subjectName, relationship);
  return (
    <div style={{
      background: colors.creamLight,
      border: `0.5px solid ${colors.border}`,
      borderRadius: '12px',
      padding: '14px 18px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%',
        background: colors.olive,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M2.5 5l1.5 1.5L7.5 3" stroke="white" strokeWidth="1.5"
            fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ fontFamily: fonts.serif, fontSize: '14px', color: colors.textSecondary }}>
        {label}
      </div>
    </div>
  );
}

// ============================================================
// Interviewer Guide page
// Generates once, saves, loads instantly on return. Print-friendly.
// ============================================================
function InterviewerGuide({ project, onProjectUpdate, onReturnToDashboard }) {
  const CONVERSATION_NUMBER = 1; // Conversation 1 (Beginnings) for now
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(true);

  const subjectName = project.subject_name || 'your loved one';

  // Personalized conversation title from their plan, if available
  const plannedTitle = project.project_plan?.conversations?.find(
    c => Number(c.number) === CONVERSATION_NUMBER
  )?.title;

  useEffect(() => {
    const existingNotes = project.guide_notes?.[String(CONVERSATION_NUMBER)];
    if (existingNotes) setNotes(existingNotes);

    const existing = project.interviewer_guides?.[String(CONVERSATION_NUMBER)];
    if (existing) {
      setGuide(existing);
    } else {
      generateGuide(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save the buyer's own questions (debounced so we're not writing every keystroke)
  useEffect(() => {
    if (notesSaved) return;
    const t = setTimeout(async () => {
      const updated = {
        ...(project.guide_notes || {}),
        [String(CONVERSATION_NUMBER)]: notes,
      };
      await supabase
        .from('interview_projects')
        .update({ guide_notes: updated })
        .eq('id', project.id);
      onProjectUpdate({ ...project, guide_notes: updated });
      setNotesSaved(true);
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, notesSaved]);

  const generateGuide = async (isRegen) => {
    if (isRegen) setRegenerating(true); else setLoading(true);
    setError('');
    try {
      const response = await authedFetch('/api/claude-guide', {
        project,
        conversationNumber: CONVERSATION_NUMBER,
      });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const data = await response.json();
      const text = data.guide;
      if (!text) throw new Error('No guide returned');

      const updatedGuides = {
        ...(project.interviewer_guides || {}),
        [String(CONVERSATION_NUMBER)]: text,
      };

      await supabase
        .from('interview_projects')
        .update({
          interviewer_guides: updatedGuides,
          interviewer_guide_complete: true,
          current_step: 'capturing_conversations',
        })
        .eq('id', project.id);

      setGuide(text);
      onProjectUpdate({
        ...project,
        interviewer_guides: updatedGuides,
        interviewer_guide_complete: true,
        current_step: 'capturing_conversations',
      });
    } catch (err) {
      console.error('Error generating guide:', err);
      setError("We couldn't build your guide just now. Try again in a moment — nothing is lost.");
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: colors.cream,
      fontFamily: fonts.sans, color: colors.text,
    }}>
      <style>{`
        .print-only { display: none; }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .guide-sheet {
            border: none !important; border-radius: 0 !important;
            max-width: 100% !important; box-shadow: none !important;
          }
          .guide-page { padding: 0 !important; background: white !important; }
          .guide-body { padding: 0 !important; }
          .guide-h2 { page-break-after: avoid; }
          p, li { page-break-inside: avoid; }
        }
      `}</style>

      <div className="guide-page" style={{ maxWidth: '760px', margin: '0 auto', padding: '20px 16px 60px' }}>
        <div className="guide-sheet" style={{
          background: 'white', borderRadius: '16px', overflow: 'hidden',
          border: `0.5px solid ${colors.border}`,
        }}>
          {/* Header */}
          <div className="no-print" style={{
            background: colors.navy, padding: '14px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button onClick={onReturnToDashboard} style={{
                fontSize: '12px', padding: '5px 10px',
                background: 'rgba(255,255,255,0.1)', color: 'white',
                border: '0.5px solid rgba(255,255,255,0.25)',
                borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                ← Dashboard
              </button>
              <div style={{ fontFamily: fonts.serif, fontSize: '15px', fontWeight: 500, color: 'white' }}>
                MyStory<span style={{ color: colors.gold }}>.</span>Family
              </div>
            </div>
            {guide && (
              <button onClick={() => window.print()} style={{
                fontSize: '12px', padding: '6px 14px',
                background: colors.gold, color: colors.navy,
                border: 'none', borderRadius: '999px', cursor: 'pointer',
                fontWeight: 600, fontFamily: 'inherit',
              }}>
                Print this guide
              </button>
            )}
          </div>

          {/* Title block */}
          <div style={{
            padding: '28px 32px 22px', background: colors.creamLight,
            borderBottom: `0.5px solid ${colors.border}`,
          }}>
            <div style={{
              fontSize: '11px', color: colors.tan, fontWeight: 600,
              letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px',
            }}>
              Step 2 of 3 · Your interviewer guide
            </div>
            <div style={{
              fontFamily: fonts.serif, fontSize: '26px', fontWeight: 500,
              lineHeight: 1.25, marginBottom: '6px',
            }}>
              Conversation 1 with {subjectName}
            </div>
            <div style={{ fontSize: '15px', color: colors.textSecondary, fontStyle: 'italic' }}>
              {plannedTitle || 'Beginnings'} — where {subjectName} came from, and who shaped {subjectName === 'your loved one' ? 'them' : 'her'}
            </div>
          </div>

          {/* Body */}
          <div className="guide-body" style={{ padding: '32px' }}>
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '14px' }}>
                <TypingIndicator />
                <div style={{ fontSize: '14px', color: colors.textSecondary, textAlign: 'center', maxWidth: '380px', lineHeight: 1.6 }}>
                  Grace is writing your guide from everything you shared. This takes a moment.
                </div>
              </div>
            )}

            {error && !loading && (
              <div style={{ padding: '16px 18px', background: '#FBE9E7', color: '#B8543D', borderRadius: '8px', fontSize: '14px', lineHeight: 1.6 }}>
                {error}
                <div style={{ marginTop: '12px' }}>
                  <button onClick={() => generateGuide(false)} style={{
                    fontSize: '13px', padding: '8px 18px', background: colors.navy,
                    color: 'white', border: 'none', borderRadius: '999px',
                    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
                  }}>
                    Try again
                  </button>
                </div>
              </div>
            )}

            {guide && !loading && <GuideText text={guide} />}

            {/* Your own questions — typed, saved, and printed with the guide */}
            {guide && !loading && (
              <div style={{ marginTop: '38px' }}>
                <div className="guide-h2" style={{
                  display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px',
                }}>
                  <div style={{ width: '4px', height: '20px', background: colors.gold, borderRadius: '2px', flexShrink: 0 }} />
                  <h2 style={{
                    fontFamily: fonts.serif, fontSize: '21px', fontWeight: 500, margin: 0, lineHeight: 1.3,
                  }}>
                    Your own questions
                  </h2>
                </div>

                <p className="no-print" style={{
                  fontSize: '15px', lineHeight: 1.7, color: colors.navy, margin: '0 0 12px',
                }}>
                  Things only you would think to ask. Write them here and they'll be saved,
                  and printed with the guide.
                </p>

                <textarea
                  className="no-print"
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
                  placeholder="Ask about the summer at the lake… Ask what happened to Uncle Ray…"
                  style={{
                    width: '100%', minHeight: '130px', padding: '14px 16px',
                    border: `0.5px solid ${colors.border}`, borderRadius: '10px',
                    fontFamily: 'Georgia, serif', fontSize: '15px', lineHeight: 1.7,
                    color: colors.text, background: 'white', resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
                <div className="no-print" style={{
                  fontSize: '12px', color: colors.textTertiary, marginTop: '6px', textAlign: 'right',
                }}>
                  {notesSaved ? 'Saved' : 'Saving…'}
                </div>

                {/* Print-only: the typed notes as text, plus blank lines to write on */}
                <div className="print-only">
                  {notes.trim() && (
                    <div style={{
                      fontFamily: 'Georgia, serif', fontSize: '16px', lineHeight: 1.8,
                      color: colors.text, whiteSpace: 'pre-wrap', marginBottom: '18px',
                    }}>
                      {notes}
                    </div>
                  )}
                  <div style={{ marginTop: '10px' }}>
                    {[...Array(8)].map((_, i) => (
                      <div key={i} style={{
                        borderBottom: `1px solid ${colors.border}`, height: '30px',
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {guide && !loading && (
              <div className="no-print" style={{
                marginTop: '36px', paddingTop: '24px',
                borderTop: `0.5px solid ${colors.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '12px',
              }}>
                <button onClick={() => generateGuide(true)} disabled={regenerating} style={{
                  fontSize: '13px', padding: '8px 16px', background: 'transparent',
                  border: `0.5px solid ${colors.border}`, borderRadius: '6px',
                  cursor: regenerating ? 'not-allowed' : 'pointer',
                  color: colors.textSecondary, fontFamily: 'inherit',
                }}>
                  {regenerating ? 'Grace is rewriting…' : 'Not quite right? Ask Grace to redo it'}
                </button>
                <button onClick={onReturnToDashboard} style={{
                  fontSize: '14px', padding: '11px 26px', background: colors.navy,
                  color: 'white', border: 'none', borderRadius: '999px',
                  cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit',
                }}>
                  Back to dashboard →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Renders the guide's light markdown (## headings, - bullets, "quotes") warmly.
function GuideText({ text }) {
  const blocks = [];
  const lines = text.split('\n');
  let listBuffer = [];

  const flushList = (key) => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={`ul-${key}`} style={{ margin: '0 0 18px', paddingLeft: '22px' }}>
        {listBuffer.map((item, i) => (
          <li key={i} style={{
            fontSize: '16px', lineHeight: 1.7, color: colors.navy, marginBottom: '7px',
          }}>
            {item}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) { flushList(idx); return; }

    if (line.startsWith('## ')) {
      flushList(idx);
      blocks.push(
        <div key={idx} className="guide-h2" style={{
          display: 'flex', alignItems: 'center', gap: '9px',
          marginTop: blocks.length ? '34px' : 0, marginBottom: '16px',
        }}>
          <div style={{ width: '4px', height: '20px', background: colors.gold, borderRadius: '2px', flexShrink: 0 }} />
          <h2 style={{
            fontFamily: fonts.serif, fontSize: '21px', fontWeight: 500, margin: 0, lineHeight: 1.3,
          }}>
            {line.replace(/^##\s*/, '')}
          </h2>
        </div>
      );
      return;
    }

    if (line.startsWith('# ')) {
      flushList(idx);
      blocks.push(
        <h1 key={idx} style={{
          fontFamily: fonts.serif, fontSize: '24px', fontWeight: 500,
          margin: blocks.length ? '30px 0 14px' : '0 0 14px',
        }}>
          {line.replace(/^#\s*/, '')}
        </h1>
      );
      return;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      listBuffer.push(line.replace(/^[-*]\s*/, ''));
      return;
    }

    flushList(idx);

    // A line that is entirely a quoted script gets the pull-quote treatment
    const isScript = /^["“].*["”]$/.test(line) && line.length > 40;
    if (isScript) {
      blocks.push(
        <div key={idx} style={{
          background: colors.creamWarm,
          borderLeft: `3px solid ${colors.gold}`,
          padding: '16px 20px', borderRadius: '0 8px 8px 0',
          margin: '0 0 20px',
          fontFamily: fonts.serif, fontSize: '17px', lineHeight: 1.65,
          color: colors.text, fontStyle: 'italic',
        }}>
          {line}
        </div>
      );
      return;
    }

    blocks.push(
      <p key={idx} style={{
        fontSize: '16px', lineHeight: 1.75, color: colors.navy, margin: '0 0 16px',
      }}>
        {line}
      </p>
    );
  });

  flushList('end');

  return <div>{blocks}</div>;
}

// ============================================================
// Capture a conversation — two paths in, one section out
// ============================================================
const SAMPLE_TRANSCRIPT = `INTERVIEWER: Mom, tell me about the first house you remember living in.

MOM: Oh, the first one I really remember was on Third Street. We were there until I was, oh, six maybe. It was small. Two bedrooms, and there were four of us kids by then, so my sister and I shared a bed and the boys had the other room. My mother used to say the house had good bones. I didn't know what that meant. I thought she meant there were bones in it somewhere.

INTERVIEWER: That's funny. What do you remember about it?

MOM: The porch. There was a wooden porch out front and in the summer my father would sit out there after supper and just, you know, sit. He worked at the mill and he came home tired. He'd sit out there and not say much. But if you came and sat next to him he'd put his hand on your head. He wasn't a talker, my dad. But he'd do that.

INTERVIEWER: And then you moved?

MOM: We moved a lot. I counted once — eleven times before I was eighteen. My father followed the work. Sometimes it was a better job, sometimes the job just ended. We'd pack up in a day or two. My mother got fast at it. She had a system.

INTERVIEWER: Eleven times. That's a lot.

MOM: It was. I never did unpack that last box. In the last house, I mean, when I was seventeen. There was a box in my room I just left packed. What was the point. Turned out we stayed there four years, longest anywhere, and that box sat there the whole time.

INTERVIEWER: What was that like, moving that much?

MOM: You learn not to make friends too fast. Or — no, that's not right. You learn to make friends fast but not to hold on. That's different. I was good at making friends. I just knew it wouldn't last, so.

INTERVIEWER: You mentioned your mom died when you were young.

MOM: I was eleven. Pneumonia. It came on fast, three or four days. We were in the house on Warren Avenue then. And after that the house just went quiet. My father never talked about her, not once, the rest of his life. Not one time. I used to go in their room and open her drawer just to smell her handkerchiefs, she used lavender. And every year it got a little fainter until one day I opened it and it was just wood. Just the smell of the wood.

INTERVIEWER: Oh, Mom.

MOM: Well. That was a long time ago now.

INTERVIEWER: Who took care of you all after that?

MOM: I did, mostly. I was the oldest girl. My sister was nine and the boys were little. I made the lunches and I did the wash. My father worked. That's what he knew how to do. So I did the rest of it.`;

function CaptureConversation({ project, onProjectUpdate, onReturnToDashboard }) {
  const CONVERSATION_NUMBER = 1;
  const [conversation, setConversation] = useState(null);
  const [mode, setMode] = useState(null);          // null | 'paste' | 'audio'
  const [transcript, setTranscript] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState('');
  const [revisionText, setRevisionText] = useState('');
  const [showRevision, setShowRevision] = useState(false);
  const [loadingRow, setLoadingRow] = useState(true);
  // Audio upload state
  const [audioFile, setAudioFile] = useState(null);
  const [stage, setStage] = useState(null); // 'uploading' | 'transcribing' | 'writing'
  const [uploadPct, setUploadPct] = useState(0);

  const subjectName = project.subject_name || 'your loved one';
  const plannedTitle = project.project_plan?.conversations?.find(
    c => Number(c.number) === CONVERSATION_NUMBER
  )?.title || 'Beginnings';

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('interview_conversations')
        .select('*')
        .eq('project_id', project.id)
        .eq('conversation_number', CONVERSATION_NUMBER)
        .maybeSingle();
      if (data) {
        setConversation(data);
        if (data.transcript) setTranscript(data.transcript);
      }
      setLoadingRow(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const saveRow = async (fields) => {
    const payload = {
      project_id: project.id,
      conversation_number: CONVERSATION_NUMBER,
      title: plannedTitle,
      ...fields,
    };
    const { data, error: err } = await supabase
      .from('interview_conversations')
      .upsert(payload, { onConflict: 'project_id,conversation_number' })
      .select()
      .single();
    if (err) throw err;
    setConversation(data);
    return data;
  };

  const generateDraft = async (revision) => {
    const source = transcript.trim();
    if (!source) { setError('Paste the transcript first.'); return; }
    setDrafting(true);
    setError('');
    try {
      const response = await authedFetch('/api/claude-draft', {
        transcript: source,
        project,
        conversationTitle: plannedTitle,
        revisionRequest: revision || null,
        existingDraft: revision ? conversation?.draft : null,
      });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const data = await response.json();
      if (!data.draft) throw new Error('No draft returned');

      await saveRow({
        transcript: source,
        transcript_source: 'pasted',
        draft: data.draft,
        draft_generated_at: new Date().toISOString(),
        status: 'drafted',
        approved: false,
      });
      setShowRevision(false);
      setRevisionText('');
    } catch (err) {
      console.error('Draft error:', err);
      setError("We couldn't write the section just now. Your transcript is saved — try again in a moment.");
    } finally {
      setDrafting(false);
    }
  };

  // Upload audio → transcribe → draft, in one flow.
  const processAudio = async () => {
    if (!audioFile) { setError('Choose your recording first.'); return; }
    setError('');
    setDrafting(true);
    setStage('uploading');
    setUploadPct(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const ext = (audioFile.name.split('.').pop() || 'm4a').toLowerCase();
      const path = `${user.id}/${project.id}-conv${CONVERSATION_NUMBER}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('conversation-audio')
        .upload(path, audioFile, { upsert: true, contentType: audioFile.type || undefined });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

      setUploadPct(100);
      setStage('transcribing');

      // Signed URL so Deepgram can fetch the private file
      const { data: signed, error: signErr } = await supabase.storage
        .from('conversation-audio')
        .createSignedUrl(path, 3600);
      if (signErr || !signed?.signedUrl) throw new Error('Could not prepare the file');

      const tRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: signed.signedUrl }),
      });
      if (!tRes.ok) {
        const d = await tRes.json().catch(() => ({}));
        throw new Error(d.details || d.error || 'Transcription failed');
      }
      const tData = await tRes.json();
      const text = (tData.transcript || '').trim();
      if (!text) throw new Error('The recording came back empty — check the file plays back with sound.');

      setTranscript(text);
      await saveRow({
        transcript: text,
        transcript_source: 'audio',
        audio_path: path,
        status: 'captured',
      });

      setStage('writing');

      const dRes = await authedFetch('/api/claude-draft', {
        transcript: text,
        project,
        conversationTitle: plannedTitle,
      });
      if (!dRes.ok) throw new Error(`Drafting failed (${dRes.status})`);
      const dData = await dRes.json();
      if (!dData.draft) throw new Error('No draft returned');

      await saveRow({
        transcript: text,
        transcript_source: 'audio',
        audio_path: path,
        draft: dData.draft,
        draft_generated_at: new Date().toISOString(),
        status: 'drafted',
        approved: false,
      });
    } catch (err) {
      console.error('Audio flow error:', err);
      setError(err.message || "Something went wrong. Your recording may have saved — try again in a moment.");
    } finally {
      setDrafting(false);
      setStage(null);
    }
  };

  const approveDraft = async () => {
    try {
      await saveRow({
        transcript: transcript.trim(),
        transcript_source: 'pasted',
        draft: conversation.draft,
        status: 'approved',
        approved: true,
        approved_at: new Date().toISOString(),
      });
      await supabase
        .from('interview_projects')
        .update({ capturing_conversations_complete: true })
        .eq('id', project.id);
      onProjectUpdate({ ...project, capturing_conversations_complete: true });
    } catch (err) {
      console.error(err);
      setError('Could not save your approval. Try again.');
    }
  };

  const hasDraft = conversation?.draft;

  return (
    <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: fonts.sans, color: colors.text }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .cap-sheet { border: none !important; border-radius: 0 !important; }
        }
      `}</style>
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '20px 16px 60px' }}>
        <div className="cap-sheet" style={{
          background: 'white', borderRadius: '16px', overflow: 'hidden',
          border: `0.5px solid ${colors.border}`,
        }}>
          {/* Header */}
          <div className="no-print" style={{
            background: colors.navy, padding: '14px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button onClick={onReturnToDashboard} style={{
                fontSize: '12px', padding: '5px 10px',
                background: 'rgba(255,255,255,0.1)', color: 'white',
                border: '0.5px solid rgba(255,255,255,0.25)',
                borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                ← Dashboard
              </button>
              <div style={{ fontFamily: fonts.serif, fontSize: '15px', fontWeight: 500, color: 'white' }}>
                MyStory<span style={{ color: colors.gold }}>.</span>Family
              </div>
            </div>
            {hasDraft && (
              <button onClick={() => window.print()} style={{
                fontSize: '12px', padding: '6px 14px', background: colors.gold,
                color: colors.navy, border: 'none', borderRadius: '999px',
                cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
              }}>
                Print this section
              </button>
            )}
          </div>

          {/* Title */}
          <div style={{
            padding: '26px 32px 20px', background: colors.creamLight,
            borderBottom: `0.5px solid ${colors.border}`,
          }}>
            <div style={{
              fontSize: '11px', color: colors.tan, fontWeight: 600,
              letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px',
            }}>
              Conversation 1 · {conversation?.approved ? 'Approved' : hasDraft ? 'Draft ready' : 'Capture'}
            </div>
            <div style={{ fontFamily: fonts.serif, fontSize: '25px', fontWeight: 500, lineHeight: 1.25 }}>
              {plannedTitle}
            </div>
            <div style={{ fontSize: '14px', color: colors.textSecondary, marginTop: '5px' }}>
              {subjectName}'s story, as told to {project.buyer_name || 'you'}
            </div>
          </div>

          <div style={{ padding: '32px' }}>
            {loadingRow && (
              <div style={{ color: colors.textSecondary, fontSize: '14px' }}>Loading…</div>
            )}

            {/* ---------- Draft view ---------- */}
            {!loadingRow && hasDraft && (
              <div>
                {conversation.approved && (
                  <div className="no-print" style={{
                    background: colors.creamWarm, border: `1px solid ${colors.olive}`,
                    borderRadius: '10px', padding: '12px 16px', marginBottom: '24px',
                    fontSize: '14px', color: colors.text,
                  }}>
                    This section is approved and part of {subjectName}'s book.
                  </div>
                )}

                <SectionProse text={conversation.draft} />

                {drafting && (
                  <div className="no-print" style={{ marginTop: '24px' }}>
                    <TypingIndicator />
                  </div>
                )}

                {!drafting && (
                  <div className="no-print" style={{
                    marginTop: '36px', paddingTop: '24px',
                    borderTop: `0.5px solid ${colors.border}`,
                  }}>
                    {!showRevision && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: '12px',
                      }}>
                        <button onClick={() => setShowRevision(true)} style={{
                          fontSize: '13px', padding: '9px 16px', background: 'transparent',
                          border: `0.5px solid ${colors.border}`, borderRadius: '999px',
                          cursor: 'pointer', color: colors.textSecondary, fontFamily: 'inherit',
                        }}>
                          Ask Grace for a change
                        </button>
                        {!conversation.approved ? (
                          <button onClick={approveDraft} style={{
                            fontSize: '15px', padding: '12px 30px', background: colors.navy,
                            color: 'white', border: 'none', borderRadius: '999px',
                            cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit',
                          }}>
                            Approve this section →
                          </button>
                        ) : (
                          <button onClick={onReturnToDashboard} style={{
                            fontSize: '15px', padding: '12px 30px', background: colors.navy,
                            color: 'white', border: 'none', borderRadius: '999px',
                            cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit',
                          }}>
                            Back to dashboard →
                          </button>
                        )}
                      </div>
                    )}

                    {showRevision && (
                      <div>
                        <div style={{
                          fontSize: '13px', color: colors.textSecondary, marginBottom: '10px', lineHeight: 1.6,
                        }}>
                          What would you like different? For example: "use more of her actual words,"
                          "this part about her father should come first," or "it's too long."
                        </div>
                        <textarea
                          value={revisionText}
                          onChange={(e) => setRevisionText(e.target.value)}
                          placeholder="Tell Grace what to change…"
                          style={{
                            width: '100%', minHeight: '90px', padding: '13px 15px',
                            border: `0.5px solid ${colors.border}`, borderRadius: '8px',
                            fontFamily: 'inherit', fontSize: '15px', lineHeight: 1.6,
                            color: colors.text, background: 'white', resize: 'vertical',
                            boxSizing: 'border-box',
                          }}
                        />
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          marginTop: '12px', flexWrap: 'wrap',
                        }}>
                          <button onClick={() => generateDraft(revisionText.trim())}
                            disabled={!revisionText.trim()}
                            style={{
                              fontSize: '14px', padding: '10px 24px',
                              background: revisionText.trim() ? colors.navy : colors.gray,
                              color: 'white', border: 'none', borderRadius: '999px',
                              cursor: revisionText.trim() ? 'pointer' : 'not-allowed',
                              fontWeight: 500, fontFamily: 'inherit',
                            }}>
                            Rewrite it
                          </button>
                          <button onClick={() => { setShowRevision(false); setRevisionText(''); }} style={{
                            fontSize: '13px', padding: '9px 16px', background: 'transparent',
                            border: 'none', cursor: 'pointer', color: colors.textTertiary,
                            fontFamily: 'inherit',
                          }}>
                            Never mind
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ---------- Capture view ---------- */}
            {!loadingRow && !hasDraft && (
              <div>
                {drafting ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '40px 0', gap: '14px',
                  }}>
                    <TypingIndicator />
                    <div style={{
                      fontSize: '14px', color: colors.textSecondary, textAlign: 'center',
                      maxWidth: '400px', lineHeight: 1.6,
                    }}>
                      {stage === 'uploading'
                        ? 'Uploading your recording. Keep this page open — larger files take a minute.'
                        : stage === 'transcribing'
                        ? "Turning the recording into text. This is the slow part — a long conversation can take a few minutes."
                        : `Grace is reading your conversation and writing ${subjectName}'s section. This takes a minute — it's a lot of words to work through.`}
                    </div>
                  </div>
                ) : (
                  <div>
                    {!mode && (
                      <div>
                        <div style={{
                          fontSize: '16px', lineHeight: 1.7, color: colors.navy, marginBottom: '26px',
                        }}>
                          You've had the conversation. Now let's bring it into the book.
                          Two ways to do that — whichever fits how you recorded it.
                        </div>
                        <CardGrid>
                          <CapturePathCard
                            icon={<IconRecord />}
                            title="Upload the audio"
                            body="You recorded the conversation on your phone. Upload the file and we'll turn it into text for you."
                            note="Ready"
                            onClick={() => setMode('audio')}
                          />
                          <CapturePathCard
                            icon={<IconGuide />}
                            title="Paste a transcript"
                            body="You already have text — from Zoom, Otter, your phone's transcription, or notes you typed."
                            note="Ready"
                            onClick={() => setMode('paste')}
                          />
                        </CardGrid>
                      </div>
                    )}

                    {mode === 'paste' && (
                      <div>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px',
                        }}>
                          <div style={{ width: '4px', height: '16px', background: colors.gold, borderRadius: '2px' }} />
                          <div style={{
                            fontFamily: fonts.serif, fontSize: '15px', fontWeight: 500, color: colors.textSecondary,
                          }}>
                            Paste your transcript
                          </div>
                        </div>
                        <div style={{
                          fontSize: '14px', color: colors.textSecondary, lineHeight: 1.65, marginBottom: '14px',
                        }}>
                          Don't worry about tidying it up. Speaker labels, timestamps, false starts —
                          Grace handles all of it. Paste it exactly as it came.
                        </div>
                        <textarea
                          value={transcript}
                          onChange={(e) => setTranscript(e.target.value)}
                          placeholder="Paste the conversation here…"
                          style={{
                            width: '100%', minHeight: '300px', padding: '15px 17px',
                            border: `0.5px solid ${colors.border}`, borderRadius: '10px',
                            fontFamily: 'Georgia, serif', fontSize: '15px', lineHeight: 1.7,
                            color: colors.text, background: 'white', resize: 'vertical',
                            boxSizing: 'border-box',
                          }}
                        />
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          marginTop: '14px', flexWrap: 'wrap', gap: '12px',
                        }}>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button onClick={() => setMode(null)} style={{
                              fontSize: '13px', padding: '9px 15px', background: 'transparent',
                              border: `0.5px solid ${colors.border}`, borderRadius: '999px',
                              cursor: 'pointer', color: colors.textSecondary, fontFamily: 'inherit',
                            }}>
                              ← Back
                            </button>
                            <button onClick={() => setTranscript(SAMPLE_TRANSCRIPT)} style={{
                              fontSize: '13px', padding: '9px 15px', background: 'transparent',
                              border: `0.5px dashed ${colors.border}`, borderRadius: '999px',
                              cursor: 'pointer', color: colors.textTertiary, fontFamily: 'inherit',
                            }}>
                              Load a sample
                            </button>
                          </div>
                          <button onClick={() => generateDraft(null)} disabled={!transcript.trim()}
                            style={{
                              fontSize: '15px', padding: '12px 28px',
                              background: transcript.trim() ? colors.navy : colors.gray,
                              color: 'white', border: 'none', borderRadius: '999px',
                              cursor: transcript.trim() ? 'pointer' : 'not-allowed',
                              fontWeight: 500, fontFamily: 'inherit',
                            }}>
                            Write the section →
                          </button>
                        </div>
                      </div>
                    )}

                    {mode === 'audio' && (
                      <div>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px',
                        }}>
                          <div style={{ width: '4px', height: '16px', background: colors.gold, borderRadius: '2px' }} />
                          <div style={{
                            fontFamily: fonts.serif, fontSize: '15px', fontWeight: 500, color: colors.textSecondary,
                          }}>
                            Upload your recording
                          </div>
                        </div>

                        <div style={{
                          background: colors.creamLight, border: `0.5px solid ${colors.border}`,
                          borderRadius: '10px', padding: '18px 20px', marginBottom: '20px',
                        }}>
                          <div style={{
                            fontSize: '13px', fontWeight: 600, color: colors.tan,
                            letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '10px',
                          }}>
                            How to record
                          </div>
                          <div style={{ fontSize: '14.5px', color: colors.navy, lineHeight: 1.7 }}>
                            Use the voice recorder already on your phone — Voice Memos on an iPhone,
                            Recorder on most Android phones. Set the phone on the table between you,
                            screen up, and start it before you begin talking.
                            <br /><br />
                            A few things that help: keep the phone within a couple of feet of both of
                            you, put it on something soft rather than a hard table if you can, and
                            silence notifications first. When you're done, share the file to yourself
                            and upload it here.
                          </div>
                        </div>

                        <label style={{
                          display: 'block', border: `1.5px dashed ${colors.border}`,
                          borderRadius: '12px', padding: '28px 20px', textAlign: 'center',
                          cursor: 'pointer', background: audioFile ? colors.creamWarm : 'white',
                        }}>
                          <input
                            type="file"
                            accept="audio/*,.m4a,.mp3,.wav,.aac,.mp4,.mov"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) { setAudioFile(f); setError(''); }
                            }}
                          />
                          {audioFile ? (
                            <div>
                              <div style={{
                                fontFamily: fonts.serif, fontSize: '17px', fontWeight: 500, marginBottom: '4px',
                              }}>
                                {audioFile.name}
                              </div>
                              <div style={{ fontSize: '13px', color: colors.textSecondary }}>
                                {(audioFile.size / (1024 * 1024)).toFixed(1)} MB · tap to choose a different file
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{
                                fontFamily: fonts.serif, fontSize: '17px', fontWeight: 500, marginBottom: '4px',
                              }}>
                                Choose your recording
                              </div>
                              <div style={{ fontSize: '13px', color: colors.textSecondary }}>
                                m4a, mp3, wav — most phone recordings work
                              </div>
                            </div>
                          )}
                        </label>

                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          marginTop: '16px', flexWrap: 'wrap', gap: '12px',
                        }}>
                          <button onClick={() => { setMode(null); setAudioFile(null); }} style={{
                            fontSize: '13px', padding: '9px 15px', background: 'transparent',
                            border: `0.5px solid ${colors.border}`, borderRadius: '999px',
                            cursor: 'pointer', color: colors.textSecondary, fontFamily: 'inherit',
                          }}>
                            ← Back
                          </button>
                          <button onClick={processAudio} disabled={!audioFile} style={{
                            fontSize: '15px', padding: '12px 28px',
                            background: audioFile ? colors.navy : colors.gray,
                            color: 'white', border: 'none', borderRadius: '999px',
                            cursor: audioFile ? 'pointer' : 'not-allowed',
                            fontWeight: 500, fontFamily: 'inherit',
                          }}>
                            Upload and write the section →
                          </button>
                        </div>

                        <div style={{
                          fontSize: '12.5px', color: colors.textTertiary,
                          marginTop: '14px', lineHeight: 1.6,
                        }}>
                          Long recordings take a few minutes to process. Keep this page open while
                          it works — you'll see the section when it's ready.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="no-print" style={{
                marginTop: '18px', padding: '13px 16px', background: '#FBE9E7',
                color: '#B8543D', borderRadius: '8px', fontSize: '14px', lineHeight: 1.6,
              }}>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CapturePathCard({ icon, title, body, note, onClick, disabled }) {
  return (
    <div onClick={disabled ? undefined : onClick} style={{
      background: disabled ? colors.creamLight : colors.creamWarm,
      border: `1px solid ${disabled ? colors.border : colors.gold}`,
      borderRadius: '12px', padding: '20px',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.65 : 1,
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flexShrink: 0 }}>{icon}</div>
        <div>
          <div style={{ fontFamily: fonts.serif, fontSize: '17px', fontWeight: 500 }}>{title}</div>
          <div style={{
            fontSize: '10.5px', color: colors.tan, fontWeight: 600,
            letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: '2px',
          }}>
            {note}
          </div>
        </div>
      </div>
      <div style={{ fontSize: '13.5px', color: colors.textSecondary, lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}

// Renders the drafted section as book prose.
function SectionProse({ text }) {
  const paras = text.split('\n').map(p => p.trim()).filter(Boolean);
  return (
    <div style={{ fontFamily: 'Georgia, serif' }}>
      {paras.map((p, i) => (
        <p key={i} style={{
          fontSize: '17px', lineHeight: 1.8, color: colors.text,
          margin: i === 0 ? '0 0 18px' : '0 0 18px',
          textIndent: i === 0 ? 0 : '1.4em',
        }}>
          {p}
        </p>
      ))}
    </div>
  );
}

// ============================================================
// Icons
// ============================================================
function IconGetting() {
  return (
    <svg width="68" height="68" viewBox="0 0 68 68">
      <circle cx="34" cy="34" r="34" fill="#F4E4C1"/>
      <circle cx="26" cy="28" r="7" fill={colors.tan}/>
      <circle cx="42" cy="28" r="7" fill={colors.tan}/>
      <path d="M 18 44 Q 26 50 34 48 Q 42 50 50 44" stroke={colors.olive}
        strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M 30 38 Q 34 41 38 38" stroke={colors.tan} strokeWidth="1.5"
        fill="none" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}

function IconGuide() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="24" fill={colors.borderSubtle}/>
      <rect x="14" y="14" width="20" height="20" rx="2" fill={colors.gray}/>
      <line x1="18" y1="20" x2="30" y2="20" stroke={colors.creamLight} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="18" y1="24" x2="30" y2="24" stroke={colors.creamLight} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="18" y1="28" x2="26" y2="28" stroke={colors.creamLight} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconRecord() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="24" fill={colors.borderSubtle}/>
      <rect x="20" y="14" width="8" height="14" rx="3" fill={colors.gray}/>
      <path d="M 16 26 Q 16 32 24 32 Q 32 32 32 26" stroke={colors.gray} strokeWidth="2" fill="none"/>
      <line x1="24" y1="32" x2="24" y2="36" stroke={colors.gray} strokeWidth="2"/>
      <line x1="20" y1="36" x2="28" y2="36" stroke={colors.gray} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconHouse() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="24" fill={colors.borderSubtle}/>
      <rect x="14" y="20" width="20" height="14" rx="1" fill={colors.gray}/>
      <polygon points="14,20 24,13 34,20" fill="#A8987F"/>
      <rect x="21" y="26" width="6" height="8" fill={colors.creamLight}/>
    </svg>
  );
}

function IconPerson() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="24" fill={colors.borderSubtle}/>
      <path d="M 16 32 L 16 22 Q 16 16 24 16 Q 32 16 32 22 L 32 32" stroke={colors.gray} strokeWidth="2" fill="none"/>
      <circle cx="24" cy="22" r="3" fill={colors.gray}/>
      <path d="M 18 36 Q 24 32 30 36" stroke="#A8987F" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function IconCross() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="24" fill={colors.borderSubtle}/>
      <path d="M 24 12 L 24 36 M 16 20 L 32 20" stroke={colors.gray} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M 20 28 Q 24 32 28 28" stroke="#A8987F" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function IconFamily() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="24" fill={colors.borderSubtle}/>
      <circle cx="19" cy="22" r="4" fill={colors.gray}/>
      <circle cx="29" cy="22" r="4" fill={colors.gray}/>
      <path d="M 14 34 Q 19 28 24 30 Q 29 28 34 34" stroke="#A8987F" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function IconReflect() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="24" fill={colors.borderSubtle}/>
      <circle cx="18" cy="20" r="4" fill={colors.gray}/>
      <circle cx="30" cy="20" r="4" fill={colors.gray}/>
      <circle cx="24" cy="32" r="4" fill={colors.gray}/>
      <line x1="18" y1="20" x2="24" y2="32" stroke="#A8987F" strokeWidth="1.5"/>
      <line x1="30" y1="20" x2="24" y2="32" stroke="#A8987F" strokeWidth="1.5"/>
      <line x1="18" y1="20" x2="30" y2="20" stroke="#A8987F" strokeWidth="1.5"/>
    </svg>
  );
}

function IconPlus() {
  return (
    <div style={{
      width: '48px', height: '48px', borderRadius: '50%',
      background: colors.borderSubtle,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="20" height="20" viewBox="0 0 20 20">
        <path d="M10 4v12M4 10h12" stroke="#A8987F" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function IconBook({ locked }) {
  const fill = locked ? colors.gray : colors.tan;
  const stripe = locked ? '#E0D4BC' : '#D4C4A8';
  return (
    <svg width="56" height="68" viewBox="0 0 56 68" style={{ flexShrink: 0, opacity: locked ? 0.55 : 1 }}>
      <rect x="6" y="4" width="44" height="60" rx="2" fill={fill}/>
      <rect x="10" y="8" width="36" height="52" rx="1" fill="#FFFBF5"/>
      <line x1="14" y1="18" x2="42" y2="18" stroke={stripe} strokeWidth="1"/>
      <line x1="14" y1="24" x2="42" y2="24" stroke={stripe} strokeWidth="1"/>
      <line x1="14" y1="30" x2="38" y2="30" stroke={stripe} strokeWidth="1"/>
    </svg>
  );
}
