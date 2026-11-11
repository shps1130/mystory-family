// Magazine.jsx
// MyStory.Family — ISSUE MODEL dashboard and Getting Started flow.
// Lives at /magazine on mystory.family. Interview.jsx (/interview) is untouched.
//
// Stage 1 of the magazine frontend:
//   - Sign-in, entitlement check, project bootstrap (format = 'issue')
//   - Dashboard: the contents page filling in + four session cards
//   - Getting Started: Grace's seven chunks against /api/claude-magazine,
//     with a Contents panel instead of a plan panel
//   - Session guide: /api/claude-guide-magazine, saved per session
// Stage 2 (next file): capture a session — photos, audio, transcript,
//   pieces review — and the assembled issue.

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
// Brand palette (same as Interview.jsx)
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
  red: '#8B2E1F',
};

const fonts = {
  serif: '"Playfair Display", Georgia, "Times New Roman", serif',
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

// ============================================================
// Chunks — same seven as the arc product; 5 and 7 mean something new
// ============================================================
const TOTAL_SESSIONS = 4;

// The departments of every issue. Order = contents-page order. Titles are
// pronoun-neutral here; Grace personalizes them in chunk 7.
const DEPARTMENTS = [
  { id: 'feature',         title: 'The Feature',               always: true },
  { id: 'family_stories',  title: 'Family Stories',            always: true },
  { id: 'sayings',         title: 'Things They Always Said',   always: false },
  { id: 'laughter',        title: 'Laughter, Around Our Table', always: false },
  { id: 'shoebox',         title: 'From the Shoebox',          always: true },
  { id: 'kitchen',         title: 'From Their Kitchen',        always: false },
  { id: 'know_now',        title: 'What I Know Now',           always: true },
  { id: 'faith',           title: 'Faith',                     always: false },
  { id: 'until_next_time', title: 'Until Next Time',           always: true },
];

const DEFAULT_SESSION_TITLES = {
  1: 'The Shoebox',
  2: 'The Feature',
  3: 'Around Our Table',
  4: 'What I Know Now',
};

function sessionTitle(project, n) {
  const planned = project?.issue_plan?.sessions?.find(s => Number(s.number) === Number(n))?.title;
  return planned || DEFAULT_SESSION_TITLES[n] || `Session ${n}`;
}

// Pronoun helpers for department titles before Grace personalizes them.
function possessive(relationship) {
  const r = (relationship || '').toLowerCase();
  if (['mom', 'mother', 'grandma', 'grandmother', 'aunt', 'wife', 'sister'].some(k => r.includes(k))) return 'Her';
  if (['dad', 'father', 'grandpa', 'grandfather', 'uncle', 'husband', 'brother'].some(k => r.includes(k))) return 'His';
  return 'Their';
}
function subjectPronoun(relationship) {
  const p = possessive(relationship);
  return p === 'Her' ? 'She' : p === 'His' ? 'He' : 'They';
}
function departmentTitle(dept, project) {
  const planned = project?.issue_plan?.departments?.find(d => d?.id === dept.id)?.title;
  if (planned) return planned;
  const renamed = project?.department_titles?.[dept.id];
  if (renamed) return renamed;
  const rel = project?.buyer_relationship;
  if (dept.id === 'sayings') return `Things ${subjectPronoun(rel)} Always Said`;
  if (dept.id === 'kitchen') return `From ${possessive(rel)} Kitchen`;
  return dept.title;
}

// Which departments are in this issue right now: the plan if it exists,
// otherwise the always-on ones plus whatever chunk 5 has said yes/some to.
function activeDepartments(project) {
  const plan = project?.issue_plan?.departments;
  if (Array.isArray(plan) && plan.length) {
    return plan.map(d => ({ id: d.id, title: d.title || departmentTitle(DEPARTMENTS.find(x => x.id === d.id) || { id: d.id, title: d.id }, project), target: d.target || null, state: 'planned' }));
  }
  const answers = (project?.departments && typeof project.departments === 'object') ? project.departments : {};
  const standard = DEPARTMENTS.map(d => {
    const a = (answers[d.id] || '').toString().toLowerCase();
    let state = 'unknown';
    if (d.always) state = 'in';
    if (a === 'yes' || a === 'some' || a === 'threaded') state = 'in';
    if (a === 'no') state = 'out';
    if (d.id === 'faith' && a === 'threaded') state = 'threaded';
    if (d.id === 'shoebox' && (project?.has_photos || '').toLowerCase().startsWith('no')) state = 'out';
    return { id: d.id, title: departmentTitle(d, project), target: null, state };
  });
  // Pages the buyer invented sit after Family Stories, before the small departments.
  const custom = (Array.isArray(project?.custom_departments) ? project.custom_departments : [])
    .filter(c => c && c.id)
    .map(c => ({ id: c.id, title: c.title || c.id, target: null, state: 'in', custom: true }));
  if (!custom.length) return standard;
  const idx = standard.findIndex(d => d.id === 'family_stories');
  return [...standard.slice(0, idx + 1), ...custom, ...standard.slice(idx + 1)];
}

// Account names arrive as "timothy" when they came from an email address.
function prettyName(name) {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  if (/[A-Z]/.test(trimmed)) return trimmed;
  return trimmed.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ============================================================
// Authenticated fetch
// ============================================================
async function authedFetch(url, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401 || res.status === 402) {
    window.location.reload();
    throw new Error('Session or access changed — reloading.');
  }
  return res;
}

// ============================================================
// Main Magazine app
// ============================================================
export default function Magazine() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [view, setView] = useState('dashboard');
  const [entitled, setEntitled] = useState(null);
  const [activeSession, setActiveSession] = useState(1);

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

    const bootstrap = async () => {
      const { error: claimError } = await supabase.rpc('claim_entitlements');
      if (claimError) console.error('Entitlement claim failed:', claimError);

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
      if (!hasAccess) return;

      // Load the ISSUE project only. An arc project in the same account is
      // left alone — the two products never share a project row.
      const { data: projects, error } = await supabase
        .from('interview_projects')
        .select('*')
        .eq('user_id', user.id)
        .eq('format', 'issue')
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
        .insert({ user_id: user.id, buyer_name: buyerName, format: 'issue' })
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

  const openSession = (n, nextView) => {
    const parsed = Number(n);
    const valid = Number.isInteger(parsed) && parsed >= 1 && parsed <= TOTAL_SESSIONS;
    setActiveSession(valid ? parsed : 1);
    setView(nextView);
  };

  if (authLoading) return <LoadingScreen />;
  if (!user) return <SignInScreen />;
  if (entitled === null) return <LoadingScreen message="Checking your account..." />;
  if (!entitled) {
    return <InterviewPaywall userEmail={user.email} onSignOut={() => supabase.auth.signOut()} />;
  }
  if (!project) return <LoadingScreen message="Setting up your issue..." />;

  if (view === 'getting_started') {
    return (
      <GettingStarted
        project={project}
        onProjectUpdate={setProject}
        onReturnToDashboard={() => setView('dashboard')}
        onOpenGuide={() => openSession(1, 'guide')}
      />
    );
  }

  if (view === 'guide') {
    return (
      <SessionGuide
        project={project}
        sessionNumber={activeSession}
        onProjectUpdate={setProject}
        onReturnToDashboard={() => setView('dashboard')}
        onOpenCapture={() => openSession(activeSession, 'capture')}
      />
    );
  }

  if (view === 'capture') {
    return (
      <CaptureSession
        project={project}
        sessionNumber={activeSession}
        onProjectUpdate={setProject}
        onReturnToDashboard={() => setView('dashboard')}
        onOpenGuide={(n) => openSession(n, 'guide')}
      />
    );
  }

  if (view === 'issue') {
    return (
      <IssueView
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
      onOpenGuide={(n) => openSession(n, 'guide')}
      onOpenCapture={(n) => openSession(n, 'capture')}
      onOpenIssue={() => setView('issue')}
    />
  );
}

// ============================================================
// Loading / sign-in
// ============================================================
function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div style={{
      minHeight: '100vh', background: colors.cream,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: fonts.sans, color: colors.textSecondary,
    }}>
      {message}
    </div>
  );
}

function SignInScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const justPurchased = new URLSearchParams(window.location.search).get('purchase') === 'success';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div style={{
      minHeight: '100vh', background: colors.cream,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: fonts.sans, padding: '2rem',
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '40px',
        maxWidth: '440px', width: '100%', border: `0.5px solid ${colors.border}`,
      }}>
        <h1 style={{ fontFamily: fonts.serif, fontSize: '24px', fontWeight: 500, color: colors.navy, margin: '0 0 8px' }}>
          MyStory<span style={{ color: colors.gold }}>.</span>Family
        </h1>
        <p style={{ fontSize: '14px', color: colors.textSecondary, margin: '0 0 24px' }}>
          Sign in to continue your issue.
        </p>
        {justPurchased && (
          <div style={{
            background: colors.creamWarm, border: `0.5px solid ${colors.border}`,
            borderRadius: '10px', padding: '14px 16px', margin: '0 0 20px',
          }}>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.65, margin: 0 }}>
              Thank you — your purchase is complete. Sign in with the email address you used at checkout and we'll pick up right where you left off.
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
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com" required
              style={{
                width: '100%', padding: '12px 14px', fontSize: '15px',
                border: `0.5px solid ${colors.border}`, borderRadius: '8px',
                marginBottom: '12px', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            <button type="submit" style={{
              width: '100%', padding: '12px', fontSize: '15px',
              background: colors.navy, color: 'white', border: 'none',
              borderRadius: '999px', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit',
            }}>
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
// Dashboard — the contents page filling in, and four sessions
// ============================================================
function Dashboard({ user, project, onBeginGettingStarted, onOpenGuide, onOpenCapture, onOpenIssue }) {
  const subject = project.subject_name || 'your loved one';
  const [sessions, setSessions] = useState([]);
  const [sessLoading, setSessLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from('interview_sessions')
        .select('session_number, title, approved, pieces, recorded_on')
        .eq('project_id', project.id)
        .order('session_number', { ascending: true });
      if (cancelled) return;
      if (error) console.error('Could not load sessions:', error);
      setSessions(data || []);
      setSessLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [project.id]);

  const byNumber = Object.fromEntries(sessions.map(s => [s.session_number, s]));
  const isApproved = (n) => byNumber[n]?.approved === true;
  const hasPieces = (n) => Boolean(byNumber[n]?.pieces);
  const isUnlocked = (n) => n === 1 ? Boolean(project.getting_started_complete) : isApproved(n - 1);
  const approvedCount = sessions.filter(s => s.approved).length;
  const buyerInitials = (project.buyer_name || user.email || '?')
    .split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();

  const niceName = prettyName(project.buyer_name);
  const greeting = !project.getting_started_complete
    ? {
        eyebrow: project.issue_title || (project.subject_name ? `${project.subject_name}'s issue` : 'Your family\'s magazine'),
        heading: `Welcome${niceName ? `, ${niceName}` : ''}.`,
        body: /^gs:\d$/.test(project.current_step || "") ? "You're partway through Getting Started. Pick up where you left off." : "Your family is getting its own magazine. Start with Getting Started below — the first thing we do is name it.",
      }
    : {
        eyebrow: `${project.issue_title || `${subject}'s issue`} · Vol. 1`,
        heading: `Welcome back${niceName ? `, ${niceName}` : ''}.`,
        body: approvedCount === 0
          ? 'Your first session is ready when you are. Bring the box.'
          : `${approvedCount} of ${TOTAL_SESSIONS} sessions filed. The issue is taking shape.`,
      };

  const totalSteps = 1 + TOTAL_SESSIONS;
  const completedSteps = (project.getting_started_complete ? 1 : 0) + approvedCount;
  const nextSession = [1, 2, 3, 4].find(n => isUnlocked(n) && !isApproved(n));
  const departments = activeDepartments(project);

  return (
    <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: fonts.sans, color: colors.text }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: `0.5px solid ${colors.border}` }}>
          <Header buyerInitials={buyerInitials} buyerName={niceName} />
          <Hero greeting={greeting} />
          <ProgressBar completed={completedSteps} total={totalSteps} />

          <Section barColor={colors.gold} title={!project.getting_started_complete ? 'Start here' : 'Continue where you left off'}>
            {!project.getting_started_complete && (
              <ActiveCard
                eyebrow={/^gs:\d$/.test(project.current_step || "") ? "Continue" : "Begin"}
                title="Getting started"
                description="Name the magazine, decide what pages it has, and plan a few afternoons to go collect it. You're the publisher; Grace is your editor."
                buttonText={/^gs:\d$/.test(project.current_step || "") ? "Continue →" : "Begin →"}
                onClick={onBeginGettingStarted}
                icon={<IconContents />}
              />
            )}
            {project.getting_started_complete && nextSession && (
              <ActiveCard
                eyebrow={`Up next · Session ${nextSession} of ${TOTAL_SESSIONS}`}
                title={sessionTitle(project, nextSession)}
                description={
                  hasPieces(nextSession)
                    ? 'Grace has filed the pieces from this session. Read them over and approve, or ask for changes.'
                    : `Read your guide before you sit down${project.subject_name ? ` with ${project.subject_name}` : ''}, then bring the session back here when it's done.`
                }
                buttonText={hasPieces(nextSession) ? 'Review the pieces →' : 'Open your guide →'}
                onClick={() => hasPieces(nextSession) ? onOpenCapture(nextSession) : onOpenGuide(nextSession)}
                icon={<IconSession n={nextSession} />}
              />
            )}
            {project.getting_started_complete && !nextSession && !sessLoading && (
              <ActiveCard
                eyebrow="All four sessions filed"
                title="The issue"
                description="Everything is collected. Open the issue to read it through, choose the cover, and order the print."
                buttonText="Open the issue →"
                onClick={onOpenIssue}
                icon={<IconIssue />}
              />
            )}
          </Section>

          {/* The contents page */}
          <Section
            barColor={colors.gray}
            title="In this issue"
            subtitle={!project.getting_started_complete ? '— fills in during Getting started' : project.issue_plan ? null : '— in progress'}
          >
            <ContentsPage departments={departments} project={project} sessions={sessions} />
          </Section>

          {/* The four sessions */}
          <Section
            barColor={colors.gray}
            title="Your sessions"
            subtitle={
              !project.getting_started_complete
                ? '— unlocks after Getting started'
                : approvedCount >= TOTAL_SESSIONS
                ? '— all four filed'
                : `— ${approvedCount} of ${TOTAL_SESSIONS} filed`
            }
          >
            <CardGrid>
              {[1, 2, 3, 4].map((n) => {
                const unlocked = isUnlocked(n);
                const approved = isApproved(n);
                const drafted = hasPieces(n) && !approved;
                const onClick = sessLoading || !unlocked
                  ? null
                  : approved || drafted
                  ? () => onOpenCapture(n)
                  : () => onOpenGuide(n);
                const status = sessLoading || !unlocked ? null : approved ? 'Filed' : drafted ? 'Pieces ready' : 'Ready';
                return (
                  <LockedCard
                    key={n}
                    title={sessionTitle(project, n)}
                    subtitle={`Session ${n}${status ? ` · ${status}` : ''}`}
                    icon={<IconSession n={n} />}
                    locked={!unlocked}
                    onClick={onClick}
                    suppressStatus
                  />
                );
              })}
            </CardGrid>
          </Section>

          <IssueFooter
            subject={subject}
            hasContent={approvedCount > 0}
            approvedCount={approvedCount}
            onClick={project.getting_started_complete ? onOpenIssue : null}
          />
        </div>
      </div>
    </div>
  );
}

// The contents page as it stands: departments with their state.
function ContentsPage({ departments, project, sessions }) {
  // Count filed pieces per department from approved sessions, so the
  // contents page can show "3 pieces" once collecting starts.
  const counts = {};
  (sessions || []).forEach(s => {
    const pieces = s?.pieces?.pieces;
    if (!Array.isArray(pieces)) return;
    pieces.forEach(p => {
      if (!p?.department) return;
      const n = Array.isArray(p.items) ? p.items.length : 1;
      counts[p.department] = (counts[p.department] || 0) + n;
    });
  });

  const featureLine = project.feature_title
    ? project.feature_title
    : Array.isArray(project.feature_candidates) && project.feature_candidates.length
    ? `Candidates: ${project.feature_candidates.slice(0, 3).join(' · ')}`
    : null;

  return (
    <div style={{
      background: colors.creamLight, border: `0.5px solid ${colors.border}`,
      borderRadius: '12px', padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontFamily: fonts.serif, fontSize: '16px', fontWeight: 500 }}>
          {project.issue_title || (project.subject_name ? `${project.subject_name}'s Issue` : 'Your Family Issue')} · Vol. 1
        </div>
        <div style={{ fontSize: '11px', color: colors.textTertiary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          Contents
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {departments.filter(d => d.state !== 'out').map(d => {
          const dim = d.state === 'unknown';
          const threaded = d.state === 'threaded';
          const count = counts[d.id];
          return (
            <div key={d.id} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '13.5px', color: dim ? colors.textTertiary : colors.text }}>
              <span style={{ fontStyle: dim ? 'italic' : 'normal' }}>
                {d.title}
                {d.id === 'feature' && featureLine && (
                  <span style={{ color: colors.textSecondary }}> — {featureLine}</span>
                )}
                {threaded && <span style={{ color: colors.textSecondary }}> — threaded through</span>}
              </span>
              <span style={{ flex: 1, borderBottom: `1px dotted ${colors.gray}`, transform: 'translateY(-4px)' }} />
              <span style={{ fontSize: '12px', color: colors.textTertiary, whiteSpace: 'nowrap' }}>
                {count ? `${count} filed` : d.target ? d.target : dim ? 'if it fits' : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Dashboard sub-components
// ============================================================
function Header({ buyerInitials, buyerName, onBack, backLabel, rightText, right }) {
  return (
    <div style={{
      background: colors.navy, padding: '14px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {onBack && (
          <button onClick={onBack} style={{
            fontSize: '12px', padding: '5px 10px',
            background: 'rgba(255,255,255,0.1)', color: 'white',
            border: '0.5px solid rgba(255,255,255,0.25)',
            borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {backLabel || '← Dashboard'}
          </button>
        )}
        <div style={{ fontFamily: fonts.serif, fontSize: '17px', fontWeight: 500, color: 'white' }}>
          MyStory<span style={{ color: colors.gold }}>.</span>Family
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {right}
        {rightText && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>{rightText}</div>}
        {buyerName && <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>{buyerName}</div>}
        {buyerInitials && (
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%', background: colors.gold,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 500, color: colors.navy,
          }}>
            {buyerInitials}
          </div>
        )}
      </div>
    </div>
  );
}

function Hero({ greeting }) {
  return (
    <div style={{
      position: 'relative', height: '240px', overflow: 'hidden',
      background: 'linear-gradient(135deg, #E8D5B7 0%, #C9A574 50%, #A67B5B 100%)',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(44,62,80,0.05) 0%, rgba(44,62,80,0.55) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 32px 24px' }}>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', margin: '0 0 6px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
          {greeting.eyebrow}
        </p>
        <h1 style={{ fontFamily: fonts.serif, fontSize: '30px', fontWeight: 500, color: 'white', margin: '0 0 6px', lineHeight: 1.15, letterSpacing: '-0.5px' }}>
          {greeting.heading}
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.92)', margin: 0, lineHeight: 1.5, maxWidth: '460px' }}>
          {greeting.body}
        </p>
      </div>
    </div>
  );
}

function ProgressBar({ completed, total }) {
  const pct = (completed / total) * 100;
  return (
    <div style={{ padding: '24px 24px 18px', borderBottom: `0.5px solid ${colors.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', color: colors.textSecondary, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Your progress</span>
        <span style={{ fontSize: '13px', color: colors.text, fontWeight: 500 }}>{completed} of {total} steps</span>
      </div>
      <div style={{ height: '6px', background: colors.borderSubtle, borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: colors.gold, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}

function Section({ barColor, title, subtitle, children }) {
  return (
    <div style={{ padding: '24px 24px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <div style={{ width: '4px', height: '16px', background: barColor, borderRadius: '2px' }} />
        <h2 style={{ fontFamily: fonts.serif, fontSize: '18px', fontWeight: 500, margin: 0 }}>{title}</h2>
        {subtitle && <span style={{ fontSize: '12px', color: colors.textTertiary, marginLeft: '4px' }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function ActiveCard({ eyebrow, title, description, buttonText, onClick, icon }) {
  return (
    <div style={{
      background: colors.creamWarm, border: `1.5px solid ${colors.gold}`,
      borderRadius: '12px', padding: '18px', display: 'flex', alignItems: 'center', gap: '18px',
    }}>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', color: colors.tan, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '4px' }}>{eyebrow}</div>
        <div style={{ fontFamily: fonts.serif, fontSize: '18px', fontWeight: 500, marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5, marginBottom: '12px' }}>{description}</div>
        <button onClick={onClick} style={{
          fontSize: '13px', padding: '9px 22px', background: colors.navy, color: 'white',
          border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit',
        }}>
          {buttonText}
        </button>
      </div>
    </div>
  );
}

function LockedCard({ title, subtitle, icon, locked, dashed, onClick, suppressStatus }) {
  return (
    <div onClick={onClick || undefined} style={{
      background: colors.creamLight,
      border: `0.5px ${dashed ? 'dashed' : 'solid'} ${onClick ? colors.gold : colors.border}`,
      borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px',
      opacity: locked ? 0.6 : 1, cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>{title}</div>
        <div style={{ fontSize: '11px', color: colors.textTertiary }}>
          {subtitle}{suppressStatus ? '' : locked ? ' · Locked' : onClick ? ' · Ready' : ''}
        </div>
      </div>
    </div>
  );
}

function CardGrid({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
      {children}
    </div>
  );
}

function IssueFooter({ subject, hasContent, approvedCount = 0, onClick }) {
  return (
    <div onClick={onClick || undefined} style={{
      borderTop: `0.5px solid ${colors.border}`, padding: '20px 24px', background: colors.creamLight,
      display: 'flex', alignItems: 'center', gap: '16px', cursor: onClick ? 'pointer' : 'default',
    }}>
      <IconIssue locked={!hasContent} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: fonts.serif, fontSize: '16px', fontWeight: 500, marginBottom: '3px' }}>
          {subject}'s issue
        </div>
        <div style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: 1.5 }}>
          {hasContent
            ? `Read it as it stands — ${approvedCount} afternoon${approvedCount === 1 ? '' : 's'} filed so far`
            : 'Write your note to the family, and watch it fill in after the first afternoon'}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Getting Started — six screens in Grace's voice.
// Tap what applies and it opens up. Every Save & Continue writes the
// buyer's choices straight to interview_projects. One API call at the end
// (Review) asks Grace to propose the four afternoons.
// ============================================================
const GS_STEPS = [
  { n: 1, key: 'name', label: 'The name' },
  { n: 2, key: 'her', label: 'Her' },
  { n: 3, key: 'care', label: 'Care' },
  { n: 4, key: 'pages', label: 'The pages' },
  { n: 5, key: 'afternoons', label: 'The afternoons' },
  { n: 6, key: 'review', label: 'Review' },
];
const GS_MINUTES = { 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 0 };

const RELATIONSHIPS = [
  { id: 'mom', label: 'Mom' },
  { id: 'dad', label: 'Dad' },
  { id: 'grandmother', label: 'Grandma' },
  { id: 'grandfather', label: 'Grandpa' },
];

const TALK_STYLES = [
  { id: 'opens', label: 'Opens right up', value: 'Opens right up; tells complete stories once started', note: "Then your job is mostly to open a door and get out of the way. We'll plan longer afternoons with fewer questions." },
  { id: 'slow', label: 'Takes her time, then it comes', value: 'Takes her time; the stories come after a pause', note: "Then your guide will lean on silence — ask one small thing, count to five, let her get there. Shorter afternoons, and they'll go deeper." },
  { id: 'short', label: 'Short answers', value: 'Brief answers; needs a specific follow-up to open up', note: "Then specifics are everything. 'What did the kitchen look like?' gets a story where 'tell me about the house' gets a shrug. Your guide will be full of small doors." },
  { id: 'wanders', label: 'Wanders, wonderfully', value: 'Wanders between memories; tangents are where the good material is', note: "Then we let her. In a magazine a tangent is just a different page filling itself in. Your guide will show you how to steer back gently when you need to." },
];

const PHOTO_OPTIONS = [
  { id: 'yes', label: 'Yes, I know where', value: 'yes', note: "Then the first afternoon is built around them. Holding up a picture and waiting is the easiest conversation you'll ever have with her." },
  { id: 'some', label: 'Some, scattered', value: 'some', note: "That's enough. Bring whatever you can find to the first afternoon — even a handful does the work." },
  { id: 'no', label: 'Not really', value: 'no', note: "That's fine. The first afternoon starts with the sayings and the short stories instead, and the shoebox page comes off the contents." },
];

// The page cards. `always` pages aren't shown as choices; they're in.
const PAGE_CARDS = [
  { id: 'sayings', title: 'Things She Always Said', why: 'Usually the page the grandchildren read first.', opens: 'rename' },
  { id: 'shoebox', title: 'From the Shoebox', why: 'Photographs, each with who, where, when — and a line in her words.', opens: 'photos' },
  { id: 'feature', title: 'The Feature', why: 'The one story everyone knows. Name it now, or decide after the first afternoon.', opens: 'feature', fixed: true },
  { id: 'laughter', title: 'Laughter, Around Our Table', why: 'The jokes and stories told every holiday whether anyone asked.', opens: 'rename' },
  { id: 'kitchen', title: 'From Her Kitchen', why: 'One recipe, the way she actually makes it. The page that gets used.', opens: 'rename' },
  { id: 'faith', title: 'Her Faith', why: 'Its own pages, or running through every story — your call.', opens: 'faith' },
  { id: 'know_now', title: 'What I Know Now', why: 'Advice for the grandchildren, in her words.', opens: 'rename', fixed: true },
];

function pageTitleFor(id, relationship, titles) {
  if (titles?.[id]) return titles[id];
  const card = PAGE_CARDS.find(c => c.id === id);
  const base = card ? card.title : id;
  const S = subjectPronoun(relationship);
  const P = possessive(relationship);
  return base.replace('She', S).replace('Her', P);
}

function GettingStarted({ project, onProjectUpdate, onReturnToDashboard, onOpenGuide }) {
  // Resume where they left off: current_step is "gs:<n>" while in progress.
  const resumeStep = (() => {
    const m = /^gs:(\d)$/.exec(project.current_step || '');
    const n = m ? Number(m[1]) : 1;
    return Math.min(6, Math.max(1, n));
  })();
  const [step, setStep] = useState(resumeStep);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [current, setCurrent] = useState(project);

  // Local form state, seeded from the project.
  const [title, setTitle] = useState(project.issue_title || '');
  const [relationship, setRelationship] = useState(project.buyer_relationship || '');
  const [relationshipOther, setRelationshipOther] = useState(
    project.buyer_relationship && !RELATIONSHIPS.some(r => r.id === project.buyer_relationship) ? project.buyer_relationship : ''
  );
  const [subjectName, setSubjectName] = useState(project.subject_name || '');
  const [subjectAge, setSubjectAge] = useState(project.subject_age ? String(project.subject_age) : '');
  const [talk, setTalk] = useState(() => TALK_STYLES.find(t => t.value === project.subject_communication_style)?.id || '');
  const [oneThing, setOneThing] = useState(project.subject_one_thing_to_know || '');
  const [careChoice, setCareChoice] = useState(project.sensitivities ? (project.sensitivities === 'None named' ? 'no' : 'yes') : '');
  const [careText, setCareText] = useState(project.sensitivities && project.sensitivities !== 'None named' ? project.sensitivities : '');
  const [pages, setPages] = useState(() => {
    const d = (project.departments && typeof project.departments === 'object') ? project.departments : {};
    const on = {};
    PAGE_CARDS.forEach(c => { on[c.id] = c.fixed ? true : ['yes', 'some', 'own', 'threaded'].includes(String(d[c.id] || '').toLowerCase()); });
    if (!project.departments || Object.keys(d).length === 0) { on.sayings = true; on.shoebox = true; }
    return on;
  });
  const [openCard, setOpenCard] = useState(null);
  const [titles, setTitles] = useState((project.department_titles && typeof project.department_titles === 'object') ? project.department_titles : {});
  const [photos, setPhotos] = useState(() => {
    const v = String(project.has_photos || '').toLowerCase();
    return v.startsWith('yes') ? 'yes' : v.startsWith('some') ? 'some' : v.startsWith('no') ? 'no' : '';
  });
  const [featureText, setFeatureText] = useState(Array.isArray(project.feature_candidates) ? project.feature_candidates.join('\n') : '');
  const [faithMode, setFaithMode] = useState(() => {
    const v = String(project.departments?.faith || '').toLowerCase();
    return v === 'yes' || v === 'own' ? 'own' : v === 'threaded' ? 'threaded' : '';
  });
  const [custom, setCustom] = useState(Array.isArray(project.custom_departments) ? project.custom_departments : []);
  const [customDraft, setCustomDraft] = useState('');
  const [hopes, setHopes] = useState(project.hopes_territory || '');
  const [format, setFormat] = useState(project.logistics_format || '');
  const [firstWhen, setFirstWhen] = useState(project.logistics_first_conversation || '');
  const [others, setOthers] = useState(project.logistics_others || '');
  // Review
  const [proposal, setProposal] = useState(project.issue_plan ? { synthesis: project.issue_synthesis || '', issue_plan: project.issue_plan } : null);
  const [proposing, setProposing] = useState(false);

  const rel = relationship === 'other' ? relationshipOther : relationship;
  const S = subjectPronoun(rel);
  const her = S === 'He' ? 'him' : S === 'They' ? 'them' : 'her';
  const sheIs = S === 'He' ? 'he' : S === 'They' ? 'they' : 'she';
  const displayName = subjectName.trim() || (S === 'He' ? 'him' : S === 'They' ? 'them' : 'her');

  const saveProject = async (updates, nextStep) => {
    setSaving(true);
    setError('');
    try {
      const payload = { ...updates };
      if (nextStep) payload.current_step = nextStep === 'done' ? 'session_1' : `gs:${nextStep}`;
      const { error: err } = await supabase.from('interview_projects').update(payload).eq('id', project.id);
      if (err) throw err;
      const merged = { ...current, ...payload };
      setCurrent(merged);
      onProjectUpdate(merged);
      setSavedAt(new Date());
      return merged;
    } catch (e) {
      console.error('Save failed:', e);
      setError("That didn't save. Check your connection and try again.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const goTo = (n) => { setStep(n); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // ---- Step handlers --------------------------------------------------
  const saveName = async () => {
    const ok = await saveProject({ issue_title: title.trim() || null }, 2);
    if (ok) goTo(2);
  };

  const saveHer = async () => {
    const style = TALK_STYLES.find(t => t.id === talk)?.value || null;
    const ok = await saveProject({
      buyer_relationship: rel || null,
      subject_name: subjectName.trim() || null,
      subject_age: parseInt(subjectAge, 10) || null,
      subject_communication_style: style,
      subject_one_thing_to_know: oneThing.trim() || null,
    }, 3);
    if (ok) goTo(3);
  };

  const saveCare = async () => {
    const value = careChoice === 'yes' ? (careText.trim() || 'None named') : 'None named';
    const ok = await saveProject({ sensitivities: value }, 4);
    if (ok) goTo(4);
  };

  const savePages = async () => {
    const departments = {};
    PAGE_CARDS.forEach(c => {
      if (c.id === 'faith') departments.faith = pages.faith ? (faithMode === 'threaded' ? 'threaded' : 'own') : 'no';
      else if (c.id === 'shoebox') departments.shoebox = photos === 'no' ? 'no' : pages.shoebox ? 'yes' : 'no';
      else departments[c.id] = pages[c.id] ? 'yes' : 'no';
    });
    departments.family_stories = 'yes';
    const candidates = featureText.split(/\n|;/).map(s => s.trim()).filter(Boolean);
    const ok = await saveProject({
      departments,
      department_titles: titles,
      custom_departments: custom,
      has_photos: photos || 'unknown',
      feature_candidates: candidates,
      hopes_territory: hopes.trim() || null,
    }, 5);
    if (ok) goTo(5);
  };

  const saveAfternoons = async (skip) => {
    const updates = skip ? {} : {
      logistics_format: format || null,
      logistics_first_conversation: firstWhen || null,
      logistics_others: others || null,
      logistics_bring_photos: photos === 'no' ? 'n/a' : 'yes',
    };
    const ok = await saveProject(updates, 6);
    if (ok) { goTo(6); if (!proposal) propose(ok); }
  };

  const propose = async (proj) => {
    setProposing(true);
    setError('');
    try {
      const res = await authedFetch('/api/claude-magazine', { project: proj || current, mode: 'propose_issue' });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      if (!data.issue_plan) throw new Error('No plan');
      setProposal(data);
      await saveProject({ issue_plan: data.issue_plan, issue_synthesis: data.synthesis || null });
    } catch (e) {
      console.error('Proposal failed:', e);
      setError("Grace couldn't put the afternoons together just now. Try again in a moment.");
    } finally {
      setProposing(false);
    }
  };

  const confirmIssue = async () => {
    const ok = await saveProject({ getting_started_complete: true }, 'done');
    if (ok) onOpenGuide();
  };

  const addCustom = () => {
    const t = customDraft.trim();
    if (!t) return;
    const id = t.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `page_${custom.length + 1}`;
    if (custom.some(c => c.id === id)) { setCustomDraft(''); return; }
    setCustom([...custom, { id, title: t, note: '' }]);
    setCustomDraft('');
  };

  const togglePage = (id) => {
    const card = PAGE_CARDS.find(c => c.id === id);
    if (card?.fixed) { setOpenCard(openCard === id ? null : id); return; }
    const next = !pages[id];
    setPages({ ...pages, [id]: next });
    setOpenCard(next ? id : null);
  };

  // ---- Shared bits -----------------------------------------------------
  const minutesLeft = GS_MINUTES[step];
  const headline = title.trim() ? title.trim() : 'Getting started';
  const eyebrow = step === 6 ? `${headline} · last step` : step === 1 ? `Getting started · about ${minutesLeft} minutes` : `${headline} · about ${minutesLeft} minutes left`;

  return (
    <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: fonts.sans, color: colors.text }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: `0.5px solid ${colors.border}` }}>
          <Header onBack={onReturnToDashboard} backLabel="← Save & exit" rightText={savedAt ? 'Saved · just now' : 'Saves as you go'} />

          {/* Step bar */}
          <div style={{ padding: '18px 24px 0', background: colors.creamLight, borderBottom: `0.5px solid ${colors.border}` }}>
            <div style={{ textAlign: 'center', fontSize: '11px', letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.tan, fontWeight: 600, marginBottom: '14px' }}>{eyebrow}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
              {GS_STEPS.map(s => {
                const done = s.n < step;
                const active = s.n === step;
                const label = s.key === 'her' && rel ? (RELATIONSHIPS.find(r => r.id === rel)?.label || 'Her') : s.label;
                return (
                  <button key={s.n} onClick={() => done ? goTo(s.n) : null} disabled={!done} style={{
                    background: 'transparent', border: 'none', borderBottom: `3px solid ${done ? colors.olive : active ? colors.navy : colors.border}`,
                    padding: '0 0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    cursor: done ? 'pointer' : 'default', fontFamily: 'inherit',
                  }}>
                    <span style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: done ? colors.olive : active ? colors.navy : 'white',
                      border: done || active ? 'none' : `1px solid ${colors.gray}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: done || active ? 'white' : colors.textSecondary, fontSize: '11px', fontWeight: 600,
                    }}>
                      {done ? <svg width="11" height="11" viewBox="0 0 12 12"><path d="M3 6l2 2 4-4" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg> : s.n}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: active ? 600 : 400, color: done || active ? colors.text : colors.textSecondary, whiteSpace: 'nowrap' }}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {step === 1 && (
              <>
                <GraceSays heading="Your family is getting its own magazine. Let's name it." text="Whatever you call it goes on the cover. A working title is fine — it can change once there's a cover photo." />
                <Panel>
                  <FieldLabel htmlFor="gs-title">What should we call it?</FieldLabel>
                  <TextInput id="gs-title" value={title} onChange={setTitle} placeholder="The Johnson Family Gazette" big />
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: colors.textTertiary }}>Or tap one:</span>
                    {[`The ${(current.buyer_name || 'Family').split(' ').slice(-1)[0]} Family Quarterly`, `${RELATIONSHIPS.find(r => r.id === rel)?.label || 'Mom'}'s Pages`, 'Decide later'].map(s => (
                      <Chip key={s} onClick={() => setTitle(s === 'Decide later' ? '' : s)}>{s}</Chip>
                    ))}
                  </div>
                  <CoverPreview title={title.trim() || 'Your title here'} />
                </Panel>
              </>
            )}

            {step === 2 && (
              <>
                <GraceSays heading="Now, who is it about?" text="Not the stories yet — just who they are, so the afternoons fit how they actually talk." />
                <Panel>
                  <FieldLabel>This magazine is about my…</FieldLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                    {RELATIONSHIPS.map(r => <ChoiceCard key={r.id} selected={relationship === r.id} onClick={() => setRelationship(r.id)}>{r.label}</ChoiceCard>)}
                    <ChoiceCard dashed selected={relationship === 'other'} onClick={() => setRelationship('other')}>Someone else</ChoiceCard>
                  </div>
                  {relationship === 'other' && (
                    <TextInput value={relationshipOther} onChange={setRelationshipOther} placeholder="aunt, godfather, neighbor, …" />
                  )}
                  {relationship && (
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                      <div>
                        <FieldLabel htmlFor="gs-name" hint="how you'd like it in the magazine">{S === 'He' ? 'His' : S === 'They' ? 'Their' : 'Her'} name</FieldLabel>
                        <TextInput id="gs-name" value={subjectName} onChange={setSubjectName} placeholder="Dot" />
                      </div>
                      <div>
                        <FieldLabel htmlFor="gs-age" hint="roughly is fine">{S === 'He' ? 'His' : S === 'They' ? 'Their' : 'Her'} age</FieldLabel>
                        <TextInput id="gs-age" value={subjectAge} onChange={setSubjectAge} placeholder="84" />
                      </div>
                    </div>
                  )}
                </Panel>
                {relationship && (
                  <Panel>
                    <FieldLabel>When {displayName} talks about the past, {sheIs}…</FieldLabel>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                      {TALK_STYLES.map(t => <ChoiceCard key={t.id} tall selected={talk === t.id} onClick={() => setTalk(t.id)}>{t.label}</ChoiceCard>)}
                    </div>
                    {talk && <GraceNote text={TALK_STYLES.find(t => t.id === talk).note.replace(/\bher\b/g, her).replace(/\bshe\b/g, sheIs)} />}
                    <div>
                      <FieldLabel htmlFor="gs-onething" hint="optional">Anything about {her} that's hard to put in a question?</FieldLabel>
                      <TextInput id="gs-onething" value={oneThing} onChange={setOneThing} placeholder={`${S} makes ${S === 'He' ? 'his' : S === 'They' ? 'their' : 'her'} own life sound smaller than it was.`} />
                    </div>
                  </Panel>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <GraceSays heading="One thing before the fun part." text={`Some things belong in ${displayName}'s magazine only on ${S === 'He' ? 'his' : S === 'They' ? 'their' : 'her'} terms. Some don't belong at all. You point; I'll hold it.`} />
                <Panel>
                  <FieldLabel>Is there anything we should be careful with?</FieldLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 220px))', gap: '10px' }}>
                    <ChoiceCard tall selected={careChoice === 'yes'} onClick={() => setCareChoice('yes')}>Yes, a few things</ChoiceCard>
                    <ChoiceCard tall selected={careChoice === 'no'} onClick={() => setCareChoice('no')}>Nothing I can think of</ChoiceCard>
                  </div>
                  {careChoice === 'yes' && (
                    <>
                      <div>
                        <FieldLabel htmlFor="gs-care">Just name them. No need to explain.</FieldLabel>
                        <TextArea id="gs-care" value={careText} onChange={setCareText} placeholder="The year my brother passed." />
                      </div>
                      <GraceNote text={`I'll hold that. Nothing you name here shows up in what I prepare for you. If ${sheIs} opens that door ${S === 'He' ? 'himself' : S === 'They' ? 'themselves' : 'herself'}, it's ${S === 'He' ? 'his' : S === 'They' ? 'theirs' : 'hers'} to open.`} />
                    </>
                  )}
                  {careChoice === 'no' && <GraceNote text="Good. If something comes to mind later, you can tell me any time." />}
                </Panel>
              </>
            )}

            {step === 4 && (
              <>
                <GraceSays heading="Now the good part — what's in it." text={`Tap the pages that fit ${displayName}. Each one opens up so you can make it yours. You're the publisher; I'll suggest, you decide.`} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  {PAGE_CARDS.map(card => {
                    const on = pages[card.id];
                    const open = openCard === card.id;
                    const t = pageTitleFor(card.id, rel, titles);
                    return (
                      <div key={card.id} style={{
                        gridColumn: open ? '1 / -1' : 'auto',
                        background: on ? colors.creamWarm : colors.creamLight,
                        border: on ? `2px solid ${colors.gold}` : `1px solid ${colors.border}`,
                        borderRadius: '12px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px',
                      }}>
                        <button onClick={() => togglePage(card.id)} style={{ textAlign: 'left', background: 'transparent', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontFamily: 'inherit', color: colors.text, minHeight: '44px' }}>
                          <span style={{ width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0, background: on ? colors.olive : 'white', border: on ? 'none' : `1px solid ${colors.gray}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {on && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 6l2 2 4-4" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </span>
                          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontFamily: fonts.serif, fontSize: '16px', fontWeight: 500 }}>{t}{card.fixed ? '' : ''}</span>
                            <span style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: 1.45 }}>{card.why}</span>
                          </span>
                        </button>

                        {open && card.opens === 'rename' && (
                          <div style={{ paddingLeft: '36px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', alignItems: 'end' }}>
                            <div>
                              <FieldLabel small htmlFor={`gs-title-${card.id}`}>What would you call this page?</FieldLabel>
                              <TextInput id={`gs-title-${card.id}`} value={titles[card.id] || ''} onChange={v => setTitles({ ...titles, [card.id]: v })} placeholder={t} />
                            </div>
                            <div style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5, paddingBottom: '8px' }}>
                              {card.id === 'sayings' ? `${S === 'He' ? 'His' : S === 'They' ? 'Their' : 'Her'} lines run through the whole issue as little fillers, each with when ${sheIs} said it.` : card.id === 'kitchen' ? "You'll pick which recipe after the first afternoon." : card.id === 'know_now' ? `One piece of advice at a time, close to word for word.` : 'Told, not described — the whole thing, even if everyone knows the ending.'}
                            </div>
                          </div>
                        )}

                        {open && card.opens === 'photos' && (
                          <div style={{ paddingLeft: '36px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <FieldLabel small>Are there pictures, and do you know where they are?</FieldLabel>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', maxWidth: '600px' }}>
                              {PHOTO_OPTIONS.map(o => <ChoiceCard key={o.id} selected={photos === o.id} onClick={() => { setPhotos(o.id); if (o.id === 'no') setPages({ ...pages, shoebox: false }); }}>{o.label}</ChoiceCard>)}
                            </div>
                            {photos && <GraceNote text={PHOTO_OPTIONS.find(o => o.id === photos).note.replace(/\bher\b/g, her)} />}
                          </div>
                        )}

                        {open && card.opens === 'feature' && (
                          <div style={{ paddingLeft: '36px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <FieldLabel small htmlFor="gs-feature" hint="one per line — or leave it and decide after the first afternoon">Is there one story the whole family knows?</FieldLabel>
                            <TextArea id="gs-feature" value={featureText} onChange={setFeatureText} placeholder={'The flood in ’58\nHow she met Dad at the county fair'} rows={3} />
                            <div style={{ fontSize: '13px', color: colors.textSecondary }}>Hold the story itself — that one's {S === 'He' ? 'his' : S === 'They' ? 'theirs' : 'hers'} to tell. Just the name of it.</div>
                          </div>
                        )}

                        {open && card.opens === 'faith' && (
                          <div style={{ paddingLeft: '36px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <FieldLabel small>How should faith run through the issue?</FieldLabel>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', maxWidth: '520px' }}>
                              <ChoiceCard tall selected={faithMode === 'threaded'} onClick={() => setFaithMode('threaded')}>Through the stories, where {sheIs} put it</ChoiceCard>
                              <ChoiceCard tall selected={faithMode === 'own'} onClick={() => setFaithMode('own')}>Its own pages — it's the center of who {sheIs} is</ChoiceCard>
                            </div>
                            {faithMode === 'own' && <GraceNote text={`Then it gets real room in the last afternoon: the verse on the refrigerator, how ${sheIs} prays, what ${sheIs}'d want the grandchildren to hold onto.`} />}
                            {faithMode === 'threaded' && <GraceNote text="That's usually the truest way. It'll show up where it belongs — in the hard years, in the kitchen, wherever it was." />}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {custom.map(c => (
                    <div key={c.id} style={{ background: colors.creamWarm, border: `2px solid ${colors.gold}`, borderRadius: '12px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: colors.olive, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 6l2 2 4-4" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontFamily: fonts.serif, fontSize: '16px', fontWeight: 500 }}>{c.title}</span>
                        <span style={{ fontSize: '13px', color: colors.textSecondary }}>A page of your own. It's in.</span>
                      </span>
                      <button onClick={() => setCustom(custom.filter(x => x.id !== c.id))} aria-label={`Remove ${c.title}`} style={{ background: 'transparent', border: 'none', color: colors.textTertiary, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', minHeight: '44px' }}>Remove</button>
                    </div>
                  ))}

                  <div style={{ background: 'white', border: `1px dashed ${colors.gray}`, borderRadius: '12px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: custom.length || openCard ? '1 / -1' : 'auto' }}>
                    <span style={{ fontFamily: fonts.serif, fontSize: '16px', fontWeight: 500, color: colors.navy }}>+ A page of your own</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <TextInput value={customDraft} onChange={setCustomDraft} placeholder={'"All Her Moves," "Grandpa’s Garage" — anything'} onEnter={addCustom} />
                      <button onClick={addCustom} style={{ fontSize: '14px', padding: '0 18px', minHeight: '44px', background: colors.navy, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Add</button>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: colors.textTertiary }}>Always in: the Feature, Family Stories, What I Know Now, and {S === 'He' ? 'his' : S === 'They' ? 'their' : 'her'} last word. Everything else is yours to keep, drop, or rename.</div>
                <Panel>
                  <FieldLabel htmlFor="gs-hopes" hint="optional">Anything else that deserves pages — a place, a job, a person, a stretch of years?</FieldLabel>
                  <TextInput id="gs-hopes" value={hopes} onChange={setHopes} placeholder="Her years as a nurse. The lake house." />
                </Panel>
              </>
            )}

            {step === 5 && (
              <>
                <GraceSays heading="Last thing — and you can skip it." text="Families who finish usually pick a window for the first afternoon. Nothing here is binding." />
                <Panel>
                  <FieldLabel>How will you do it?</FieldLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', maxWidth: '560px' }}>
                    {[['in_person', 'In person'], ['video', 'Video call'], ['phone', 'Phone']].map(([v, l]) => <ChoiceCard key={v} selected={format === v} onClick={() => setFormat(v)}>{l}</ChoiceCard>)}
                  </div>
                  <div style={{ fontSize: '13px', color: colors.textSecondary }}>{photos === 'no' ? 'In person usually gets the most.' : 'In person is the only way to go through the box together.'}</div>
                  <FieldLabel>When could the first one realistically happen?</FieldLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', maxWidth: '640px' }}>
                    {['This week', 'Next week', 'This month', 'Not sure yet'].map(v => <ChoiceCard key={v} selected={firstWhen === v} onClick={() => setFirstWhen(v)}>{v}</ChoiceCard>)}
                  </div>
                  <FieldLabel>Just the two of you?</FieldLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', maxWidth: '420px' }}>
                    {[['Just the two of us', 'Yes'], ['Others will be there', 'Others will be there']].map(([v, l]) => <ChoiceCard key={v} selected={others === v} onClick={() => setOthers(v)}>{l}</ChoiceCard>)}
                  </div>
                  <div style={{ fontSize: '13px', color: colors.textSecondary }}>One-on-one usually gets more. With a room, {sheIs} plays to the room.</div>
                  {photos !== 'no' && <GraceNote text="One practical thing: bring the box. Not to sort — just to have on the table." />}
                </Panel>
              </>
            )}

            {step === 6 && (
              <>
                {proposing && (
                  <GraceSays heading="Putting your issue together…" text="One moment. I'm laying out the contents page and the four afternoons from what you told me." />
                )}
                {!proposing && proposal && (
                  <>
                    <GraceSays heading="Here's your issue." text={proposal.synthesis || 'Tap anything to change it.'} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 280px) minmax(0, 1fr)', gap: '20px' }} className="gs-review">
                      <ContentsPreview title={title.trim()} subject={subjectName.trim()} relationship={rel} departments={proposal.issue_plan.departments} onEdit={() => goTo(4)} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: colors.tan, fontWeight: 600 }}>Here's how I'd collect it — four afternoons</div>
                        {proposal.issue_plan.sessions.map((s, i) => <SessionRevealCard key={s.number || i} session={s} index={i} />)}
                        <div style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: 1.55, marginTop: '4px' }}>About an hour each, at your pace. Most people think about doing this for years. You started.</div>
                        <button onClick={() => propose()} style={{ alignSelf: 'flex-start', fontSize: '13px', background: 'transparent', border: 'none', color: colors.textSecondary, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', padding: '6px 0', minHeight: '44px' }}>Ask Grace for a different arrangement</button>
                      </div>
                    </div>
                  </>
                )}
                {!proposing && !proposal && !error && (
                  <GraceSays heading="Almost there." text="Tap Save & Continue and I'll put your issue together." />
                )}
              </>
            )}

            {error && (
              <div style={{ padding: '10px 14px', background: '#FBE9E7', color: '#B8543D', borderRadius: '6px', fontSize: '13px' }}>{error}</div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '18px 32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `0.5px solid ${colors.border}`, gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => step > 1 ? goTo(step - 1) : onReturnToDashboard()} disabled={saving} style={{ fontSize: '15px', padding: '12px 22px', minHeight: '48px', background: 'white', border: `1px solid ${colors.gray}`, borderRadius: '8px', fontFamily: 'inherit', color: colors.textSecondary, cursor: 'pointer' }}>
              {step > 1 ? 'Previous' : 'Dashboard'}
            </button>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {step === 5 && (
                <button onClick={() => saveAfternoons(true)} disabled={saving} style={{ fontSize: '14px', padding: '12px 14px', minHeight: '48px', background: 'transparent', border: 'none', fontFamily: 'inherit', color: colors.textSecondary, textDecoration: 'underline', cursor: 'pointer' }}>Skip this for now</button>
              )}
              {step < 6 && (
                <PrimaryButton
                  disabled={saving || (step === 2 && !relationship) || (step === 3 && !careChoice)}
                  onClick={step === 1 ? saveName : step === 2 ? saveHer : step === 3 ? saveCare : step === 4 ? savePages : () => saveAfternoons(false)}
                >
                  {saving ? 'Saving…' : 'Save & Continue'}
                </PrimaryButton>
              )}
              {step === 6 && !proposal && !proposing && (
                <PrimaryButton onClick={() => propose()}>Put my issue together</PrimaryButton>
              )}
              {step === 6 && proposal && (
                <PrimaryButton disabled={saving || proposing} onClick={confirmIssue}>This is my issue → open the first guide</PrimaryButton>
              )}
            </div>
          </div>

          <style>{`
            @media (max-width: 760px) {
              .gs-review { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}

// ---- Getting Started building blocks ------------------------------------
function GraceSays({ heading, text }) {
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <GraceAvatar size="large" />
      <div style={{ fontSize: '16px', lineHeight: 1.6, color: colors.navy, maxWidth: '660px' }}>
        <div style={{ fontFamily: fonts.serif, fontSize: '24px', fontWeight: 500, marginBottom: '6px', lineHeight: 1.25 }}>{heading}</div>
        {text}
      </div>
    </div>
  );
}

function GraceNote({ text }) {
  return (
    <div style={{ background: 'white', border: `0.5px solid ${colors.border}`, borderRadius: '8px', padding: '12px 14px', fontSize: '14px', lineHeight: 1.55, color: colors.navy, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#F4E4C1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.serif, fontSize: '12px', color: colors.tan, flexShrink: 0 }}>G</div>
      <div>{text}</div>
    </div>
  );
}

function Panel({ children }) {
  return (
    <div style={{ background: colors.creamLight, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {children}
    </div>
  );
}

function FieldLabel({ children, htmlFor, hint, small }) {
  return (
    <label htmlFor={htmlFor} style={{ fontSize: small ? '13px' : '15px', fontWeight: small ? 400 : 500, color: small ? colors.textSecondary : colors.text, display: 'block', marginBottom: '6px' }}>
      {children}{hint && <span style={{ color: colors.textTertiary, fontWeight: 400 }}> — {hint}</span>}
    </label>
  );
}

function TextInput({ id, value, onChange, placeholder, big, onEnter }) {
  return (
    <input
      id={id} type="text" value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } }}
      style={{ width: '100%', boxSizing: 'border-box', padding: big ? '14px 16px' : '12px 14px', fontSize: big ? '18px' : '16px', fontFamily: 'inherit', border: `1px solid ${colors.gray}`, borderRadius: '8px', background: 'white', color: colors.text, minHeight: '44px' }}
    />
  );
}

function TextArea({ id, value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      id={id} value={value} placeholder={placeholder} rows={rows}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: '15px', lineHeight: 1.5, fontFamily: 'inherit', border: `1px solid ${colors.gray}`, borderRadius: '8px', background: 'white', color: colors.text, resize: 'vertical' }}
    />
  );
}

function ChoiceCard({ children, selected, onClick, tall, dashed }) {
  return (
    <button onClick={onClick} style={{
      minHeight: tall ? '72px' : '56px', padding: '10px 12px', fontSize: '15px', lineHeight: 1.3, fontFamily: 'inherit', cursor: 'pointer',
      background: selected ? colors.navy : 'white', color: selected ? 'white' : colors.text,
      border: selected ? `2px solid ${colors.navy}` : `1px ${dashed ? 'dashed' : 'solid'} ${colors.gray}`, borderRadius: '8px',
    }}>
      {children}
    </button>
  );
}

function Chip({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ fontSize: '13px', padding: '9px 14px', minHeight: '44px', background: 'white', border: `1px solid ${colors.border}`, borderRadius: '999px', fontFamily: 'inherit', color: colors.navy, cursor: 'pointer' }}>
      {children}
    </button>
  );
}

function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ fontSize: '15px', padding: '12px 28px', minHeight: '48px', background: disabled ? colors.gray : colors.navy, color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'inherit', fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      {children}
    </button>
  );
}

function CoverPreview({ title }) {
  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '4px' }}>
      <div style={{ width: '132px', height: '170px', background: '#F7F2E8', border: '1px solid #1F1B16', outline: '1px solid #1F1B16', outlineOffset: '3px', boxSizing: 'border-box', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
        <div style={{ fontSize: '6px', letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center', color: '#4A4238' }}>Vol. 1</div>
        <div style={{ fontFamily: fonts.serif, fontWeight: 700, fontSize: '13px', lineHeight: 1.05, textAlign: 'center', color: '#1F1B16' }}>{title}</div>
        <div style={{ flex: 1, background: '#E3DACB', border: '1px dashed #B8AB95' }} />
        <div style={{ height: '3px', background: '#D5CBB9' }} />
        <div style={{ height: '3px', background: '#D5CBB9', width: '80%' }} />
      </div>
      <div style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: 1.55, maxWidth: '360px' }}>That's the cover. We'll put a photograph on it after the first afternoon.</div>
    </div>
  );
}

function ContentsPreview({ title, subject, relationship, departments, onEdit }) {
  const P = possessive(relationship).toLowerCase();
  return (
    <button onClick={onEdit} style={{ textAlign: 'left', cursor: 'pointer', background: '#F7F2E8', border: '1px solid #1F1B16', outline: '1px solid #1F1B16', outlineOffset: '3px', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '8px', color: '#1F1B16', fontFamily: 'inherit' }}>
      <div style={{ fontSize: '9px', letterSpacing: '1.6px', textTransform: 'uppercase', textAlign: 'center', color: '#4A4238' }}>Vol. 1</div>
      <div style={{ fontFamily: fonts.serif, fontWeight: 700, fontSize: '20px', lineHeight: 1.05, textAlign: 'center' }}>{title || 'Your magazine'}</div>
      {subject && <div style={{ fontFamily: fonts.serif, fontStyle: 'italic', fontSize: '11px', textAlign: 'center', color: '#4A4238' }}>Stories, sayings &amp; pictures from {subject}'s life</div>}
      <div style={{ height: '90px', background: '#E3DACB', border: '1px dashed #B8AB95', marginTop: '2px' }} />
      <div style={{ fontSize: '8px', letterSpacing: '1.4px', textTransform: 'uppercase', textAlign: 'center', color: '#8B2E1F', fontWeight: 700, marginTop: '2px' }}>In this issue</div>
      <div style={{ fontSize: '10.5px', lineHeight: 1.7, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}><span>A Note Before You Begin</span><span style={{ flex: 1, borderBottom: '1px dotted #8F8371', transform: 'translateY(-3px)' }} /></div>
        {departments.map(d => (
          <div key={d.id} style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
            <span style={{ fontWeight: d.id === 'feature' ? 600 : 400 }}>{d.title}</span>
            <span style={{ flex: 1, borderBottom: '1px dotted #8F8371', transform: 'translateY(-3px)' }} />
            <span style={{ color: '#4A4238' }}>{d.id === 'sayings' ? 'throughout' : ''}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '10px', color: '#4A4238', textAlign: 'center', marginTop: '6px', textDecoration: 'underline' }}>Tap to change the pages</div>
    </button>
  );
}

function GraceAvatar({ size = 'small' }) {
  const dim = size === 'large' ? 44 : 36;
  return (
    <div style={{
      width: `${dim}px`, height: `${dim}px`, borderRadius: '50%', background: '#F4E4C1',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      fontFamily: fonts.serif, fontSize: size === 'large' ? '16px' : '14px', fontWeight: 500, color: colors.tan,
    }}>
      G
    </div>
  );
}

function SessionRevealCard({ session, index }) {
  return (
    <div style={{
      background: colors.creamWarm, border: `1px solid ${colors.gold}`, borderRadius: '12px',
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px',
      animation: `fadeUp 0.4s ease ${index * 0.12}s both`,
    }}>
      <IconSession n={session.number || index + 1} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fonts.serif, fontSize: '16px', fontWeight: 500, color: colors.text, marginBottom: session.description ? '3px' : 0 }}>
          {session.title}
        </div>
        {session.description && <div style={{ fontSize: '12.5px', color: colors.textSecondary, lineHeight: 1.45 }}>{session.description}</div>}
      </div>
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

// ============================================================
// Session guide — a field card, not an essay. Two views:
//   Before you sit down: read once on the couch.
//   At the table: phone face up next to the box — the one move, the back
//   pocket, a running tally, and capture (snap a photo, catch a saying).
// The guide generates once per afternoon and saves as parts (JSON) in
// interviewer_guides[n]. Older string guides still render.
// ============================================================
function SessionGuide({ project, sessionNumber, onProjectUpdate, onReturnToDashboard, onOpenCapture }) {
  const key = String(sessionNumber);
  const saved = project.interviewer_guides?.[key] || null;
  const [guide, setGuide] = useState(saved);
  const [loading, setLoading] = useState(!saved);
  const [error, setError] = useState('');
  const [view, setView] = useState('before');
  const title = sessionTitle(project, sessionNumber);
  const rel = project.buyer_relationship;
  const S = subjectPronoun(rel);
  const her = S === 'He' ? 'his' : S === 'They' ? 'their' : 'her';

  useEffect(() => {
    if (saved) { setGuide(saved); setLoading(false); return; }
    let cancelled = false;
    const generate = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await authedFetch('/api/claude-guide-magazine', { project, sessionNumber });
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const g = data.guide;
        if (!g || (typeof g === 'object' && !g.job)) throw new Error('Empty guide');
        setGuide(g);
        const guides = { ...(project.interviewer_guides || {}), [key]: g };
        await supabase.from('interview_projects').update({ interviewer_guides: guides }).eq('id', project.id);
        onProjectUpdate({ ...project, interviewer_guides: guides });
      } catch (err) {
        console.error('Guide generation failed:', err);
        if (!cancelled) setError("We couldn't write your guide just now. Try again in a moment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    generate();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, sessionNumber]);

  const regenerate = async () => {
    const guides = { ...(project.interviewer_guides || {}) };
    delete guides[key];
    await supabase.from('interview_projects').update({ interviewer_guides: guides }).eq('id', project.id);
    onProjectUpdate({ ...project, interviewer_guides: guides });
    setGuide(null);
    setLoading(true);
  };

  const isParts = guide && typeof guide === 'object';

  return (
    <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: fonts.sans, color: colors.text }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: `0.5px solid ${colors.border}` }}>
          <Header
            onBack={onReturnToDashboard}
            right={isParts && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setView('before')} style={{ fontSize: '12px', padding: '6px 12px', minHeight: '32px', background: view === 'before' ? 'white' : 'rgba(255,255,255,0.1)', color: view === 'before' ? colors.navy : 'white', border: view === 'before' ? 'none' : '0.5px solid rgba(255,255,255,0.25)', borderRadius: '999px', fontFamily: 'inherit', fontWeight: view === 'before' ? 600 : 400, cursor: 'pointer' }}>Before you sit down</button>
                <button onClick={() => setView('table')} style={{ fontSize: '12px', padding: '6px 12px', minHeight: '32px', background: view === 'table' ? 'white' : 'rgba(255,255,255,0.1)', color: view === 'table' ? colors.navy : 'white', border: view === 'table' ? 'none' : '0.5px solid rgba(255,255,255,0.25)', borderRadius: '999px', fontFamily: 'inherit', fontWeight: view === 'table' ? 600 : 400, cursor: 'pointer' }}>At the table</button>
              </div>
            )}
          />

          {loading && (
            <div style={{ padding: '40px 32px', display: 'flex', gap: '18px', alignItems: 'center' }}>
              <GraceAvatar />
              <div style={{ fontSize: '15px', color: colors.textSecondary }}>Grace is writing your guide for this afternoon…</div>
            </div>
          )}

          {!loading && error && (
            <div style={{ margin: '24px 32px', padding: '14px 16px', background: '#FBE9E7', color: '#B8543D', borderRadius: '8px', fontSize: '14px' }}>
              {error} <button onClick={regenerate} style={{ marginLeft: '8px', fontSize: '13px', background: 'transparent', border: 'none', color: '#B8543D', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>Try again</button>
            </div>
          )}

          {!loading && guide && !isParts && (
            <div style={{ padding: '28px 32px' }}>
              <GuideText text={guide} />
              <div style={{ marginTop: '24px', display: 'flex', gap: '10px' }}>
                <button onClick={regenerate} style={{ fontSize: '13px', padding: '9px 18px', background: 'transparent', border: `0.5px solid ${colors.border}`, borderRadius: '999px', cursor: 'pointer', color: colors.textSecondary, fontFamily: 'inherit' }}>Rewrite as a field card</button>
              </div>
            </div>
          )}

          {!loading && isParts && view === 'before' && (
            <GuideBefore guide={guide} sessionNumber={sessionNumber} title={title} project={project} her={her} onRegenerate={regenerate} onOpenCapture={onOpenCapture} onAtTable={() => setView('table')} />
          )}

          {!loading && isParts && view === 'table' && (
            <GuideAtTable guide={guide} sessionNumber={sessionNumber} project={project} onOpenCapture={onOpenCapture} />
          )}
        </div>
      </div>
    </div>
  );
}

function Eyebrow({ children, light }) {
  return <div style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: light ? colors.gold : colors.tan, fontWeight: 600, marginBottom: '10px' }}>{children}</div>;
}

function GuideBefore({ guide, sessionNumber, title, project, her, onRegenerate, onOpenCapture, onAtTable }) {
  const subject = project.subject_name || 'her';
  return (
    <div className="guide-before">
      {/* Hero */}
      <div style={{ padding: '28px 32px 24px', background: colors.creamLight, borderBottom: `0.5px solid ${colors.border}`, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 300px)', gap: '28px', alignItems: 'start' }} className="guide-hero">
        <div>
          <Eyebrow>Afternoon {sessionNumber} of {TOTAL_SESSIONS} · {title}</Eyebrow>
          <h1 style={{ margin: '0 0 10px', fontFamily: fonts.serif, fontSize: '30px', fontWeight: 500, lineHeight: 1.15 }}>Here's the whole job today.</h1>
          <p style={{ margin: 0, fontSize: '17px', lineHeight: 1.55, color: colors.navy, maxWidth: '560px' }}>{guide.job}</p>
          {guide.chips?.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {guide.chips.map((c, i) => <span key={i} style={{ fontSize: '13px', padding: '7px 12px', background: 'white', border: `1px solid ${colors.border}`, borderRadius: '999px', color: colors.textSecondary }}>{c}</span>)}
            </div>
          )}
        </div>
        {guide.opener && (
          <div style={{ background: 'white', border: `2px solid ${colors.gold}`, borderRadius: '12px', padding: '18px 20px' }}>
            <Eyebrow>Say this to start</Eyebrow>
            <p style={{ margin: 0, fontFamily: fonts.serif, fontStyle: 'italic', fontSize: '16px', lineHeight: 1.5 }}>"{guide.opener.replace(/^"|"$/g, '')}"</p>
          </div>
        )}
      </div>

      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {guide.reassurance && (
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <GraceAvatar />
            <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, color: colors.navy, maxWidth: '680px', paddingTop: '6px' }}>{guide.reassurance}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div style={{ background: colors.creamLight, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '18px 20px' }}>
            <Eyebrow>What you're collecting</Eyebrow>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {guide.collecting.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', border: `1.5px solid ${colors.gray}`, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{c.title}</span>
                  <span style={{ fontSize: '12.5px', color: colors.textSecondary, textAlign: 'right' }}>{c.target}</span>
                </div>
              ))}
            </div>
            {guide.collecting_note && <div style={{ marginTop: '12px', fontSize: '12.5px', color: colors.textTertiary, lineHeight: 1.5 }}>{guide.collecting_note}</div>}
          </div>

          <div style={{ background: colors.navy, color: 'white', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Eyebrow light>Your opening move</Eyebrow>
            <div style={{ fontFamily: fonts.serif, fontSize: '21px', lineHeight: 1.3 }}>{guide.opening_move.line}</div>
            {guide.opening_move.why && <div style={{ fontSize: '13.5px', lineHeight: 1.5, color: 'rgba(255,255,255,0.82)' }}>{guide.opening_move.why}</div>}
            {guide.opening_move.mechanics && <div style={{ marginTop: 'auto', fontSize: '12.5px', color: 'rgba(255,255,255,0.72)', borderTop: '0.5px solid rgba(255,255,255,0.2)', paddingTop: '10px' }}>{guide.opening_move.mechanics}</div>}
          </div>
        </div>

        {guide.doors?.length > 0 && (
          <div style={{ background: colors.creamLight, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '18px 20px' }}>
            <Eyebrow>Doors to open when you need one</Eyebrow>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {guide.doors.map((d, i) => <span key={i} style={{ fontSize: '14px', padding: '10px 14px', background: 'white', border: `1px solid ${colors.gray}`, borderRadius: '999px' }}>{d.replace(/^"|"$/g, '') ? `"${d.replace(/^"|"$/g, '')}"` : ''}</span>)}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {guide.short_answer?.she && (
            <div style={{ background: colors.creamLight, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '18px 20px' }}>
              <Eyebrow>When the answer is short</Eyebrow>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: colors.textTertiary, width: '34px', flexShrink: 0, paddingTop: '3px' }}>{S_LABEL(project.buyer_relationship)}</span>
                  <span style={{ fontSize: '14.5px', background: 'white', border: `0.5px solid ${colors.border}`, borderRadius: '8px', padding: '9px 12px' }}>"{guide.short_answer.she.replace(/^"|"$/g, '')}"</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: colors.textTertiary, width: '34px', flexShrink: 0, paddingTop: '3px' }}>YOU</span>
                  <span style={{ fontSize: '14.5px', background: colors.navy, color: 'white', borderRadius: '8px', padding: '9px 12px' }}>"{guide.short_answer.you.replace(/^"|"$/g, '')}"</span>
                </div>
                {guide.short_answer.then && <div style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5, paddingLeft: '44px' }}>{guide.short_answer.then}</div>}
              </div>
            </div>
          )}
          <div style={{ background: colors.creamWarm, border: `2px solid ${colors.gold}`, borderRadius: '12px', padding: '18px 20px' }}>
            <Eyebrow>Back pocket</Eyebrow>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '14px' }}>
              {guide.back_pocket.map((b, i) => (
                <div key={i}><span style={{ fontWeight: 600 }}>"{b.phrase.replace(/^"|"$/g, '')}"</span>{b.why && <span style={{ color: colors.textSecondary }}> — {b.why}</span>}</div>
              ))}
            </div>
            {guide.silence && <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${colors.border}`, fontFamily: fonts.serif, fontStyle: 'italic', fontSize: '15px', color: colors.navy }}>{guide.silence}</div>}
          </div>
        </div>

        {guide.situations?.length > 0 && (
          <div>
            <Eyebrow>If something comes up</Eyebrow>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
              {guide.situations.map((s, i) => (
                <div key={i} style={{ background: 'white', border: `0.5px solid ${colors.border}`, borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '4px' }}>{s.title}</div>
                  <div style={{ fontSize: '12.5px', color: colors.textSecondary, lineHeight: 1.45 }}>{s.what}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: `0.5px solid ${colors.border}`, gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '13px', color: colors.textSecondary, fontStyle: 'italic' }}>{guide.closing}</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => window.print()} style={{ fontSize: '13px', padding: '9px 16px', minHeight: '44px', background: 'white', border: `1px solid ${colors.gray}`, borderRadius: '999px', cursor: 'pointer', color: colors.textSecondary, fontFamily: 'inherit' }}>Print</button>
            <button onClick={onRegenerate} style={{ fontSize: '13px', padding: '9px 16px', minHeight: '44px', background: 'white', border: `1px solid ${colors.gray}`, borderRadius: '999px', cursor: 'pointer', color: colors.textSecondary, fontFamily: 'inherit' }}>Rewrite</button>
            <button onClick={onAtTable} style={{ fontSize: '14px', padding: '10px 22px', minHeight: '44px', background: colors.navy, color: 'white', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>At the table →</button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) { .guide-hero { grid-template-columns: 1fr !important; } }
        @media print {
          body { background: white !important; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function S_LABEL(relationship) {
  const S = subjectPronoun(relationship);
  return S === 'He' ? 'HE' : S === 'They' ? 'THEY' : 'SHE';
}

// At the table: the one move, the back pocket, a running tally, and capture.
function GuideAtTable({ guide, sessionNumber, project, onOpenCapture }) {
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [sessionRow, setSessionRow] = useState(null);
  const [busy, setBusy] = useState('');
  const [sayingDraft, setSayingDraft] = useState('');
  const [sayingOpen, setSayingOpen] = useState(false);
  const [photoNote, setPhotoNote] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [openSituation, setOpenSituation] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  // Load what's already been captured for this afternoon.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: s } = await supabase
        .from('interview_sessions')
        .select('id, session_number, quick_notes')
        .eq('project_id', project.id)
        .eq('session_number', sessionNumber)
        .maybeSingle();
      const { data: p } = await supabase
        .from('interview_photos')
        .select('id, note, storage_path, created_at')
        .eq('project_id', project.id)
        .eq('session_number', sessionNumber)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      setSessionRow(s || null);
      setNotes(Array.isArray(s?.quick_notes) ? s.quick_notes : []);
      setPhotos(p || []);
    };
    load();
    return () => { cancelled = true; };
  }, [project.id, sessionNumber]);

  const ensureSession = async () => {
    if (sessionRow) return sessionRow;
    const { data, error: err } = await supabase
      .from('interview_sessions')
      .upsert({ project_id: project.id, session_number: sessionNumber, title: sessionTitle(project, sessionNumber) }, { onConflict: 'project_id,session_number' })
      .select('id, session_number, quick_notes')
      .single();
    if (err) throw err;
    setSessionRow(data);
    return data;
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingFile(f);
    setPhotoNote('');
    e.target.value = '';
  };

  const savePhoto = async () => {
    if (!pendingFile) return;
    setBusy('photo');
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      await ensureSession();
      const ext = (pendingFile.name.split('.').pop() || 'jpg').toLowerCase();
      const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}`;
      const path = `${user.id}/${project.id}/${id}.${ext}`;
      const { error: upErr } = await supabase.storage.from('session-photos').upload(path, pendingFile, { upsert: false, contentType: pendingFile.type || undefined });
      if (upErr) throw upErr;
      const { data: row, error: insErr } = await supabase
        .from('interview_photos')
        .insert({ project_id: project.id, session_number: sessionNumber, storage_path: path, note: photoNote.trim() || null, sort_order: photos.length })
        .select('id, note, storage_path, created_at')
        .single();
      if (insErr) throw insErr;
      setPhotos([...photos, row]);
      setPendingFile(null);
      setPhotoNote('');
    } catch (e) {
      console.error('Photo save failed:', e);
      setError("That photo didn't save. Try again.");
    } finally {
      setBusy('');
    }
  };

  const saveSaying = async () => {
    const text = sayingDraft.trim();
    if (!text) return;
    setBusy('saying');
    setError('');
    try {
      const row = await ensureSession();
      const next = [...notes, { type: 'saying', text, at: new Date().toISOString() }];
      const { error: err } = await supabase.from('interview_sessions').update({ quick_notes: next }).eq('id', row.id);
      if (err) throw err;
      setNotes(next);
      setSayingDraft('');
      setSayingOpen(false);
    } catch (e) {
      console.error('Saying save failed:', e);
      setError("That didn't save. Try again.");
    } finally {
      setBusy('');
    }
  };

  const sayings = notes.filter(n => n.type === 'saying');
  const isShoebox = guide.session?.collects?.includes('shoebox');

  return (
    <div style={{ background: colors.creamLight }}>
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '520px', margin: '0 auto' }}>
        <div style={{ background: colors.navy, color: 'white', borderRadius: '12px', padding: '16px' }}>
          <Eyebrow light>The one move</Eyebrow>
          <div style={{ fontFamily: fonts.serif, fontSize: '21px', lineHeight: 1.25 }}>{guide.opening_move.line}</div>
        </div>

        <div style={{ background: colors.creamWarm, border: `2px solid ${colors.gold}`, borderRadius: '12px', padding: '14px 16px' }}>
          <Eyebrow>When the answer is short</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '16px', lineHeight: 1.3 }}>
            {guide.back_pocket.slice(0, 5).map((b, i) => <div key={i}>"{b.phrase.replace(/^"|"$/g, '')}"</div>)}
          </div>
          {guide.silence && <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${colors.border}`, fontFamily: fonts.serif, fontStyle: 'italic', fontSize: '14px', color: colors.navy }}>{guide.silence}</div>}
        </div>

        {guide.doors?.length > 0 && (
          <div>
            <Eyebrow>Doors to open</Eyebrow>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {guide.doors.map((d, i) => <span key={i} style={{ fontSize: '14px', padding: '10px 12px', minHeight: '44px', display: 'flex', alignItems: 'center', background: 'white', border: `1px solid ${colors.gray}`, borderRadius: '999px', whiteSpace: 'nowrap' }}>"{d.replace(/^"|"$/g, '')}"</span>)}
            </div>
          </div>
        )}

        <div style={{ background: 'white', border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Eyebrow>So far</Eyebrow>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}><span>Photos snapped</span><span style={{ fontWeight: 600 }}>{photos.length}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}><span>Sayings caught</span><span style={{ fontWeight: 600 }}>{sayings.length}</span></div>
          {sayings.length > 0 && (
            <div style={{ borderTop: `0.5px solid ${colors.border}`, paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {sayings.slice(-3).map((s, i) => <div key={i} style={{ fontSize: '13px', fontStyle: 'italic', color: colors.textSecondary }}>"{s.text}"</div>)}
            </div>
          )}
        </div>

        {guide.situations?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {guide.situations.map((s, i) => (
              <div key={i}>
                <button onClick={() => setOpenSituation(openSituation === i ? null : i)} style={{ width: '100%', textAlign: 'left', fontSize: '14px', padding: '11px 14px', minHeight: '44px', background: 'white', border: `0.5px solid ${colors.border}`, borderRadius: '10px', fontFamily: 'inherit', color: colors.text, display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <span>{s.title}</span><span style={{ color: colors.textTertiary }}>{openSituation === i ? '–' : '›'}</span>
                </button>
                {openSituation === i && <div style={{ padding: '8px 14px 4px', fontSize: '13.5px', color: colors.textSecondary, lineHeight: 1.5 }}>{s.what}</div>}
              </div>
            ))}
          </div>
        )}

        {error && <div style={{ padding: '10px 14px', background: '#FBE9E7', color: '#B8543D', borderRadius: '6px', fontSize: '13px' }}>{error}</div>}

        {/* Capture */}
        {pendingFile && (
          <div style={{ background: 'white', border: `2px solid ${colors.gold}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Eyebrow>Photo ready — one quick note so Grace can match it later</Eyebrow>
            <TextInput value={photoNote} onChange={setPhotoNote} placeholder="the barn picture · Mom and Aunt Jo, 1962" onEnter={savePhoto} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={savePhoto} disabled={busy === 'photo'} style={{ flex: 1, fontSize: '15px', padding: '12px', minHeight: '48px', background: colors.navy, color: 'white', border: 'none', borderRadius: '10px', fontFamily: 'inherit', cursor: 'pointer' }}>{busy === 'photo' ? 'Saving…' : 'Save photo'}</button>
              <button onClick={() => setPendingFile(null)} style={{ fontSize: '14px', padding: '12px 16px', minHeight: '48px', background: 'white', border: `1px solid ${colors.gray}`, borderRadius: '10px', fontFamily: 'inherit', color: colors.textSecondary, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
        {sayingOpen && (
          <div style={{ background: 'white', border: `2px solid ${colors.gold}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Eyebrow>Word for word</Eyebrow>
            <TextInput value={sayingDraft} onChange={setSayingDraft} placeholder={'"If you’re going to do a thing, do it."'} onEnter={saveSaying} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveSaying} disabled={busy === 'saying'} style={{ flex: 1, fontSize: '15px', padding: '12px', minHeight: '48px', background: colors.navy, color: 'white', border: 'none', borderRadius: '10px', fontFamily: 'inherit', cursor: 'pointer' }}>{busy === 'saying' ? 'Saving…' : 'Save saying'}</button>
              <button onClick={() => { setSayingOpen(false); setSayingDraft(''); }} style={{ fontSize: '14px', padding: '12px 16px', minHeight: '48px', background: 'white', border: `1px solid ${colors.gray}`, borderRadius: '10px', fontFamily: 'inherit', color: colors.textSecondary, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'sticky', bottom: 0, padding: '12px 20px 18px', background: colors.creamLight, borderTop: `0.5px solid ${colors.border}` }}>
        <div style={{ maxWidth: '520px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPickFile} style={{ display: 'none' }} aria-label="Snap a photo" />
          <button onClick={() => fileRef.current?.click()} style={{ fontSize: '15px', padding: '14px', minHeight: '52px', background: 'white', border: `1px solid ${colors.gray}`, borderRadius: '10px', fontFamily: 'inherit', color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.navy} strokeWidth="1.8" aria-hidden="true"><path d="M4 7h3l2-3h6l2 3h3v12H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
            {isShoebox ? 'Snap a photo' : 'Add a photo'}
          </button>
          <button onClick={() => setSayingOpen(true)} style={{ fontSize: '15px', padding: '14px', minHeight: '52px', background: colors.navy, color: 'white', border: 'none', borderRadius: '10px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" aria-hidden="true"><path d="M4 20h16M6 16l10-10 2 2L8 18H6z" /></svg>
            Catch a saying
          </button>
        </div>
        <div style={{ maxWidth: '520px', margin: '10px auto 0', textAlign: 'center' }}>
          <button onClick={onOpenCapture} style={{ fontSize: '13px', background: 'transparent', border: 'none', color: colors.textSecondary, textDecoration: 'underline', fontFamily: 'inherit', cursor: 'pointer', minHeight: '44px' }}>We're done — bring in the recording →</button>
        </div>
      </div>
    </div>
  );
}

// Renders an older prose guide (markdown-lite). Kept for guides written before the field-card layout.
function GuideText({ text }) {
  const lines = text.split('\n');
  const blocks = [];
  let para = [];
  let list = [];
  const flushPara = () => { if (para.length) { blocks.push({ type: 'p', text: para.join(' ') }); para = []; } };
  const flushList = () => { if (list.length) { blocks.push({ type: 'ul', items: list }); list = []; } };
  lines.forEach(raw => {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); return; }
    if (line.startsWith('## ')) { flushPara(); flushList(); blocks.push({ type: 'h2', text: line.slice(3) }); return; }
    if (line.startsWith('# ')) { flushPara(); flushList(); blocks.push({ type: 'h2', text: line.slice(2) }); return; }
    if (line.startsWith('- ') || line.startsWith('• ')) { flushPara(); list.push(line.slice(2)); return; }
    flushList();
    para.push(line);
  });
  flushPara(); flushList();

  return (
    <div style={{ maxWidth: '680px' }}>
      {blocks.map((b, i) => {
        if (b.type === 'h2') return (
          <h2 key={i} style={{ fontFamily: fonts.serif, fontSize: '20px', fontWeight: 500, margin: i === 0 ? '0 0 12px' : '30px 0 12px', color: colors.navy }}>{b.text}</h2>
        );
        if (b.type === 'ul') return (
          <ul key={i} style={{ margin: '0 0 14px', paddingLeft: '22px', fontSize: '15px', lineHeight: 1.7, color: colors.text }}>
            {b.items.map((it, j) => <li key={j} style={{ marginBottom: '6px' }}>{it}</li>)}
          </ul>
        );
        return <p key={i} style={{ fontSize: '15.5px', lineHeight: 1.75, color: colors.text, margin: '0 0 14px' }}>{b.text}</p>;
      })}
    </div>
  );
}

// ============================================================
// After the afternoon: bring in the recording → Grace files the pieces →
// review page by page → approve → (after afternoon 1) choose the feature.
// ============================================================
const AUDIO_BUCKET = 'conversation-audio';
const PHOTO_BUCKET = 'session-photos';

function pieceCount(p) {
  if (!p) return 0;
  if (Array.isArray(p.items)) return p.items.length;
  return 1;
}


// ---- Reconciling pieces across afternoons -------------------------------
// Afternoons overlap: a story told briefly on afternoon 1 and in full on
// afternoon 2, the same saying caught twice, advice repeated. These helpers
// find the overlaps so the issue shows each thing once.
function normText(t, n = 80) {
  return String(t || '').toLowerCase().replace(/[“”"'‘’]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
}
function sameish(a, b) {
  const x = normText(a, 120), y = normText(b, 120);
  if (!x || !y) return false;
  if (x === y) return true;
  const shorter = x.length < y.length ? x : y;
  const longer = x.length < y.length ? y : x;
  if (shorter.length < 24) return false;
  // Same opening (first ~30 chars) or the shorter one contained in the longer.
  return longer.startsWith(shorter.slice(0, 30)) || longer.includes(shorter.slice(0, 40));
}
function pieceText(p) {
  if (!p) return '';
  if (Array.isArray(p.items)) return '';
  return p.title ? `${p.title} ${p.body || ''}` : (p.body || p.closing || p.intro || '');
}
// Flatten approved sessions into one reconciled piece list. Later afternoons win.
function reconcilePieces(sessions) {
  const all = sessions
    .slice()
    .sort((a, b) => a.session_number - b.session_number)
    .flatMap(s => (s.pieces?.pieces || []).map(p => ({ ...p, _session: s.session_number })));
  const out = [];
  const seenSayings = new Set();
  const seenAdvice = new Set();
  const featureTitles = all.filter(p => p.department === 'feature').map(p => normText(p.title, 60));

  // Story-shaped pieces: drop earlier versions that match a later one by title or opening.
  const stories = all.filter(p => !Array.isArray(p.items) && !['until_next_time', 'kitchen', 'present'].includes(p.department));
  const keepStory = new Set();
  stories.forEach((p, i) => {
    let superseded = false;
    for (let j = i + 1; j < stories.length; j++) {
      const q = stories[j];
      const sameTitle = p.title && q.title && normText(p.title, 60) === normText(q.title, 60);
      const sameOpening = sameish((p.body || '').slice(0, 160), (q.body || '').slice(0, 160));
      if (sameTitle || sameOpening) { superseded = true; break; }
    }
    // A Family Story or Laughter piece with the feature's title yields to the feature.
    if (!superseded && p.department !== 'feature' && p.title && featureTitles.includes(normText(p.title, 60))) superseded = true;
    if (!superseded) keepStory.add(p);
  });

  // Item pages (sayings, advice): the LATER telling wins, matched loosely.
  const keepItem = new Map(); // piece -> items to keep
  [...all].reverse().forEach(p => {
    if (!Array.isArray(p.items)) return;
    const seen = p.department === 'sayings' ? seenSayings : p.department === 'know_now' ? seenAdvice : null;
    const items = p.items.filter(it => {
      if (!seen) return true;
      const text = it.quote ?? it.advice ?? it.text ?? '';
      if (!normText(text)) return false;
      for (const prev of seen) if (sameish(prev, text)) return false;
      seen.add(text);
      return true;
    });
    keepItem.set(p, items);
  });

  all.forEach(p => {
    if (Array.isArray(p.items)) {
      const items = keepItem.get(p) || [];
      if (items.length) out.push({ ...p, items });
      return;
    }
    if (['until_next_time', 'kitchen', 'present'].includes(p.department)) { out.push(p); return; }
    if (keepStory.has(p)) out.push(p);
  });
  return out;
}
// What earlier afternoons filed, for the draft endpoint and the review warnings.
function filedSoFar(sessions) {
  const pieces = reconcilePieces(sessions);
  return {
    titles: pieces.filter(p => p.title && !Array.isArray(p.items)).map(p => p.title),
    sayings: pieces.filter(p => p.department === 'sayings').flatMap(p => p.items.map(it => it.quote)).filter(Boolean),
    advice: pieces.filter(p => p.department === 'know_now').flatMap(p => p.items.map(it => it.advice || it.quote || it.text)).filter(Boolean),
    bySession: pieces,
  };
}
function formatDateish(v) {
  if (!v) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
  if (!m) return String(v);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];

function CaptureSession({ project, sessionNumber, onProjectUpdate, onReturnToDashboard, onOpenGuide }) {
  const [stage, setStage] = useState('loading'); // loading | bring | filing | review | feature
  const [row, setRow] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [photoUrls, setPhotoUrls] = useState({});
  const [draft, setDraft] = useState(null);
  const [prior, setPrior] = useState([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const title = sessionTitle(project, sessionNumber);
  const S = subjectPronoun(project.buyer_relationship);
  const sheIs = S === 'He' ? 'he' : S === 'They' ? 'they' : 'she';
  const herHis = S === 'He' ? 'his' : S === 'They' ? 'their' : 'her';
  const subject = project.subject_name || (S === 'He' ? 'him' : S === 'They' ? 'them' : 'her');

  // Load the afternoon's row and its photos.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: s } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('project_id', project.id)
        .eq('session_number', sessionNumber)
        .maybeSingle();
      const { data: p } = await supabase
        .from('interview_photos')
        .select('*')
        .eq('project_id', project.id)
        .eq('session_number', sessionNumber)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      const { data: earlier } = await supabase
        .from('interview_sessions')
        .select('session_number, pieces, approved')
        .eq('project_id', project.id)
        .lt('session_number', sessionNumber)
        .eq('approved', true);
      if (cancelled) return;
      setRow(s || null);
      setPhotos(p || []);
      setPrior((earlier || []).filter(x => x.pieces));
      if (p && p.length) {
        const { data: signed } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(p.map(x => x.storage_path), 3600);
        if (!cancelled && signed) {
          const map = {};
          signed.forEach((x, i) => { if (x?.signedUrl) map[p[i].id] = x.signedUrl; });
          setPhotoUrls(map);
        }
      }
      if (s?.pieces) {
        setDraft(s.pieces);
        setStage(s.approved && sessionNumber === 1 && !project.feature_title ? 'feature' : 'review');
      } else {
        setStage('bring');
      }
    };
    load();
    return () => { cancelled = true; };
  }, [project.id, sessionNumber]);

  const ensureRow = async (updates = {}) => {
    const { data, error: err } = await supabase
      .from('interview_sessions')
      .upsert({ project_id: project.id, session_number: sessionNumber, title, ...updates }, { onConflict: 'project_id,session_number' })
      .select('*')
      .single();
    if (err) throw err;
    setRow(data);
    return data;
  };

  // ---- Bring in the recording ------------------------------------------
  const fileIt = async ({ audioFile, pastedText, recordedOn, recordedWhere, othersPresent }) => {
    setError('');
    setStage('filing');
    try {
      let transcript = (pastedText || '').trim();
      let audioPath = null;

      if (audioFile) {
        setProgress('Uploading the recording…');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not signed in');
        const ext = (audioFile.name.split('.').pop() || 'm4a').toLowerCase();
        audioPath = `${user.id}/${project.id}-mag${sessionNumber}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(AUDIO_BUCKET).upload(audioPath, audioFile, { upsert: true, contentType: audioFile.type || undefined });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

        setProgress('Listening to the whole thing… this takes a couple of minutes for a long recording.');
        const { data: signed, error: signErr } = await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(audioPath, 3600);
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
        transcript = (tData.transcript || '').trim();
        if (!transcript) throw new Error('The recording came back empty — check that the file plays back with sound.');
      }

      if (!transcript) throw new Error('Add the recording or paste what was said.');

      const saved = await ensureRow({
        transcript,
        audio_path: audioPath,
        recorded_on: recordedOn || null,
        recorded_where: recordedWhere || null,
        others_present: othersPresent || null,
      });

      setProgress('Grace is filing the pieces into the pages…');
      const quickNotes = Array.isArray(saved.quick_notes) ? saved.quick_notes : [];
      const dRes = await authedFetch('/api/claude-draft-magazine', {
        transcript,
        project,
        sessionNumber,
        photos: photos.map(p => ({ id: p.id, note: p.note || '' })),
        quickNotes,
        alreadyFiled: (() => { const f = filedSoFar(prior); return { titles: f.titles, sayings: f.sayings, advice: f.advice }; })(),
      });
      if (!dRes.ok) {
        const d = await dRes.json().catch(() => ({}));
        throw new Error(d.error || 'Grace could not file the pieces');
      }
      const dData = await dRes.json();
      const pieces = dData.draft;
      await supabase.from('interview_sessions').update({ pieces, editor_note: pieces.editor_note || null }).eq('id', saved.id);
      setRow({ ...saved, pieces, editor_note: pieces.editor_note || null });
      setDraft(pieces);
      setStage('review');
    } catch (e) {
      console.error('Filing failed:', e);
      setError(e.message || 'Something went wrong.');
      setStage('bring');
    } finally {
      setProgress('');
    }
  };

  // ---- Review -------------------------------------------------------------
  const saveDraft = async (next) => {
    if (!row) return;
    const { error: err } = await supabase.from('interview_sessions').update({ pieces: next }).eq('id', row.id);
    if (err) { setError("That didn't save. Try again."); return false; }
    setRow({ ...row, pieces: next });
    return true;
  };

  const revise = async (request) => {
    if (!row?.transcript || !draft) return;
    setError('');
    setStage('filing');
    setProgress('Grace is making that change…');
    try {
      const dRes = await authedFetch('/api/claude-draft-magazine', {
        transcript: row.transcript,
        project,
        sessionNumber,
        photos: photos.map(p => ({ id: p.id, note: p.note || '' })),
        quickNotes: Array.isArray(row.quick_notes) ? row.quick_notes : [],
        alreadyFiled: (() => { const f = filedSoFar(prior); return { titles: f.titles, sayings: f.sayings, advice: f.advice }; })(),
        revisionRequest: request,
        existingDraft: draft,
      });
      if (!dRes.ok) throw new Error('Grace could not make that change');
      const dData = await dRes.json();
      const pieces = dData.draft;
      await supabase.from('interview_sessions').update({ pieces, editor_note: pieces.editor_note || null }).eq('id', row.id);
      setRow({ ...row, pieces, editor_note: pieces.editor_note || null });
      setDraft(pieces);
    } catch (e) {
      console.error('Revision failed:', e);
      setError(e.message || 'Something went wrong.');
    } finally {
      setProgress('');
      setStage('review');
    }
  };

  const approve = async () => {
    if (!row || !draft) return;
    setError('');
    const ok = await saveDraft(draft);
    if (!ok) return;
    // Write shoebox captions back to the photos so the issue can lay them out.
    const shoebox = draft.pieces.find(p => p.department === 'shoebox');
    if (shoebox && Array.isArray(shoebox.items)) {
      for (const it of shoebox.items) {
        if (!it.photo_id) continue;
        await supabase.from('interview_photos').update({
          who: it.who || null, where_taken: it.where || null, when_taken: it.when || null, caption: it.caption || null,
          is_cover: Boolean(it.is_cover) || undefined,
        }).eq('id', it.photo_id);
      }
    }
    const { error: err } = await supabase.from('interview_sessions').update({ approved: true, approved_at: new Date().toISOString() }).eq('id', row.id);
    if (err) { setError("That didn't save. Try again."); return; }
    setRow({ ...row, approved: true });
    if (sessionNumber === 1 && !project.feature_title) setStage('feature');
    else onReturnToDashboard();
  };

  const chooseFeature = async (name) => {
    const t = (name || '').trim();
    if (!t) return;
    const { error: err } = await supabase.from('interview_projects').update({ feature_title: t, current_step: 'session_2' }).eq('id', project.id);
    if (err) { setError("That didn't save. Try again."); return; }
    onProjectUpdate({ ...project, feature_title: t, current_step: 'session_2' });
    onOpenGuide(2);
  };

  // ---- Render ----------------------------------------------------------------
  const sayingsCaught = (row?.quick_notes || []).filter(n => n?.type === 'saying');

  return (
    <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: fonts.sans, color: colors.text }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: `0.5px solid ${colors.border}` }}>
          <Header onBack={onReturnToDashboard} rightText={`Afternoon ${sessionNumber} · ${title}`} />

          {stage === 'loading' && <div style={{ padding: '40px 32px', color: colors.textSecondary }}>Loading…</div>}

          {stage === 'bring' && (
            <BringRecording
              subject={subject} sheIs={sheIs}
              photosCount={photos.length} sayings={sayingsCaught}
              row={row} error={error} onFile={fileIt}
            />
          )}

          {stage === 'filing' && (
            <div style={{ padding: '48px 32px', display: 'flex', gap: '18px', alignItems: 'center' }}>
              <GraceAvatar size="large" />
              <div>
                <div style={{ fontFamily: fonts.serif, fontSize: '20px', fontWeight: 500, marginBottom: '6px' }}>{progress || 'Working…'}</div>
                <div style={{ fontSize: '14px', color: colors.textSecondary }}>You can leave this page and come back; nothing is lost.</div>
              </div>
            </div>
          )}

          {stage === 'review' && draft && (
            <ReviewPieces
              project={project} draft={draft} setDraft={setDraft}
              photos={photos} photoUrls={photoUrls}
              prior={prior}
              approved={Boolean(row?.approved)}
              error={error}
              onSave={() => saveDraft(draft)}
              onRevise={revise}
              onApprove={approve}
              onChooseFeature={sessionNumber === 1 ? () => setStage('feature') : null}
            />
          )}

          {stage === 'feature' && (
            <ChooseFeature
              project={project} draft={draft} subject={subject} herHis={herHis}
              error={error} onChoose={chooseFeature}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Bring in the recording -------------------------------------------------
function BringRecording({ subject, sheIs, photosCount, sayings, row, error, onFile }) {
  const [audioFile, setAudioFile] = useState(null);
  const [pasted, setPasted] = useState(row?.transcript || '');
  const [recordedOn, setRecordedOn] = useState(row?.recorded_on || '');
  const [recordedWhere, setRecordedWhere] = useState(row?.recorded_where || '');
  const [others, setOthers] = useState(row?.others_present || '');
  const fileRef = useRef(null);
  const ready = Boolean(audioFile) || pasted.trim().length > 0;

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <GraceSays heading="How did it go? Bring me the recording." text={`I'll listen to the whole thing and file what ${sheIs} said into the pages — ${sheIs === 'they' ? 'their' : sheIs === 'he' ? 'his' : 'her'} words, not mine. You'll read it over before anything goes in the issue.`} />

      {(photosCount > 0 || sayings.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {photosCount > 0 && (
            <div style={{ background: colors.creamLight, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{photosCount} photo{photosCount === 1 ? '' : 's'} snapped at the table</div>
              <div style={{ fontSize: '12.5px', color: colors.textSecondary }}>Grace will match each one to what {sheIs} said about it.</div>
            </div>
          )}
          {sayings.length > 0 && (
            <div style={{ background: colors.creamLight, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{sayings.length} saying{sayings.length === 1 ? '' : 's'} caught, word for word</div>
              <div style={{ fontSize: '12.5px', color: colors.textSecondary, fontStyle: 'italic' }}>"{sayings[sayings.length - 1].text}"{sayings.length > 1 ? ` and ${sayings.length - 1} more` : ''}</div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
        <div style={{ background: colors.creamWarm, border: `2px solid ${colors.gold}`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Eyebrow>The recording</Eyebrow>
          <input ref={fileRef} type="file" accept="audio/*,.m4a,.mp3,.wav,.aac,.mp4,.mov" onChange={e => setAudioFile(e.target.files?.[0] || null)} style={{ display: 'none' }} aria-label="Choose the recording" />
          <button onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${colors.gray}`, borderRadius: '10px', padding: '24px', textAlign: 'center', background: audioFile ? colors.creamLight : 'white', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minHeight: '44px' }}>
            {audioFile ? (
              <>
                <div style={{ fontSize: '15px', fontWeight: 600, color: colors.text }}>{audioFile.name}</div>
                <div style={{ fontSize: '12.5px', color: colors.textSecondary }}>{(audioFile.size / (1024 * 1024)).toFixed(1)} MB · tap to choose a different file</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '15px', fontWeight: 600, color: colors.text }}>Choose the voice memo</div>
                <div style={{ fontSize: '12.5px', color: colors.textSecondary }}>m4a, mp3, wav — up to about two hours</div>
              </>
            )}
          </button>
          <div style={{ fontSize: '12.5px', color: colors.textSecondary, lineHeight: 1.5 }}>From your phone: open Voice Memos, tap share, choose "Save to Files," then pick it here.</div>
        </div>
        <div style={{ background: colors.creamLight, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Eyebrow>Or paste a transcript</Eyebrow>
          <TextArea value={pasted} onChange={setPasted} rows={5} placeholder="If you already have the words written down, paste them here." />
          <div style={{ fontSize: '12.5px', color: colors.textSecondary, lineHeight: 1.5 }}>No recording and no notes? Type what you remember {sheIs === 'they' ? 'them' : sheIs === 'he' ? 'him' : 'her'} saying, and Grace will file what's there.</div>
        </div>
      </div>

      <Panel>
        <Eyebrow>For the "how this issue was made" page</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div><FieldLabel small htmlFor="cap-when">When</FieldLabel><TextInput id="cap-when" value={recordedOn} onChange={setRecordedOn} placeholder="2026-11-08 or Nov 8, 2026" /></div>
          <div><FieldLabel small htmlFor="cap-where">Where</FieldLabel><TextInput id="cap-where" value={recordedWhere} onChange={setRecordedWhere} placeholder="her kitchen table in Dayton" /></div>
          <div><FieldLabel small htmlFor="cap-who">Who else was there</FieldLabel><TextInput id="cap-who" value={others} onChange={setOthers} placeholder="Just the two of us" /></div>
        </div>
      </Panel>

      {error && <div style={{ padding: '10px 14px', background: '#FBE9E7', color: '#B8543D', borderRadius: '6px', fontSize: '13px' }}>{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: `0.5px solid ${colors.border}`, gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '13px', color: colors.textSecondary }}>Filing usually takes two or three minutes. You can leave and come back.</div>
        <PrimaryButton disabled={!ready} onClick={() => onFile({ audioFile, pastedText: audioFile ? '' : pasted, recordedOn, recordedWhere, othersPresent: others })}>Let Grace file it →</PrimaryButton>
      </div>
    </div>
  );
}

// ---- Review the pieces ---------------------------------------------------------
function ReviewPieces({ project, draft, setDraft, photos, photoUrls, prior = [], approved, error, onSave, onRevise, onApprove, onChooseFeature }) {
  // Earlier afternoons' pieces, to flag what this one repeats.
  const filed = filedSoFar(prior);
  const dupOfStory = (p) => {
    if (Array.isArray(p.items) || !p.title) return null;
    const hit = filed.bySession.find(q => !Array.isArray(q.items) && q.title && (normText(q.title, 60) === normText(p.title, 60) || sameish((q.body || '').slice(0, 160), (p.body || '').slice(0, 160))));
    return hit ? hit._session : null;
  };
  const dupOfItem = (dept, it) => {
    const key = it.quote ?? it.advice ?? it.text ?? '';
    const list = dept === 'sayings' ? filed.sayings : dept === 'know_now' ? filed.advice : [];
    return list.some(x => sameish(x, key));
  };
  const departments = activeDepartments(project).filter(d => d.state !== 'out');
  const byDept = {};
  draft.pieces.forEach((p, i) => { (byDept[p.department] = byDept[p.department] || []).push(i); });
  const pageList = departments
    .filter(d => d.id !== 'until_next_time' || byDept.until_next_time)
    .map(d => ({ id: d.id, title: d.title, count: (byDept[d.id] || []).reduce((n, i) => n + pieceCount(draft.pieces[i]), 0) }));
  // Pieces filed to a page that isn't in the plan (e.g. the family dropped it) still show.
  Object.keys(byDept).forEach(id => { if (!pageList.some(p => p.id === id)) pageList.push({ id, title: id === 'present' ? 'The Back Cover' : id, count: byDept[id].reduce((n, i) => n + pieceCount(draft.pieces[i]), 0) }); });
  const firstWithPieces = pageList.find(p => p.count > 0)?.id || pageList[0]?.id;
  const [page, setPage] = useState(firstWithPieces);
  const [ask, setAsk] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const pieceIdxs = byDept[page] || [];
  const S = subjectPronoun(project.buyer_relationship);
  const herHis = S === 'He' ? 'his' : S === 'They' ? 'their' : 'her';

  const update = (i, patch) => {
    const next = { ...draft, pieces: draft.pieces.map((p, j) => (j === i ? { ...p, ...patch } : p)) };
    setDraft(next); setDirty(true);
  };
  const updateItem = (i, k, patch) => {
    const items = draft.pieces[i].items.map((it, m) => (m === k ? { ...it, ...patch } : it));
    update(i, { items });
  };
  const leaveOut = (i, k) => {
    const label = k === undefined ? 'this piece' : 'this one';
    if (!window.confirm(`Leave ${label} out of the issue? You can ask Grace to bring it back later.`)) return;
    if (k === undefined) {
      const next = { ...draft, pieces: draft.pieces.filter((_, j) => j !== i) };
      setDraft(next); setDirty(true);
    } else {
      const items = draft.pieces[i].items.filter((_, m) => m !== k);
      update(i, { items });
    }
  };
  const moveTo = (i, dept) => { if (dept) update(i, { department: dept }); };
  const save = async () => { setSaving(true); await onSave(); setSaving(false); setDirty(false); };
  const approveAll = async () => { setSaving(true); await onApprove(); setSaving(false); };

  const pageTitle = pageList.find(p => p.id === page)?.title || page;

  return (
    <div>
      <div style={{ padding: '22px 32px 18px', background: colors.creamLight, borderBottom: `0.5px solid ${colors.border}`, display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <GraceAvatar size="large" />
        <div style={{ fontSize: '15px', lineHeight: 1.6, color: colors.navy, maxWidth: '700px' }}>
          <div style={{ fontFamily: fonts.serif, fontSize: '22px', fontWeight: 500, marginBottom: '4px' }}>{approved ? 'This afternoon is filed.' : "Here's what the afternoon produced."}</div>
          {draft.editor_note} {approved ? 'You can still change any piece here.' : 'Read each piece, change anything, then approve the afternoon.'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 200px) minmax(0, 1fr)' }} className="review-grid">
        <div style={{ background: colors.creamLight, borderRight: `0.5px solid ${colors.border}`, padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: colors.tan, fontWeight: 600, marginBottom: '6px', paddingLeft: '10px' }}>Filed to</div>
          {pageList.map(p => (
            <button key={p.id} onClick={() => setPage(p.id)} style={{ textAlign: 'left', fontSize: '14px', padding: '10px', minHeight: '44px', background: page === p.id ? 'white' : 'transparent', border: `1px solid ${page === p.id ? colors.gold : 'transparent'}`, borderRadius: '8px', fontFamily: 'inherit', display: 'flex', justifyContent: 'space-between', color: p.count ? colors.text : colors.textTertiary, cursor: 'pointer' }}>
              <span>{p.title}</span><span style={{ color: colors.textSecondary }}>{p.count || '—'}</span>
            </button>
          ))}
          <div style={{ marginTop: 'auto', padding: '12px 10px 0', fontSize: '12.5px', color: colors.textSecondary, lineHeight: 1.5, borderTop: `0.5px solid ${colors.border}` }}>Empty pages fill in over the next afternoons. Nothing is padded.</div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontFamily: fonts.serif, fontSize: '20px', fontWeight: 500 }}>{pageTitle}</div>
            <div style={{ fontSize: '12.5px', color: colors.textSecondary }}>Tap any text to change it. {S === 'They' ? 'Their' : S === 'He' ? 'His' : 'Her'} words stay {S === 'They' ? 'theirs' : S === 'He' ? 'his' : 'hers'}.</div>
          </div>

          {pieceIdxs.length === 0 && (
            <div style={{ padding: '18px', background: colors.creamLight, border: `1px dashed ${colors.gray}`, borderRadius: '12px', fontSize: '14px', color: colors.textSecondary }}>Nothing filed here from this afternoon.</div>
          )}

          {pieceIdxs.map(i => {
            const p = draft.pieces[i];
            if (p.department === 'shoebox' && Array.isArray(p.items)) {
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {p.items.map((it, k) => {
                    const photo = photos.find(x => x.id === it.photo_id);
                    const url = photo ? photoUrls[photo.id] : null;
                    const matched = Boolean(it.caption);
                    return (
                      <div key={k} style={{ background: matched ? colors.creamLight : 'white', border: matched ? `0.5px solid ${colors.border}` : `1px dashed ${colors.gray}`, borderRadius: '12px', padding: '14px 16px', display: 'grid', gridTemplateColumns: 'minmax(0, 140px) minmax(0, 1fr)', gap: '14px' }}>
                        <div style={{ height: '110px', background: '#E3DACB', border: '1px dashed #B8AB95', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#6E6353', fontStyle: 'italic', textAlign: 'center', padding: '6px' }}>
                          {url ? <img src={url} alt={photo?.note || 'Photograph'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (photo?.note || 'No photo matched')}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                          {!matched && <div style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5 }}>Grace couldn't tell which part of the recording goes with this one. Add what {S === 'They' ? 'they' : S === 'He' ? 'he' : 'she'} said, or leave it for the family to fill in.</div>}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '8px' }}>
                            <SmallInput value={it.who || ''} onChange={v => updateItem(i, k, { who: v })} placeholder="Who" />
                            <SmallInput value={it.where || ''} onChange={v => updateItem(i, k, { where: v })} placeholder="Where" />
                            <SmallInput value={it.when || ''} onChange={v => updateItem(i, k, { when: v })} placeholder="Year" />
                          </div>
                          <PieceTextArea value={it.caption || ''} onChange={v => updateItem(i, k, { caption: v })} rows={2} placeholder={`One or two lines in ${herHis} words about this picture`} />
                          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', flexWrap: 'wrap' }}>
                            <LinkButton onClick={() => { p.items.forEach((_, m) => updateItem(i, m, { is_cover: m === k })); }} active={Boolean(it.is_cover)}>{it.is_cover ? 'Cover ✓' : 'Use as cover'}</LinkButton>
                            <LinkButton muted onClick={() => leaveOut(i, k)}>Leave out</LinkButton>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }
            if (Array.isArray(p.items)) {
              // sayings / know_now / laughter-as-items / custom items
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {p.items.map((it, k) => (
                    <div key={k} style={{ background: colors.creamLight, border: dupOfItem(p.department, it) ? `1px solid ${colors.gold}` : `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {dupOfItem(p.department, it) && <div style={{ fontSize: '12px', color: colors.tan }}>Already filed from an earlier afternoon — the issue shows it once. Leave this one out if you like.</div>}
                      <PieceTextArea serif value={it.quote ?? it.advice ?? it.text ?? ''} onChange={v => updateItem(i, k, it.quote !== undefined ? { quote: v } : it.advice !== undefined ? { advice: v } : { text: v })} rows={2} placeholder="Her words" />
                      <SmallInput value={it.when ?? it.why ?? ''} onChange={v => updateItem(i, k, it.when !== undefined ? { when: v } : { why: v })} placeholder={p.department === 'know_now' ? 'Why she believes it (optional)' : 'When she said it (optional)'} />
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                        <MoveTo departments={departments} current={p.department} onMove={d => { const items = p.items.filter((_, m) => m !== k); update(i, { items }); const next = { ...draft }; next.pieces = [...next.pieces, { department: d, items: [it] }]; setDraft(next); setDirty(true); }} />
                        <LinkButton muted onClick={() => leaveOut(i, k)}>Leave out</LinkButton>
                      </div>
                    </div>
                  ))}
                </div>
              );
            }
            if (p.department === 'kitchen') {
              return (
                <div key={i} style={{ background: colors.creamLight, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <TitleInput value={p.title || ''} onChange={v => update(i, { title: v })} placeholder="The recipe's name" />
                  <PieceTextArea serif value={p.intro || ''} onChange={v => update(i, { intro: v })} rows={2} placeholder="A line about it, in her words" />
                  <PieceTextArea value={(p.ingredients || []).join('\n')} onChange={v => update(i, { ingredients: v.split('\n') })} rows={4} placeholder="Ingredients, one per line" />
                  <PieceTextArea value={(p.steps || []).join('\n')} onChange={v => update(i, { steps: v.split('\n') })} rows={5} placeholder="Steps, one per line" />
                  <PieceTextArea serif value={p.her_note || ''} onChange={v => update(i, { her_note: v })} rows={2} placeholder="The thing she said that isn't an instruction" />
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}><LinkButton muted onClick={() => leaveOut(i)}>Leave out</LinkButton></div>
                </div>
              );
            }
            if (p.department === 'present') {
              const linesText = (p.lines || []).map(l => [l.head, l.body].filter(Boolean).join(': ')).join('\n');
              return (
                <div key={i} style={{ background: colors.creamLight, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '12.5px', color: colors.textSecondary, lineHeight: 1.5 }}>The back cover: a full-page "advertisement" for the present {herHis === 'his' ? 'he' : 'she'} remembers most from childhood, written from what {herHis === 'his' ? 'he' : 'she'} said. No brand names — we draw the thing itself.</div>
                  <SmallInput value={p.item || ''} onChange={v => update(i, { item: v })} placeholder="The present, plainly — a red wagon, a doll, a two-wheeler" />
                  <div className="review-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <SmallInput value={p.when || ''} onChange={v => update(i, { when: v })} placeholder="When — Christmas, 1956" />
                    <SmallInput value={p.where || ''} onChange={v => update(i, { where: v })} placeholder="Where — Maple Street" />
                    <SmallInput value={p.from || ''} onChange={v => update(i, { from: v })} placeholder="From whom (optional)" />
                  </div>
                  <TitleInput value={p.headline || ''} onChange={v => update(i, { headline: v })} placeholder="Headline — The One She Asked For" />
                  <PieceTextArea serif italic value={p.deck || ''} onChange={v => update(i, { deck: v })} rows={2} placeholder="One line under the headline, from what she said" />
                  <PieceTextArea value={linesText} onChange={v => update(i, { lines: v.split('\n').filter(Boolean).map(line => { const k = line.indexOf(':'); return k > 0 ? { head: line.slice(0, k).trim(), body: line.slice(k + 1).trim() } : { head: '', body: line.trim() }; }) })} rows={4} placeholder={'Ad copy, one line each — "Heading: the line"\nGenuine steel body: Holds two sisters, one dog, and every leaf on the block.'} />
                  <PieceTextArea serif italic value={p.quote || ''} onChange={v => update(i, { quote: v })} rows={2} placeholder="The thing she said about it, exactly" />
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}><LinkButton muted onClick={() => leaveOut(i)}>Leave out</LinkButton></div>
                </div>
              );
            }
            if (p.department === 'until_next_time') {
              return (
                <div key={i} style={{ background: colors.creamLight, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <PieceTextArea serif value={p.closing || ''} onChange={v => update(i, { closing: v })} rows={3} placeholder="Her last word, exactly as she said it" />
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}><LinkButton muted onClick={() => leaveOut(i)}>Leave out</LinkButton></div>
                </div>
              );
            }
            // story-shaped: feature, family_stories, laughter, faith, custom
            const isFeature = p.department === 'feature';
            const dupSession = dupOfStory(p);
            return (
              <div key={i} style={{ background: colors.creamLight, border: dupSession ? `1px solid ${colors.gold}` : `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dupSession && (
                  <div style={{ fontSize: '12.5px', color: colors.tan, background: colors.creamWarm, border: `0.5px solid ${colors.gold}`, borderRadius: '8px', padding: '8px 12px', lineHeight: 1.5 }}>
                    This looks like a story already filed from afternoon {dupSession}. {isFeature ? 'As the feature, this fuller version will replace it in the issue.' : 'Keep whichever telling is better — the issue shows the later one and retires the other.'}
                  </div>
                )}
                <TitleInput value={p.title || ''} onChange={v => update(i, { title: v })} placeholder="Title — short, concrete, from the story itself" />
                {isFeature && <PieceTextArea serif italic value={p.deck || ''} onChange={v => update(i, { deck: v })} rows={2} placeholder="One sentence: what this story is and why it matters to her" />}
                <PieceTextArea serif value={p.body || ''} onChange={v => update(i, { body: v })} rows={Math.min(18, Math.max(6, Math.ceil((p.body || '').length / 90)))} placeholder="The piece" />
                {isFeature && <PieceTextArea serif italic value={p.pull_quote || ''} onChange={v => update(i, { pull_quote: v })} rows={2} placeholder="Pull quote — a line of hers that stops you" />}
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase', color: colors.tan, fontWeight: 600 }}>Quotes: {((p.body || '').match(/"/g) || []).length / 2 | 0}</span>
                  {!isFeature && onChooseFeature && <LinkButton onClick={() => update(i, { department: 'feature' })}>Make this the feature</LinkButton>}
                  <MoveTo departments={departments} current={p.department} onMove={d => moveTo(i, d)} />
                  <LinkButton muted onClick={() => leaveOut(i)}>Leave out</LinkButton>
                </div>
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <TextInput value={ask} onChange={setAsk} placeholder={`Ask Grace for a change — "make the Maple Street story shorter" or "that saying was Grandpa's, not ${herHis}"`} onEnter={() => { if (ask.trim()) { onRevise(ask.trim()); setAsk(''); } }} />
            <button onClick={() => { if (ask.trim()) { onRevise(ask.trim()); setAsk(''); } }} disabled={!ask.trim()} style={{ fontSize: '14px', padding: '0 18px', minHeight: '44px', background: 'white', border: `1px solid ${colors.gray}`, borderRadius: '8px', fontFamily: 'inherit', color: colors.navy, cursor: ask.trim() ? 'pointer' : 'not-allowed' }}>Ask</button>
          </div>
        </div>
      </div>

      {error && <div style={{ margin: '0 32px', padding: '10px 14px', background: '#FBE9E7', color: '#B8543D', borderRadius: '6px', fontSize: '13px' }}>{error}</div>}

      <div style={{ padding: '18px 32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `0.5px solid ${colors.border}`, gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '13px', color: colors.textSecondary }}>{approved ? 'Changes here update the issue.' : 'Approving files these into the issue. You can still edit any piece later.'}</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={save} disabled={saving || !dirty} style={{ fontSize: '14px', padding: '10px 18px', minHeight: '44px', background: 'white', border: `1px solid ${colors.gray}`, borderRadius: '8px', fontFamily: 'inherit', color: dirty ? colors.navy : colors.textTertiary, cursor: dirty ? 'pointer' : 'default' }}>{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button>
          {!approved && <PrimaryButton disabled={saving} onClick={approveAll}>Approve this afternoon →</PrimaryButton>}
          {approved && onChooseFeature && !project.feature_title && <PrimaryButton onClick={onChooseFeature}>Choose the feature →</PrimaryButton>}
        </div>
      </div>
      <style>{`@media (max-width: 720px) { .review-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function SmallInput({ value, onChange, placeholder }) {
  return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: '13px', fontFamily: 'inherit', border: `1px solid ${colors.border}`, borderRadius: '6px', background: 'white', minHeight: '36px' }} />;
}
function TitleInput({ value, onChange, placeholder }) {
  return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: '20px', fontFamily: fonts.serif, fontWeight: 700, border: '1px solid transparent', borderRadius: '6px', background: 'transparent', color: colors.text }} />;
}
function PieceTextArea({ value, onChange, rows = 3, placeholder, serif, italic }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: serif ? '14.5px' : '14px', lineHeight: 1.65, fontFamily: serif ? '"Libre Baskerville", Georgia, serif' : 'inherit', fontStyle: italic ? 'italic' : 'normal', border: `1px solid ${colors.border}`, borderRadius: '6px', background: 'white', color: '#1F1B16', resize: 'vertical' }} />;
}
function LinkButton({ children, onClick, muted, active }) {
  return <button onClick={onClick} style={{ background: 'transparent', border: 'none', color: active ? colors.olive : muted ? colors.textTertiary : colors.navy, textDecoration: 'underline', fontFamily: 'inherit', padding: 0, minHeight: '32px', cursor: 'pointer', fontSize: '12px' }}>{children}</button>;
}
function MoveTo({ departments, current, onMove }) {
  return (
    <select value="" onChange={e => onMove(e.target.value)} aria-label="Move to another page" style={{ fontSize: '12px', fontFamily: 'inherit', color: colors.navy, background: 'transparent', border: 'none', textDecoration: 'underline', cursor: 'pointer', minHeight: '32px' }}>
      <option value="">Move to…</option>
      {departments.filter(d => d.id !== current && d.id !== 'until_next_time').map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
    </select>
  );
}

// ---- Choose the feature ---------------------------------------------------------
function ChooseFeature({ project, draft, subject, herHis, error, onChoose }) {
  const fromDraft = Array.isArray(draft?.feature_candidates) ? draft.feature_candidates.filter(Boolean) : [];
  const named = Array.isArray(project.feature_candidates) ? project.feature_candidates.filter(Boolean) : [];
  const storyTitles = (draft?.pieces || []).filter(p => ['feature', 'family_stories'].includes(p.department) && p.title).map(p => p.title);
  const seen = new Set();
  const options = [];
  fromDraft.forEach((c, i) => { if (!seen.has(c.toLowerCase())) { seen.add(c.toLowerCase()); options.push({ name: c, tag: i === 0 ? "Grace's pick" : 'Also strong', why: i === 0 ? `It had the most in it this afternoon — a beginning, people, and an ending ${subject} told without being asked.` : 'It could carry the issue too.' }); } });
  storyTitles.forEach(c => { if (!seen.has(c.toLowerCase())) { seen.add(c.toLowerCase()); options.push({ name: c, tag: 'Filed today', why: 'A story that came out whole this afternoon.' }); } });
  named.forEach(c => { if (!seen.has(c.toLowerCase())) { seen.add(c.toLowerCase()); options.push({ name: c, tag: 'You named', why: "It didn't come up this afternoon — which is fine. Afternoon 2 can go straight at it." }); } });
  const [choice, setChoice] = useState(options[0]?.name || '');
  const [other, setOther] = useState('');
  const picked = choice === '__other' ? other.trim() : choice;

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <GraceSays heading="One decision before the next afternoon: which story is the feature?" text={`Here's what had the most in it. My read is first — but you know your family. Whichever you pick, afternoon 2 is about getting that one story told all the way through, in ${herHis} words.`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {options.map(o => (
          <button key={o.name} onClick={() => setChoice(o.name)} style={{ textAlign: 'left', background: choice === o.name ? colors.creamWarm : colors.creamLight, border: choice === o.name ? `2px solid ${colors.gold}` : `1px solid ${colors.border}`, borderRadius: '12px', padding: '16px 18px', display: 'flex', gap: '16px', alignItems: 'flex-start', fontFamily: 'inherit', color: colors.text, cursor: 'pointer' }}>
            <span style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: o.tag === "Grace's pick" ? colors.tan : colors.textTertiary, fontWeight: 700, paddingTop: '5px', flexShrink: 0, width: '76px' }}>{o.tag}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontFamily: fonts.serif, fontSize: '18px', fontWeight: 500 }}>{o.name}</span>
              <span style={{ fontSize: '13.5px', color: colors.textSecondary, lineHeight: 1.5 }}>{o.why}</span>
            </span>
          </button>
        ))}
        <button onClick={() => setChoice('__other')} style={{ textAlign: 'left', background: 'white', border: choice === '__other' ? `2px solid ${colors.gold}` : `1px dashed ${colors.gray}`, borderRadius: '12px', padding: '14px 18px', fontFamily: 'inherit', color: colors.navy, fontSize: '14px', cursor: 'pointer', minHeight: '44px' }}>Something else — I'll name it</button>
        {choice === '__other' && <TextInput value={other} onChange={setOther} placeholder="The story, in a few words" />}
      </div>
      <div style={{ background: colors.creamLight, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '14px 16px', fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5 }}>Not sure? Pick Grace's and change it later — nothing is written until afternoon 2 happens.</div>
      {error && <div style={{ padding: '10px 14px', background: '#FBE9E7', color: '#B8543D', borderRadius: '6px', fontSize: '13px' }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '14px', borderTop: `0.5px solid ${colors.border}` }}>
        <PrimaryButton disabled={!picked} onClick={() => onChoose(picked)}>That's the feature → open afternoon 2's guide</PrimaryButton>
      </div>
    </div>
  );
}

// ============================================================
// The issue — approved pieces from every afternoon, laid out as a magazine.
// 8.5×11. A three-column grid, one big thing per page, department icons in
// place of ornaments, sayings as small fillers inside the columns, and the
// advertisement for the present she asked for as a child on the back cover.
// Print-styled so the browser's Print → Save as PDF gives a clean file.
// ============================================================
const PAPER = '#F6F1E7';
const INK = '#1F1B16';
const INK2 = '#4A4238';
const INK3 = '#6B625A';
const RULE = '#D5CBB9';
const RED = '#8B2E2E';
const SERIF_DISPLAY = '"Playfair Display", Georgia, serif';
const SERIF_BODY = '"Source Serif 4", "Libre Baskerville", Georgia, serif';
const SANS = '"Libre Franklin", "Helvetica Neue", Arial, sans-serif';
const PAGE_W = 816;
const PAGE_H = 1056;
const PAD_X = 56;

function useIssueFonts() {
  useEffect(() => {
    const id = 'mystory-issue-fonts-v2';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=Libre+Franklin:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);
}

// ---- Department icons: one line weight, one color, the same every issue ----
function DeptIcon({ id, size = 40 }) {
  const common = { width: size, height: size, viewBox: '0 0 72 72', fill: 'none', stroke: RED, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, style: { flexShrink: 0 } };
  switch (id) {
    case 'feature':
      return <svg {...common}><path d="M14 58 50 22l8 8L22 66l-10 2z" /><path d="M46 26l8 8" /><path d="M12 68l2-10" /><path d="M58 14l6-6 6 6-6 6z" /></svg>;
    case 'family_stories':
      return <svg {...common}><path d="M10 36 36 14l26 22" /><path d="M18 32v28h36V32" /><path d="M30 60V44h12v16" /><path d="M46 20v-8h6v13" /></svg>;
    case 'sayings':
      return <svg {...common} fill={RED} stroke="none"><path d="M12 46c0-12 6-21 18-24l1.8 3.6C25.6 28 22.6 32.4 22.4 37H31v15H12v-6zm30 0c0-12 6-21 18-24l1.8 3.6C55.6 28 52.6 32.4 52.4 37H61v15H42v-6z" /></svg>;
    case 'laughter':
      return <svg {...common}><circle cx="36" cy="38" r="22" /><path d="M23 40c3 10 23 10 26 0z" /><path d="M27 32h1M44 32h1" /><path d="M14 12l4 6M58 12l-4 6M36 6v6" /></svg>;
    case 'shoebox':
      return <svg {...common}><path d="M10 30h52v30H10z" /><path d="M6 22h60l-4 8H10z" /><path d="M28 30v8h16v-8" /><path d="M18 14l6 6M50 10l-4 10M30 8v10" /></svg>;
    case 'kitchen':
      return <svg {...common}><path d="M10 40h52c0 10-10 18-26 18S10 50 10 40z" /><path d="M6 40h60" /><path d="M16 40c4-8 10-12 20-12s16 4 20 12" /><path d="M28 16c-2 3 2 5 0 8M36 12c-2 3 2 5 0 8M44 16c-2 3 2 5 0 8" /></svg>;
    case 'know_now':
      return <svg {...common}><path d="M24 26h24l4 30H20z" /><path d="M28 26v-6h16v6" /><path d="M36 6v8" /><path d="M30 14h12" /><path d="M36 34v10" /><path d="M26 56v8h20v-8" /></svg>;
    case 'faith':
      return <svg {...common}><path d="M36 20c-6-4-14-5-26-3v38c12-2 20-1 26 3 6-4 14-5 26-3V17c-12-2-20-1-26 3z" /><path d="M36 20v38" /><path d="M48 26v14M42 32h12" /></svg>;
    case 'until_next_time':
      return <svg {...common}><path d="M14 40v-8a10 10 0 0 1 10-10h24a10 10 0 0 1 10 10v8H14z" /><path d="M14 40h44" /><path d="M34 40v26" /><path d="M26 32h10" /><path d="M48 16h8v-4" /></svg>;
    case 'present':
      return <svg {...common}><path d="M12 14h28l20 20-28 28-20-20z" /><circle cx="24" cy="26" r="4" /><path d="M34 42l8-8M40 48l8-8" /></svg>;
    default: // a page the family invented
      return <svg {...common}><path d="M20 10h32v52l-16-10-16 10z" /><path d="M28 22h16M28 30h16" /></svg>;
  }
}

// The quotation mark that sits in front of every filler.
function QuoteMark({ size = 14 }) {
  return <svg style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: '6px' }} width={size} height={size} viewBox="0 0 24 24" fill={RED} aria-hidden="true"><path d="M4 16c0-4 2-7 6-8l.6 1.2C8.6 10 7.6 11.4 7.5 13H10v5H4v-2zm10 0c0-4 2-7 6-8l.6 1.2c-2 .8-3 2.2-3.1 3.8H20v5h-6v-2z" /></svg>;
}

function Kicker({ children, style }) {
  return <div style={{ fontFamily: SANS, fontSize: '9.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: RED, fontWeight: 600, marginBottom: '6px', ...style }}>{children}</div>;
}

function Paras({ text, firstDrop, size = 15.5, lead = 22, indent = true, color }) {
  const paras = String(text || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  return paras.map((p, i) => (
    <p key={i} style={{ margin: 0, fontSize: `${size}px`, lineHeight: `${lead}px`, textAlign: 'justify', hyphens: 'auto', textIndent: indent && i > 0 ? '1.4em' : 0, color: color || INK }}>
      {firstDrop && i === 0 && (
        <span style={{ float: 'left', fontFamily: SERIF_DISPLAY, fontWeight: 700, fontSize: `${Math.round(lead * 2.45)}px`, lineHeight: `${lead * 2}px`, padding: '4px 7px 0 0', color: RED }}>{p.charAt(0)}</span>
      )}
      {firstDrop && i === 0 ? p.slice(1) : p}
    </p>
  ));
}

// A saying as a filler — small, between two hairlines, where the Digest put them.
function Filler({ saying, top = 22 }) {
  if (!saying) return null;
  const q = String(saying.quote || '').replace(/^["“]|["”]$/g, '');
  return (
    <div style={{ borderTop: `1px solid ${INK}`, borderBottom: `1px solid ${INK}`, padding: '12px 2px', margin: `${top}px 0 18px`, breakInside: 'avoid', fontStyle: 'italic', fontSize: '15px', lineHeight: '21px', textAlign: 'left' }}>
      <QuoteMark />“{q}”
      {saying.when && <div style={{ fontFamily: SANS, fontStyle: 'normal', fontSize: '9.5px', letterSpacing: '0.16em', textTransform: 'uppercase', color: INK3, marginTop: '6px' }}>{saying.when}</div>}
    </div>
  );
}

function Cols({ count = 3, gap = 20, children, style }) {
  return <div style={{ columnCount: count, columnGap: `${gap}px`, columnFill: 'auto', ...style }}>{children}</div>;
}

function Story({ kicker, title, body, drop = true }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{ breakInside: 'avoid', breakAfter: 'avoid' }}>
        {kicker && <Kicker>{kicker}</Kicker>}
        {title && <h3 style={{ fontFamily: SERIF_DISPLAY, fontWeight: 700, fontSize: '21px', lineHeight: '25px', margin: '0 0 8px', textAlign: 'left', color: INK }}>{title}</h3>}
      </div>
      <Paras text={body} firstDrop={drop} />
    </div>
  );
}

function DeptHead({ id, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: `2px solid ${INK}`, paddingBottom: '12px', marginBottom: '26px', breakInside: 'avoid' }}>
      <DeptIcon id={id} />
      <div>
        <h2 style={{ margin: 0, fontFamily: SERIF_DISPLAY, fontWeight: 700, fontSize: '30px', lineHeight: '32px', letterSpacing: '-0.01em', color: INK }}>{title}</h2>
        {sub && <div style={{ fontFamily: SANS, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: RED, marginTop: '4px' }}>{sub}</div>}
      </div>
    </div>
  );
}

function PageBreak() {
  return <div style={{ breakBefore: 'page', height: 0 }} className="issue-break" />;
}

// One page. Running head top, folio bottom, three-column grid inside.
function Page({ head, folio, children, bleed, style }) {
  return (
    <section style={{ position: 'relative', minHeight: `${PAGE_H}px`, boxSizing: 'border-box', padding: bleed ? 0 : `56px ${PAD_X}px 64px`, ...style }}>
      {head && !bleed && (
        <div style={{ position: 'absolute', top: '30px', left: PAD_X, right: PAD_X, display: 'flex', justifyContent: 'space-between', fontFamily: SANS, fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: INK3 }}>
          <span>{head.left}</span><span>{head.right}</span>
        </div>
      )}
      {children}
      {folio != null && <div style={{ position: 'absolute', bottom: '28px', left: folio % 2 === 0 ? PAD_X : 'auto', right: folio % 2 === 0 ? 'auto' : PAD_X, fontFamily: SANS, fontSize: '11px', color: INK3 }}>{folio}</div>}
    </section>
  );
}

// Line drawings for the back-cover advertisement. No brands, no logos — a
// wagon is a wagon. Grace names the present; we pick the nearest drawing.
function ToyDrawing({ item }) {
  const s = String(item || '').toLowerCase();
  const common = { width: 440, height: 230, viewBox: '0 0 440 230', fill: 'none', stroke: RED, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round', role: 'img', 'aria-label': `Line drawing of ${item}`, style: { display: 'block', margin: '22px auto 10px', maxWidth: '100%' } };
  if (/wagon/.test(s)) return <svg {...common}><path d="M80 110h260l-10 70H90z" /><path d="M68 92h284" /><path d="M80 110l-12-18M340 110l12-18" /><circle cx="125" cy="200" r="24" /><circle cx="125" cy="200" r="6" /><circle cx="305" cy="200" r="24" /><circle cx="305" cy="200" r="6" /><path d="M84 198h197" /><path d="M68 150 30 122" /><path d="M30 122l-6-44" /><path d="M14 78h20" /></svg>;
  if (/bicycle|bike|two-wheeler|schwinn/.test(s)) return <svg {...common}><circle cx="100" cy="160" r="52" /><circle cx="340" cy="160" r="52" /><path d="M100 160l60-90h90l90 90" /><path d="M160 70l60 90h-120" /><path d="M250 70l-30 90" /><path d="M150 60h30M330 86l-20-24h-16" /><circle cx="220" cy="160" r="10" /><path d="M210 160l-20 20M230 160l20-20" /></svg>;
  if (/doll|baby/.test(s)) return <svg {...common}><circle cx="220" cy="60" r="38" /><path d="M186 44c6-18 62-18 68 0" /><path d="M208 64h2M232 64h2" /><path d="M212 76c4 4 12 4 16 0" /><path d="M190 100h60l26 110H164z" /><path d="M164 210h112" /><path d="M190 100l-34 60M250 100l34 60" /><path d="M200 130h40M196 160h48" /></svg>;
  if (/sled|toboggan|flexible flyer/.test(s)) return <svg {...common}><path d="M40 150c0-14 10-22 24-22h300c20 0 30 10 30 22" /><path d="M40 150c0 20 14 30 30 30h290c20 0 34-10 34-30" /><path d="M90 128v-36h260v36" /><path d="M90 92h260" /><path d="M120 92v36M180 92v36M240 92v36M300 92v36" /><path d="M64 150h320" /><path d="M30 60l40 32" /></svg>;
  if (/bear|teddy|stuffed/.test(s)) return <svg {...common}><circle cx="220" cy="70" r="40" /><circle cx="186" cy="40" r="14" /><circle cx="254" cy="40" r="14" /><path d="M206 70h2M232 70h2" /><ellipse cx="220" cy="86" rx="12" ry="8" /><path d="M172 118c0-14 96-14 96 0v70c0 14-96 14-96 0z" /><path d="M172 136l-30 30M268 136l30 30" /><path d="M186 188l-10 30M254 188l10 30" /></svg>;
  if (/train|lionel|locomotive|railroad/.test(s)) return <svg {...common}><path d="M60 170h120v-70H60z" /><path d="M80 100V70h40v30" /><path d="M180 170h140v-50H180z" /><path d="M200 120h100v-30H200z" /><path d="M330 170h50v-30h-50z" /><circle cx="90" cy="186" r="14" /><circle cx="150" cy="186" r="14" /><circle cx="210" cy="186" r="14" /><circle cx="290" cy="186" r="14" /><circle cx="355" cy="186" r="14" /><path d="M40 204h380" /><path d="M94 60c-4-10 4-16 0-26M110 48c-4-10 4-16 0-26" /></svg>;
  if (/baseball|glove|mitt|bat\b/.test(s)) return <svg {...common}><path d="M120 200c-40-20-50-80-20-120 16-22 44-26 60-10 16-16 44-12 60 10 30 40 20 100-20 120-24 12-56 12-80 0z" /><path d="M160 70v60M130 90c10 20 50 20 60 0" /><path d="M120 140h80" /><circle cx="330" cy="150" r="40" /><path d="M300 125c20 10 20 40 0 50M360 125c-20 10-20 40 0 50" /></svg>;
  if (/skate/.test(s)) return <svg {...common}><path d="M120 60c-20 40-20 80 0 120h130c10 0 20-10 30-20l40-20c10-6 14-16 10-26l-80-54c-40 0-100 0-130 0z" /><path d="M140 100h80M140 130h70" /><path d="M110 180h200" /><path d="M120 180v24M190 180v24M260 180v24" /><path d="M100 204h230" /></svg>;
  if (/radio|transistor|record|player|phonograph/.test(s)) return <svg {...common}><rect x="100" y="70" width="240" height="140" rx="14" /><circle cx="170" cy="140" r="40" /><path d="M150 120l40 40M190 120l-40 40" /><rect x="240" y="100" width="70" height="40" rx="6" /><path d="M250 120h50" /><circle cx="275" cy="170" r="14" /><path d="M160 70V30" /><path d="M120 50h40" /></svg>;
  if (/dog|puppy|pup\b/.test(s)) return <svg {...common}><path d="M170 100c-20-30 0-60 30-60s50 30 30 60" /><path d="M170 100c-10 40 20 60 50 60s60-20 50-60" /><path d="M210 40l-30-20M230 40l30-20" /><path d="M208 90h2M232 90h2" /><path d="M214 110c4 4 8 4 12 0" /><path d="M150 160h140v40H150z" /><path d="M160 200v20M190 200v20M250 200v20M280 200v20" /><path d="M290 170c20-10 30-30 20-50" /></svg>;
  if (/horse|pony/.test(s)) return <svg {...common}><path d="M120 110l40-40h30l40 30h60l20-40 30 20-10 50-30 20" /><path d="M160 70l-20-30M190 70V40" /><path d="M120 110v50M300 150v-20M280 150v-10" /><path d="M60 190c40-30 300-30 340 0" /><path d="M110 160h210" /></svg>;
  if (/book|bible|encyclopedia|comic/.test(s)) return <svg {...common}><path d="M220 60c-30-20-80-24-140-16v140c60-8 110-4 140 16 30-20 80-24 140-16V44c-60-8-110-4-140 16z" /><path d="M220 60v140" /><path d="M110 90c30-4 60-2 90 8M110 120c30-4 60-2 90 8M240 98c30-10 60-12 90-8M240 128c30-10 60-12 90-8" /></svg>;
  if (/truck|car\b|tractor|fire engine|jeep/.test(s)) return <svg {...common}><path d="M60 160h320v-50h-100l-30-40H60z" /><path d="M200 70l20 40h60" /><path d="M80 110h100" /><circle cx="130" cy="170" r="26" /><circle cx="310" cy="170" r="26" /><circle cx="130" cy="170" r="8" /><circle cx="310" cy="170" r="8" /><path d="M40 200h360" /></svg>;
  if (/kite/.test(s)) return <svg {...common}><path d="M220 20l80 80-80 110-80-110z" /><path d="M220 20v190M140 100h160" /><path d="M220 210c-10 20 10 30 0 50" /><path d="M200 230l-10 10M240 240l10 10" /></svg>;
  if (/watch|clock/.test(s)) return <svg {...common}><circle cx="220" cy="120" r="70" /><circle cx="220" cy="120" r="56" /><path d="M220 80v40l30 20" /><path d="M190 50l10-30h40l10 30M190 190l10 30h40l10-30" /></svg>;
  return null;
}

function AdPage({ present, subject, rel, year, folio }) {
  const P = possessive(rel).toLowerCase();
  const S = subjectPronoun(rel);
  const them = S === 'He' ? 'him' : S === 'They' ? 'them' : 'her';
  const payers = /grand/i.test(rel || '') ? `${P} grandchildren` : /mom|mother|dad|father/i.test(rel || '') ? `${P} children` : 'the family';
  const headline = (present.headline || '').trim() || `The One ${S} Asked For`;
  const lines = Array.isArray(present.lines) ? present.lines.filter(l => l && (l.head || l.body)).slice(0, 4) : [];
  const where = [present.when, present.where].filter(Boolean).join(' · ');
  const drawing = ToyDrawing({ item: present.item });
  return (
    <section style={{ position: 'relative', minHeight: `${PAGE_H}px`, boxSizing: 'border-box', padding: '40px' }}>
      <div style={{ position: 'absolute', inset: '40px', border: `3px double ${INK}`, pointerEvents: 'none' }} aria-hidden="true" />
      <div style={{ position: 'absolute', top: '22px', left: 0, right: 0, textAlign: 'center', fontFamily: SANS, fontSize: '9px', letterSpacing: '0.26em', textTransform: 'uppercase', color: INK3, background: PAPER, width: '140px', margin: '0 auto' }}>Advertisement</div>
      <div style={{ minHeight: `${PAGE_H - 80}px`, boxSizing: 'border-box', padding: '48px 56px 44px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        {where && <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: '13px', letterSpacing: '0.3em', textTransform: 'uppercase', color: RED }}>{where}</div>}
        <div style={{ fontFamily: SERIF_DISPLAY, fontWeight: 900, fontSize: headline.length > 22 ? '54px' : '66px', lineHeight: 1, letterSpacing: '-0.015em', marginTop: '18px', maxWidth: '600px' }}>{headline}</div>
        {present.deck && <div style={{ fontFamily: SERIF_BODY, fontStyle: 'italic', fontSize: '21px', lineHeight: '28px', color: INK2, marginTop: '14px', maxWidth: '520px' }}>{present.deck}</div>}
        {drawing || (present.item && (
          <div style={{ fontFamily: SERIF_DISPLAY, fontStyle: 'italic', fontSize: '34px', margin: '40px 0 24px', color: INK }}>{present.item}</div>
        ))}
        {lines.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: lines.length === 1 ? '1fr' : '1fr 1fr', gap: '18px 36px', textAlign: 'left', maxWidth: '560px', marginTop: '8px', fontSize: '15.5px', lineHeight: '22px' }}>
            {lines.map((l, i) => (
              <p key={i} style={{ margin: 0 }}>
                {l.head && <><b style={{ fontFamily: SANS, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: RED, fontWeight: 600 }}>{l.head}</b><br /></>}
                {l.body}
              </p>
            ))}
          </div>
        )}
        <div style={{ marginTop: 'auto', width: '100%', borderTop: `1px solid ${INK}`, paddingTop: '16px', textAlign: 'left' }}>
          {present.quote && <div style={{ fontFamily: SERIF_DISPLAY, fontStyle: 'italic', fontSize: '18px', lineHeight: 1.4 }}>“{String(present.quote).replace(/^["“]|["”]$/g, '')}” <span style={{ fontFamily: SANS, fontStyle: 'normal', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: INK3 }}>— {subject}</span></div>}
          <div style={{ marginTop: '14px', textAlign: 'right', fontFamily: SANS, fontSize: '9px', letterSpacing: '0.26em', textTransform: 'uppercase', color: INK3 }}>Paid for by {payers} · {year}</div>
        </div>
      </div>
    </section>
  );
}

function IssueView({ project, onProjectUpdate, onReturnToDashboard }) {
  useIssueFonts();
  const [sessions, setSessions] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [urls, setUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState(project.buyer_note || '');
  const [editingNote, setEditingNote] = useState(!project.buyer_note);
  const [savingNote, setSavingNote] = useState(false);
  const looksLikeHandle = (n) => !n || /\d/.test(n) || !/\s/.test(n.trim()) && n.trim().length > 12;
  const [displayName, setDisplayName] = useState(looksLikeHandle(project.buyer_name) ? '' : prettyName(project.buyer_name));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: s } = await supabase
        .from('interview_sessions')
        .select('session_number, title, approved, pieces, recorded_on, recorded_where, others_present')
        .eq('project_id', project.id)
        .order('session_number', { ascending: true });
      const { data: p } = await supabase
        .from('interview_photos')
        .select('*')
        .eq('project_id', project.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (cancelled) return;
      setSessions((s || []).filter(x => x.approved && x.pieces));
      setPhotos(p || []);
      if (p && p.length) {
        const { data: signed } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(p.map(x => x.storage_path), 3600);
        if (!cancelled && signed) {
          const map = {};
          signed.forEach((x, i) => { if (x?.signedUrl) map[p[i].id] = x.signedUrl; });
          setUrls(map);
        }
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [project.id]);

  const saveNote = async () => {
    setSavingNote(true);
    const updates = { buyer_note: note.trim() || null };
    if (displayName.trim()) updates.buyer_name = displayName.trim();
    await supabase.from('interview_projects').update(updates).eq('id', project.id);
    onProjectUpdate({ ...project, ...updates });
    setSavingNote(false);
    setEditingNote(false);
  };

  // ---- Assemble ----------------------------------------------------------
  const rel = project.buyer_relationship;
  const S = subjectPronoun(rel);
  const P = possessive(rel);
  const she = S === 'He' ? 'he' : S === 'They' ? 'they' : 'she';
  const her = S === 'He' ? 'him' : S === 'They' ? 'them' : 'her';
  const subject = project.subject_name || (S === 'He' ? 'Him' : S === 'They' ? 'Them' : 'Her');
  const title = project.issue_title || `${subject}'s Issue`;
  const buyer = (displayName.trim() || (looksLikeHandle(project.buyer_name) ? '' : prettyName(project.buyer_name))) || 'the family';
  const departments = activeDepartments(project).filter(d => d.state !== 'out');
  const titleOf = (id) => departments.find(d => d.id === id)?.title || (id === 'sayings' ? `Things ${S} Always Said` : id);

  const allPieces = reconcilePieces(sessions);
  const byDept = {};
  allPieces.forEach(p => { (byDept[p.department] = byDept[p.department] || []).push(p); });

  const sayings = (byDept.sayings || []).flatMap(p => (p.items || []).map(it => ({ ...it })));
  let fillerIdx = 0;
  const nextFiller = () => (fillerIdx < sayings.length ? sayings[fillerIdx++] : null);
  const remainingFillers = () => sayings.slice(fillerIdx);

  const feature = (byDept.feature || [])[0] || null;
  const stories = byDept.family_stories || [];
  const laughter = byDept.laughter || [];
  const kitchen = (byDept.kitchen || [])[0] || null;
  const knowNow = (byDept.know_now || []).flatMap(p => p.items || []);
  const faith = byDept.faith || [];
  const closing = (byDept.until_next_time || []).map(p => p.closing).filter(Boolean).slice(-1)[0] || '';
  const present = (byDept.present || []).slice(-1)[0] || null;
  const custom = (Array.isArray(project.custom_departments) ? project.custom_departments : []).filter(c => c && c.id);

  const shoeboxItems = (byDept.shoebox || []).flatMap(p => p.items || []);
  const photoById = Object.fromEntries(photos.map(p => [p.id, p]));
  const cover = photos.find(p => p.is_cover) || photos[0] || null;
  const captioned = shoeboxItems.map(it => ({ ...it, photo: it.photo_id ? photoById[it.photo_id] : null })).filter(it => it.photo || it.caption);
  const leadPhoto = captioned.find(it => it.photo && it.photo.id !== cover?.id && it.caption) || captioned.find(it => it.photo) || null;
  const featurePhoto = photos.find(p => p.is_feature) || leadPhoto?.photo || cover || null;
  const restPhotos = captioned.filter(it => it !== leadPhoto);

  const provenance = sessions.map(s => ({ on: s.recorded_on, where: s.recorded_where, others: s.others_present })).filter(x => x.on || x.where);
  const provDates = [...new Set(provenance.map(x => formatDateish(x.on)).filter(Boolean))];
  const provPlaces = [...new Set(provenance.map(x => (x.where || '').trim()).filter(Boolean))].map(w => w.charAt(0).toLowerCase() + w.slice(1));
  const provOthers = [...new Set(provenance.map(x => (x.others || '').trim()).filter(x => x && !/just the two|just us|only us|nobody/i.test(x)))];
  const provSentence = (() => {
    const n = sessions.length;
    const count = n ? `${NUM_WORDS[n] || n} afternoon${n === 1 ? '' : 's'}` : 'several afternoons';
    let out = `Everything in these pages was told by ${subject} to ${buyer} over ${count}`;
    if (provDates.length === 1) out += ` on ${provDates[0]}`;
    else if (provDates.length > 1) out += ` between ${provDates[0]} and ${provDates[provDates.length - 1]}`;
    if (provPlaces.length) out += `, at ${provPlaces.length === 1 ? provPlaces[0] : provPlaces.slice(0, -1).join(', ') + ' and ' + provPlaces.slice(-1)}`;
    out += '.';
    if (provOthers.length) out += ` Also present: ${provOthers.join('; ')}.`;
    out += ` The words are ${P.toLowerCase() === 'their' ? 'theirs' : P.toLowerCase() === 'his' ? 'his' : 'hers'}. Grace, the editor, kept them in order and wrote them down.`;
    return out;
  })();
  const season = (() => { const m = new Date().getMonth(); return m < 2 || m === 11 ? 'Winter' : m < 5 ? 'Spring' : m < 8 ? 'Summer' : 'Autumn'; })();
  const year = new Date().getFullYear();
  const issueLine = `Issue No. 1 · ${season} ${year}`;
  const head = (right) => ({ left: `${subject} · Issue No. 1`, right });

  // Contents in plan order, only pages that have something.
  const order = (project.issue_plan?.departments || departments).map(d => d.id);
  const contents = [];
  contents.push({ title: 'A Note Before You Begin', page: 2 });
  let pageNo = 3;
  const has = (id) => id === 'feature' ? Boolean(feature) : id === 'family_stories' ? stories.length > 0 : id === 'sayings' ? sayings.length > 0 : id === 'laughter' ? laughter.length > 0 : id === 'shoebox' ? captioned.length > 0 : id === 'kitchen' ? Boolean(kitchen) : id === 'know_now' ? knowNow.length > 0 : id === 'faith' ? faith.length > 0 : id === 'until_next_time' ? true : (byDept[id] || []).length > 0;
  order.forEach(id => {
    if (!has(id)) return;
    if (id === 'sayings') { contents.push({ title: titleOf('sayings'), page: 'throughout' }); return; }
    contents.push({ title: titleOf(id), page: pageNo, feature: id === 'feature' });
    pageNo += id === 'feature' ? 4 : id === 'shoebox' ? 4 : 2;
  });
  if (present) contents.push({ title: 'The one ' + she + ' asked for', page: 'back cover' });

  const empty = sessions.length === 0;
  let folio = 2;
  const nextFolio = () => ++folio;

  // A run of story-shaped pieces in three columns, a filler after each.
  const storyRun = (pieces, { cols = 3, kickerOf } = {}) => (
    <Cols count={cols}>
      {pieces.map((p, i) => (
        <React.Fragment key={i}>
          <Story kicker={kickerOf ? kickerOf(p) : (p.when || p.kicker || null)} title={p.title} body={p.body || (Array.isArray(p.items) ? p.items.map(it => it.text || it.quote).join('\n\n') : '')} />
          <Filler saying={nextFiller()} top={0} />
        </React.Fragment>
      ))}
    </Cols>
  );

  // The feature body: three columns, the pull quote dropped in after the
  // second paragraph so it sits inside the text, not stapled to the end.
  const featureBody = (f) => {
    const paras = String(f.body || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    const at = Math.min(2, Math.max(1, paras.length - 1));
    const pq = f.pull_quote ? String(f.pull_quote).replace(/^["“]|["”]$/g, '') : '';
    return (
      <Cols count={3}>
        <Paras text={paras.slice(0, at).join('\n\n')} firstDrop />
        {pq && (
          <div style={{ breakInside: 'avoid', fontFamily: SERIF_DISPLAY, fontStyle: 'italic', fontSize: '24px', lineHeight: '32px', borderTop: `1.5px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: '16px 4px', margin: '18px 0' }}>
            “{pq}”
            <div style={{ fontFamily: SANS, fontStyle: 'normal', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: RED, marginTop: '12px' }}>{subject}</div>
          </div>
        )}
        <Paras text={paras.slice(at).join('\n\n')} indent />
        <Filler saying={nextFiller()} />
      </Cols>
    );
  };

  const photoBox = (p, h, alt) => (
    <div style={{ height: `${h}px`, background: '#DDD5C6', overflow: 'hidden', breakInside: 'avoid' }}>
      {p && urls[p.id] && <img src={urls[p.id]} alt={alt || p.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
    </div>
  );
  const capLine = (it) => [it.who, it.where, it.when].filter(Boolean).join(' · ');
  const Cap = ({ it, size = 11 }) => (
    <div style={{ fontFamily: SANS, fontSize: `${size}px`, lineHeight: 1.45, color: INK2, marginTop: '8px' }}>
      {capLine(it) && <b style={{ color: INK, fontWeight: 600 }}>{capLine(it)}. </b>}
      {it.caption || 'Every shoebox has one nobody can place. If you know, write it in: ____________________'}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: fonts.sans, color: colors.text }}>
      <div className="issue-chrome" style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px 0' }}>
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: `0.5px solid ${colors.border}` }}>
          <Header onBack={onReturnToDashboard} rightText={`${title} · Issue No. 1`} />
          <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', background: colors.creamLight }}>
            <div style={{ fontSize: '13px', color: colors.textSecondary }}>
              {empty ? 'The issue begins taking shape after your first afternoon is approved.' : `${sessions.length} of ${TOTAL_SESSIONS} afternoons filed. This is the issue as it stands — it fills in as you go.`}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => window.print()} style={{ fontSize: '13px', padding: '9px 16px', minHeight: '44px', background: colors.navy, color: 'white', border: 'none', borderRadius: '999px', fontFamily: 'inherit', cursor: 'pointer' }}>Print / Save as PDF</button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}>Laying out the issue…</div>
      ) : (
        <div className="issue-paper" style={{ width: `${PAGE_W}px`, maxWidth: '100%', margin: '20px auto 40px', background: PAPER, color: INK, fontFamily: SERIF_BODY, boxShadow: '0 2px 18px rgba(0,0,0,0.08)', boxSizing: 'border-box' }}>

          {/* ---- COVER: nameplate, the photograph, contents ---- */}
          <Page folio={null} style={{ padding: `44px ${PAD_X}px 48px`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ borderTop: `3px solid ${INK}`, borderBottom: `1px solid ${INK}`, padding: '14px 0 12px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ fontFamily: SERIF_DISPLAY, fontWeight: 900, fontSize: title.length > 18 ? '44px' : '62px', lineHeight: 1, letterSpacing: '-0.02em' }}>{title}</div>
              <div style={{ fontFamily: SANS, fontSize: '10.5px', letterSpacing: '0.24em', textTransform: 'uppercase', color: INK3, textAlign: 'right' }}>{issueLine}<br />In {P.toLowerCase()} own words</div>
            </div>
            <div style={{ marginTop: '18px', height: '520px', background: '#DDD5C6', border: cover ? 'none' : `1px dashed #B8AB95`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: INK3, fontStyle: 'italic', fontSize: '13px', textAlign: 'center', padding: cover ? 0 : '20px', boxSizing: 'border-box' }}>
              {cover && urls[cover.id] ? <img src={urls[cover.id]} alt={cover.caption || 'Cover photograph'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'The cover photograph — mark one "Use as cover" when you review an afternoon'}
            </div>
            {feature && (
              <div style={{ marginTop: '22px' }}>
                <Kicker>The Feature</Kicker>
                <div style={{ fontFamily: SERIF_DISPLAY, fontWeight: 900, fontSize: feature.title.length > 30 ? '34px' : '42px', lineHeight: 1.04, letterSpacing: '-0.01em' }}>{feature.title}</div>
                {feature.deck && <div style={{ fontFamily: SERIF_BODY, fontStyle: 'italic', fontSize: '16px', lineHeight: 1.4, color: INK2, marginTop: '8px', maxWidth: '620px' }}>{feature.deck}</div>}
              </div>
            )}
            <div style={{ marginTop: 'auto', borderTop: `1px solid ${INK}`, paddingTop: '14px' }}>
              <Kicker>Also in this issue</Kicker>
              <div style={{ columnCount: 2, columnGap: '28px', fontSize: '13px', lineHeight: 1.6 }}>
                {contents.filter(c => !c.feature).map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', breakInside: 'avoid' }}>
                    <span>{c.title}</span>
                    <span style={{ flex: 1, borderBottom: `1px dotted ${INK3}`, transform: 'translateY(-4px)' }} />
                    <span style={{ fontFamily: SANS, fontSize: '11px', color: INK3 }}>{c.page}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontFamily: SANS, fontSize: '9.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: INK3 }}>
                <span>A MyStory.Family issue</span><span>Printed for the family</span>
              </div>
            </div>
          </Page>

          <PageBreak />

          {/* ---- A NOTE BEFORE YOU BEGIN ---- */}
          <Page head={head('A Note Before You Begin')} folio={2} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ maxWidth: '540px', alignSelf: 'center', width: '100%', marginTop: '36px' }}>
              <Kicker>A note before you begin</Kicker>
              <h2 style={{ margin: '0 0 6px', fontFamily: SERIF_DISPLAY, fontWeight: 700, fontSize: '34px', lineHeight: 1.1 }}>From {buyer}</h2>
              <div style={{ width: '48px', borderBottom: `2px solid ${RED}`, margin: '14px 0 26px' }} />
              {editingNote ? (
                <div className="issue-edit" style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: fonts.sans }}>
                  <div style={{ fontSize: '13px', color: INK2 }}>This page is yours. Why you sat down with {her}, what it was like, what you hope the grandchildren take from it. Three or four short paragraphs. Grace never touches this one.</div>
                  <div>
                    <label htmlFor="issue-byname" style={{ fontSize: '13px', color: INK2, display: 'block', marginBottom: '4px' }}>Your name, as it should appear</label>
                    <input id="issue-byname" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Tim" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: '15px', fontFamily: fonts.sans, border: `1px solid ${RULE}`, borderRadius: '6px', background: 'white', minHeight: '44px' }} />
                  </div>
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={10} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: '15px', lineHeight: 1.6, fontFamily: SERIF_BODY, border: `1px solid ${RULE}`, borderRadius: '6px', background: 'white', resize: 'vertical' }} placeholder="Dear family," />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={saveNote} disabled={savingNote} style={{ fontSize: '14px', padding: '10px 18px', minHeight: '44px', background: colors.navy, color: 'white', border: 'none', borderRadius: '8px', fontFamily: fonts.sans, cursor: 'pointer' }}>{savingNote ? 'Saving…' : 'Save the note'}</button>
                    {project.buyer_note && <button onClick={() => { setNote(project.buyer_note || ''); setEditingNote(false); }} style={{ fontSize: '14px', padding: '10px 14px', minHeight: '44px', background: 'transparent', border: `1px solid ${RULE}`, borderRadius: '8px', fontFamily: fonts.sans, cursor: 'pointer', color: INK2 }}>Cancel</button>}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}><Paras text={project.buyer_note} firstDrop size={16} lead={24} indent={false} /></div>
                  <p style={{ margin: '14px 0 0', fontFamily: SERIF_DISPLAY, fontStyle: 'italic', fontSize: '17px' }}>— {buyer}</p>
                  <button className="issue-edit" onClick={() => setEditingNote(true)} style={{ marginTop: '10px', fontSize: '12px', background: 'transparent', border: 'none', color: INK2, textDecoration: 'underline', fontFamily: fonts.sans, cursor: 'pointer', minHeight: '32px', padding: 0 }}>Edit this page</button>
                </div>
              )}
            </div>
            <div style={{ marginTop: 'auto', borderTop: `1px solid ${INK}`, paddingTop: '14px', fontSize: '13px', lineHeight: 1.55, maxWidth: '540px', alignSelf: 'center', width: '100%' }}>
              <Kicker>How this issue was made</Kicker>
              <p style={{ margin: 0, color: INK2 }}>{provSentence}</p>
            </div>
          </Page>

          {/* ---- THE FEATURE: opener bleeds, then three columns ---- */}
          {feature && (
            <>
              <PageBreak />
              <Page bleed folio={nextFolio()}>
                <div style={{ position: 'relative', height: featurePhoto && urls[featurePhoto.id] ? '560px' : '300px', background: featurePhoto && urls[featurePhoto.id] ? '#8F857A' : PAPER, overflow: 'hidden' }}>
                  {featurePhoto && urls[featurePhoto.id] && <img src={urls[featurePhoto.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.78)' }} />}
                  <div style={{ position: 'absolute', left: PAD_X, right: PAD_X, bottom: '44px', color: featurePhoto && urls[featurePhoto.id] ? PAPER : INK }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      {!(featurePhoto && urls[featurePhoto.id]) && <DeptIcon id="feature" size={36} />}
                      <div style={{ fontFamily: SANS, fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', opacity: 0.9 }}>The Feature</div>
                    </div>
                    <div style={{ fontFamily: SERIF_DISPLAY, fontWeight: 900, fontSize: feature.title.length > 28 ? '58px' : '78px', lineHeight: 0.98, letterSpacing: '-0.01em', textShadow: featurePhoto && urls[featurePhoto.id] ? '0 1px 12px rgba(0,0,0,0.35)' : 'none' }}>{feature.title}</div>
                  </div>
                </div>
                <div style={{ padding: `26px ${PAD_X}px 64px` }}>
                  <div style={{ fontFamily: SANS, fontSize: '10.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: RED }}>As told by {subject} · in {P.toLowerCase()} own words</div>
                  {feature.deck && <div style={{ fontFamily: SERIF_BODY, fontSize: '20px', lineHeight: '29px', color: INK2, margin: '12px 0 26px', maxWidth: '640px' }}>{feature.deck}</div>}
                  {featureBody(feature)}
                </div>
              </Page>
            </>
          )}

          {/* ---- CUSTOM PAGES (the family's own) ---- */}
          {custom.map(c => (byDept[c.id] || []).length > 0 && (
            <React.Fragment key={c.id}>
              <PageBreak />
              <Page head={head(c.title)} folio={nextFolio()}>
                <DeptHead id={c.id} title={c.title} sub={c.note || null} />
                {storyRun(byDept[c.id], { kickerOf: () => null })}
              </Page>
            </React.Fragment>
          ))}

          {/* ---- FAMILY STORIES ---- */}
          {stories.length > 0 && (
            <>
              <PageBreak />
              <Page head={head(titleOf('family_stories'))} folio={nextFolio()}>
                <DeptHead id="family_stories" title={titleOf('family_stories')} sub="The ones that get told at every holiday" />
                {storyRun(stories)}
              </Page>
            </>
          )}

          {/* ---- LAUGHTER: a photo across two columns, pieces around it ---- */}
          {laughter.length > 0 && (
            <>
              <PageBreak />
              <Page head={head(titleOf('laughter'))} folio={nextFolio()}>
                <DeptHead id="laughter" title={titleOf('laughter')} sub={`Things that still make ${her} laugh out loud`} />
                {restPhotos[0]?.photo && urls[restPhotos[0].photo.id] && (
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', columnGap: '20px', alignItems: 'end', marginBottom: '24px' }}>
                    {photoBox(restPhotos[0].photo, 300)}
                    <Cap it={restPhotos[0]} />
                  </div>
                )}
                {storyRun(laughter)}
              </Page>
            </>
          )}

          {/* ---- FROM THE SHOEBOX: a photo essay ---- */}
          {captioned.length > 0 && (
            <>
              <PageBreak />
              <Page head={head(titleOf('shoebox'))} folio={nextFolio()}>
                <DeptHead id="shoebox" title={titleOf('shoebox')} sub={`${buyer} held them up one at a time. This is what ${she} said.`} />
                {leadPhoto && (
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', columnGap: '20px', alignItems: 'end', marginBottom: '26px' }}>
                    {photoBox(leadPhoto.photo, 440, leadPhoto.caption)}
                    <div>
                      {capLine(leadPhoto) && <Kicker>{capLine(leadPhoto)}</Kicker>}
                      <div style={{ fontSize: '15px', lineHeight: '22px', color: INK }}>{leadPhoto.caption}</div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '22px 20px' }}>
                  {restPhotos.map((it, i) => {
                    const wide = i % 5 === 1;
                    return (
                      <div key={i} style={{ gridColumn: wide ? 'span 2' : 'span 1', breakInside: 'avoid' }}>
                        {photoBox(it.photo, wide ? 260 : 190, it.caption)}
                        <Cap it={it} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', columnGap: '20px', marginTop: '8px' }}>
                  <div /><div /><Filler saying={nextFiller()} />
                </div>
              </Page>
            </>
          )}

          {/* ---- FROM HER KITCHEN ---- */}
          {kitchen && (
            <>
              <PageBreak />
              <Page head={head(titleOf('kitchen'))} folio={nextFolio()}>
                <DeptHead id="kitchen" title={titleOf('kitchen')} sub="One recipe, the way it is actually made" />
                <h3 style={{ margin: 0, fontFamily: SERIF_DISPLAY, fontWeight: 900, fontSize: '40px', lineHeight: 1.04, letterSpacing: '-0.01em' }}>{kitchen.title || 'One recipe'}</h3>
                {kitchen.intro && <p style={{ margin: '12px 0 0', fontFamily: SERIF_BODY, fontStyle: 'italic', fontSize: '18px', lineHeight: 1.45, color: INK2, maxWidth: '600px' }}>{kitchen.intro}</p>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', columnGap: '28px', marginTop: '30px' }}>
                  <div>
                    <div style={{ borderTop: `2px solid ${INK}`, paddingTop: '10px' }}><Kicker>What you need</Kicker></div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '14.5px', lineHeight: 1.45 }}>
                      {(kitchen.ingredients || []).filter(Boolean).map((x, i) => <li key={i} style={{ padding: '7px 0', borderBottom: `1px solid ${RULE}` }}>{x}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div style={{ borderTop: `2px solid ${INK}`, paddingTop: '10px' }}><Kicker>The way {she} makes it</Kicker></div>
                    <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(kitchen.steps || []).filter(Boolean).map((x, i) => (
                        <li key={i} style={{ display: 'flex', gap: '14px', fontSize: '15.5px', lineHeight: '22px' }}>
                          <span style={{ fontFamily: SERIF_DISPLAY, fontWeight: 700, fontSize: '22px', lineHeight: '22px', color: RED, minWidth: '22px' }}>{i + 1}</span>
                          <span>{x}</span>
                        </li>
                      ))}
                    </ol>
                    {kitchen.her_note && <Filler saying={{ quote: kitchen.her_note, when: `${subject}, on the recipe` }} top={26} />}
                  </div>
                </div>
              </Page>
            </>
          )}

          {/* ---- FAITH: two columns, a slower page ---- */}
          {faith.length > 0 && (
            <>
              <PageBreak />
              <Page head={head(titleOf('faith'))} folio={nextFolio()}>
                <DeptHead id="faith" title={titleOf('faith')} sub={`What ${she} believes, and how ${she} came to it`} />
                {storyRun(faith, { cols: 2 })}
              </Page>
            </>
          )}

          {/* ---- WHAT I KNOW NOW: one strong list page ---- */}
          {knowNow.length > 0 && (
            <>
              <PageBreak />
              <Page head={head(titleOf('know_now'))} folio={nextFolio()}>
                <DeptHead id="know_now" title={titleOf('know_now')} sub="For the grandchildren, in no particular order" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px 32px' }}>
                  {knowNow.map((it, i) => (
                    <div key={i} style={{ display: 'flex', gap: '16px', breakInside: 'avoid' }}>
                      <span style={{ fontFamily: SERIF_DISPLAY, fontWeight: 900, fontSize: '36px', lineHeight: '34px', color: RED, minWidth: '40px' }}>{i + 1}</span>
                      <div>
                        <div style={{ fontFamily: SERIF_DISPLAY, fontWeight: 700, fontSize: '18px', lineHeight: '24px' }}>{it.advice || it.quote || it.text}</div>
                        {it.why && <div style={{ fontSize: '14.5px', lineHeight: '21px', color: INK2, marginTop: '6px' }}>{it.why}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                {remainingFillers().length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', columnGap: '20px', marginTop: '18px' }}>
                    {remainingFillers().slice(0, 3).map((s, i) => <Filler key={i} saying={nextFiller()} />)}
                  </div>
                )}
              </Page>
            </>
          )}

          {/* ---- UNTIL NEXT TIME: her last word, alone, with air around it ---- */}
          <PageBreak />
          <Page head={head('Until Next Time')} folio={nextFolio()} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 0' }}>
              <DeptIcon id="until_next_time" size={48} />
              <h2 style={{ margin: '18px 0 0', fontFamily: SERIF_DISPLAY, fontWeight: 700, fontSize: '34px', lineHeight: 1.1 }}>Until Next Time</h2>
              <div style={{ width: '48px', borderBottom: `2px solid ${RED}`, margin: '18px 0 30px' }} />
              {closing ? (
                <>
                  <p style={{ margin: 0, fontSize: '18px', lineHeight: '30px', maxWidth: '520px' }}>{closing}</p>
                  <p style={{ margin: '18px 0 0', fontFamily: SERIF_DISPLAY, fontStyle: 'italic', fontSize: '19px' }}>— {subject}</p>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: '14.5px', color: INK3, fontStyle: 'italic', maxWidth: '460px' }}>{subject}'s last word goes here — it comes from the fourth afternoon.</p>
              )}
            </div>
            <div style={{ marginTop: 'auto' }}>
              <Kicker>What {she} left out — for the family to add</Kicker>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {[0, 1, 2, 3, 4].map(i => <div key={i} style={{ borderBottom: `1px solid ${RULE}` }} />)}
              </div>
              <div style={{ marginTop: '30px', borderTop: `1px solid ${INK}`, paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '24px', fontFamily: SANS }}>
                <p style={{ margin: 0, fontSize: '11.5px', lineHeight: 1.5, color: INK2, maxWidth: '440px' }}>This issue is complete on its own. There is more where it came from — Issue No. 2, whenever the family decides.</p>
                <p style={{ margin: 0, fontSize: '9.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: INK3 }}>MyStory.Family</p>
              </div>
            </div>
          </Page>

          {/* ---- BACK COVER: the advertisement, or a quiet page ---- */}
          <PageBreak />
          {present ? (
            <AdPage present={present} subject={subject} rel={rel} year={year} />
          ) : (
            <Page folio={null} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{ fontFamily: SANS, fontSize: '10.5px', letterSpacing: '0.24em', textTransform: 'uppercase', color: INK3 }}>{issueLine}</div>
              {remainingFillers()[0] ? (
                <>
                  <div style={{ margin: '40px 0 0', maxWidth: '520px', fontFamily: SERIF_DISPLAY, fontStyle: 'italic', fontSize: '30px', lineHeight: 1.3 }}>“{String(remainingFillers()[0].quote || '').replace(/^["“]|["”]$/g, '')}”</div>
                  <div style={{ marginTop: '16px', fontFamily: SANS, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: INK3 }}>{remainingFillers()[0].when || subject}</div>
                </>
              ) : (
                <div style={{ margin: '40px 0 0', fontFamily: SERIF_DISPLAY, fontWeight: 900, fontSize: '54px', lineHeight: 1 }}>{title}</div>
              )}
              <div style={{ position: 'absolute', bottom: '48px', fontFamily: SANS, fontSize: '9.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: INK3 }}>A MyStory.Family issue</div>
            </Page>
          )}
        </div>
      )}

      <style>{`
        @page { size: letter; margin: 0; }
        @media print {
          body { background: white !important; }
          .issue-chrome, .issue-edit { display: none !important; }
          .issue-paper { box-shadow: none !important; margin: 0 !important; width: 8.5in !important; max-width: none !important; }
          .issue-paper section { min-height: 11in !important; }
          .issue-break { break-before: page; page-break-before: always; }
          img { max-width: 100%; }
        }
        @media (max-width: 860px) { .issue-paper { width: 100% !important; } }
      `}</style>
    </div>
  );
}

// ============================================================
// Icons
// ============================================================
function IconContents() {
  return (
    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#F4E4C1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.tan} strokeWidth="1.6" strokeLinecap="round">
        <rect x="4" y="3" width="16" height="18" rx="1.5" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    </div>
  );
}

function IconSession({ n }) {
  return (
    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#F4E4C1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.serif, fontSize: '18px', fontWeight: 500, color: colors.tan }}>
      {n}
    </div>
  );
}

function IconIssue({ locked }) {
  return (
    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: locked ? colors.borderSubtle : '#F4E4C1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={locked ? colors.gray : colors.tan} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" />
        <path d="M5 4v13a3 3 0 0 0 3 3" />
        <path d="M9 9h6M9 13h6" />
      </svg>
    </div>
  );
}
