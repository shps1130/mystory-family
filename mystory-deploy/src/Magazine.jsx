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
const CHUNKS = {
  1: { name: 'welcome', label: 'Welcome' },
  2: { name: 'about_you', label: 'About you' },
  3: { name: 'about_subject', label: 'About your mom' },
  4: { name: 'sensitivities', label: 'Sensitivities' },
  5: { name: 'departments', label: 'Filling the issue' },
  6: { name: 'logistics', label: 'Logistics' },
  7: { name: 'issue', label: 'Your issue' },
};
const TOTAL_CHUNKS = 7;
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
  return DEPARTMENTS.map(d => {
    const a = (answers[d.id] || '').toString().toLowerCase();
    let state = 'unknown';
    if (d.always) state = 'in';
    if (a === 'yes' || a === 'some' || a === 'threaded') state = 'in';
    if (a === 'no') state = 'out';
    if (d.id === 'faith' && a === 'threaded') state = 'threaded';
    if (d.id === 'shoebox' && (project?.has_photos || '').toLowerCase().startsWith('no')) state = 'out';
    return { id: d.id, title: departmentTitle(d, project), target: null, state };
  });
}

function getChunkLabel(chunkNumber, subjectName, relationship) {
  if (chunkNumber === 3) {
    if (relationship) return `About your ${relationship}`;
    if (subjectName) return `About ${subjectName}`;
    return 'About your loved one';
  }
  return CHUNKS[chunkNumber].label;
}

// ============================================================
// Chunk 1 — scripted welcome (issue model)
// ============================================================
const CHUNK_1_WELCOME = (buyerName) => [
  { type: 'heading', text: `Hello, ${buyerName || 'there'}. I'm Grace.` },
  { type: 'paragraph', text: "I'm glad you're here. Before we go any further, I want to tell you what we're making together — and what you can expect from me." },
  { type: 'paragraph', text: "We're going to make an issue. Not a book — an issue, like the magazines your family grew up with. A cover with a photograph and the contents on the front. One long story the whole family knows. A few short ones. And the small things: the sayings everyone can hear in her voice, the joke that gets told every holiday, the photographs from the shoebox with the story behind each one, a recipe, and what she'd tell the grandchildren." },
  { type: 'paragraph', text: "Over the next fifteen minutes or so, we'll fill in the contents page together. I'll ask about who they are and what we should be careful with, then I'll name the departments one at a time and you'll tell me which ones fit. Then we'll plan four afternoons to go collect it all." },
  { type: 'paragraph', text: "Two things up front." },
  { type: 'paragraph', text: "First: there are no wrong answers. You can pause anytime and come back — I'll save where we are." },
  { type: 'paragraph', text: "Second — and this matters: I'm not here to tell their story for them. Their story is theirs, in their own words, when you sit down together. What we're doing right now is making sure you know exactly what we're collecting, so you can relax and just have the conversation." },
  { type: 'paragraph', text: "Most people think about doing this for years before they actually start. You started. Let's keep going." },
  { type: 'paragraph', text: "Ready when you are." },
];

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
      <ComingNext
        title={`Capture session ${activeSession}: ${sessionTitle(project, activeSession)}`}
        body="This is where you'll add the photographs you snapped, upload the recording or paste the transcript, and Grace will file the pieces into the issue. It's the next part of the build."
        onReturnToDashboard={() => setView('dashboard')}
      />
    );
  }

  if (view === 'issue') {
    return (
      <ComingNext
        title="The issue"
        body="The assembled issue — cover, contents, feature, departments — shows up here once the first session is filed."
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

  const greeting = !project.getting_started_complete
    ? {
        eyebrow: project.subject_name ? `${project.subject_name}'s issue` : 'A new issue',
        heading: `Welcome${project.buyer_name ? `, ${project.buyer_name}` : ''}.`,
        body: "Let's fill in the contents page together. Start with Getting Started below.",
      }
    : {
        eyebrow: `${subject}'s issue · Vol. 1`,
        heading: `Welcome back${project.buyer_name ? `, ${project.buyer_name}` : ''}.`,
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
          <Header buyerInitials={buyerInitials} buyerName={project.buyer_name} />
          <Hero greeting={greeting} />
          <ProgressBar completed={completedSteps} total={totalSteps} />

          <Section barColor={colors.gold} title={!project.getting_started_complete ? 'Start here' : 'Continue where you left off'}>
            {!project.getting_started_complete && (
              <ActiveCard
                eyebrow="Begin"
                title="Getting started"
                description="Together we'll fill in the contents page of the issue and plan four afternoons to collect it. About 15 minutes."
                buttonText="Begin →"
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
            onClick={approvedCount > 0 ? onOpenIssue : null}
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
          {project.subject_name ? `The ${project.subject_name.split(' ').slice(-1)[0]} Family` : 'The Family'} · Vol. 1
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
function Header({ buyerInitials, buyerName, onBack, backLabel }) {
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
            ? `Read it as it stands — ${approvedCount} session${approvedCount === 1 ? '' : 's'} filed so far`
            : 'Begins taking shape after your first session'}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Getting Started — seven chunks against /api/claude-magazine
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
  const [awaitingContinue, setAwaitingContinue] = useState(null);
  const [allComplete, setAllComplete] = useState(false);
  const [kickstartChunk, setKickstartChunk] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesRef = useRef([]);
  const setMessagesSafe = (updater) => {
    setMessages(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      messagesRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    if (kickstartChunk && !loading) {
      const chunk = kickstartChunk;
      setKickstartChunk(null);
      sendToGrace(null, chunk);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kickstartChunk]);

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
          const chunkHasGraceMsg = (msgs || []).some(
            m => m.chunk_number === firstIncomplete.chunk_number && m.role === 'grace'
          );
          if (firstIncomplete.chunk_number > 1 && !chunkHasGraceMsg) {
            setKickstartChunk(firstIncomplete.chunk_number);
          }
        } else if (chunks.length > 0) {
          setCurrentChunk(7);
          setHasStarted(true);
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

  const refreshProject = async () => {
    const { data } = await supabase.from('interview_projects').select('*').eq('id', project.id).single();
    if (data) {
      setCurrentProject(data);
      onProjectUpdate(data);
    }
  };

  const upsertChunk = async (n, status) => {
    const stamp = status === 'complete' ? { completed_at: new Date().toISOString() } : { started_at: new Date().toISOString() };
    await supabase.from('interview_orientation_chunks').upsert({
      project_id: project.id, chunk_number: n, chunk_name: CHUNKS[n].name, status, ...stamp,
    }, { onConflict: 'project_id,chunk_number' });
  };

  const handleBegin = async () => {
    setHasStarted(true);
    setCurrentChunk(2);
    await upsertChunk(1, 'complete');
    await upsertChunk(2, 'in_progress');
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
          .insert({ project_id: project.id, chunk_number: chunkNumber, role: 'buyer', content: userMessage })
          .select().single();
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

      const response = await authedFetch('/api/claude-magazine', {
        messages: history,
        project: currentProject,
        currentChunk: chunkNumber,
        mode: 'getting_started',
      });
      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const data = await response.json();
      let graceResponse = data.response || data.content || '';
      const isComplete = graceResponse.includes('[CHUNK_COMPLETE]');
      if (isComplete) graceResponse = graceResponse.replace('[CHUNK_COMPLETE]', '').trim();
      graceResponse = graceResponse.replace(/\*\*/g, '');

      const { data: savedGrace } = await supabase
        .from('interview_messages')
        .insert({ project_id: project.id, chunk_number: chunkNumber, role: 'grace', content: graceResponse })
        .select().single();
      if (savedGrace) setMessagesSafe(prev => [...prev, savedGrace]);

      if (data.data && Object.keys(data.data).length > 0) {
        await applyExtractedData(data.data);
      }

      if (isComplete) {
        await upsertChunk(chunkNumber, 'complete');
        setChunkStatuses(prev => ({ ...prev, [chunkNumber]: 'complete' }));
        if (chunkNumber < TOTAL_CHUNKS) {
          setAwaitingContinue(chunkNumber);
        } else {
          await supabase
            .from('interview_projects')
            .update({ getting_started_complete: true, current_step: 'session_1' })
            .eq('id', project.id);
          const done = { ...currentProject, getting_started_complete: true, current_step: 'session_1' };
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

  // Save fields Grace extracted via the DATA block. Whitelisted columns only.
  const applyExtractedData = async (extracted) => {
    const TEXT = [
      'buyer_name', 'buyer_relationship', 'buyer_motivation',
      'subject_name', 'subject_living_situation',
      'subject_communication_style', 'subject_one_thing_to_know',
      'sensitivities', 'hopes_territory', 'has_photos',
      'logistics_format', 'logistics_cadence', 'logistics_first_conversation',
      'logistics_setting', 'logistics_others', 'logistics_bring_photos',
    ];
    const updates = {};
    for (const key of TEXT) {
      if (extracted[key] !== undefined && extracted[key] !== null && extracted[key] !== '') {
        updates[key] = String(extracted[key]);
      }
    }
    if (extracted.subject_age !== undefined && extracted.subject_age !== null && extracted.subject_age !== '') {
      updates.subject_age = parseInt(extracted.subject_age) || null;
    }
    // departments: merge into the existing object, key by key
    if (extracted.departments && typeof extracted.departments === 'object' && !Array.isArray(extracted.departments)) {
      const existing = (currentProject.departments && typeof currentProject.departments === 'object') ? currentProject.departments : {};
      updates.departments = { ...existing, ...extracted.departments };
    }
    // feature_candidates: Grace sends the full array whenever it changes
    if (Array.isArray(extracted.feature_candidates)) {
      updates.feature_candidates = extracted.feature_candidates.filter(c => typeof c === 'string' && c.trim());
    }
    // issue_plan: only in chunk 7
    if (extracted.issue_plan && typeof extracted.issue_plan === 'object' && Array.isArray(extracted.issue_plan.sessions)) {
      updates.issue_plan = extracted.issue_plan;
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
    await sendToGrace('[The buyer wants to skip this. Acknowledge gently and move on.]', currentChunk);
  };

  const handleContinue = async () => {
    const completedChunk = awaitingContinue;
    if (!completedChunk || loading) return;
    const nextChunk = completedChunk + 1;
    setAwaitingContinue(null);
    setCurrentChunk(nextChunk);
    await upsertChunk(nextChunk, 'in_progress');
    setChunkStatuses(prev => ({ ...prev, [nextChunk]: 'in_progress' }));
    await sendToGrace(null, nextChunk);
  };

  const buyerName = currentProject.buyer_name || '';
  const subjectName = currentProject.subject_name;
  const relationship = currentProject.buyer_relationship;

  return (
    <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: fonts.sans, color: colors.text }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: `0.5px solid ${colors.border}` }}>
          <Header onBack={onReturnToDashboard} backLabel={hasStarted ? '← Save & exit' : '← Dashboard'} />

          <div style={{ padding: '16px 24px', background: colors.creamLight, borderBottom: `0.5px solid ${colors.border}` }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: colors.textTertiary, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '3px' }}>
                Before the sessions
              </div>
              <div style={{ fontFamily: fonts.serif, fontSize: '16px', fontWeight: 500 }}>Getting started</div>
            </div>
            <NamedChunkIndicator current={currentChunk} statuses={chunkStatuses} subjectName={subjectName} relationship={relationship} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 0 }} className="getting-started-layout">
            <div style={{ padding: '36px 32px 32px', minWidth: 0 }}>
              {!hasStarted && <WelcomeScreen welcomeContent={CHUNK_1_WELCOME(buyerName)} onBegin={handleBegin} />}
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
                  plan={currentProject.issue_plan}
                  awaitingContinue={awaitingContinue}
                  allComplete={allComplete}
                  onOpenGuide={onOpenGuide}
                  subjectNameForDone={currentProject.subject_name}
                  onBackToDashboard={onReturnToDashboard}
                  onContinue={handleContinue}
                />
              )}
            </div>
            <ContentsPanel project={currentProject} currentChunk={currentChunk} />
          </div>

          <style>{`
            @media (max-width: 900px) {
              .getting-started-layout { grid-template-columns: 1fr !important; }
              .contents-panel { border-left: none !important; border-top: 0.5px solid ${colors.border} !important; }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ welcomeContent, onBegin }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <div style={{ width: '4px', height: '16px', background: colors.gold, borderRadius: '2px' }} />
        <div style={{ fontFamily: fonts.serif, fontSize: '14px', fontWeight: 500, color: colors.textSecondary, letterSpacing: '0.3px' }}>Welcome</div>
      </div>
      <div style={{ display: 'flex', gap: '18px' }}>
        <GraceAvatar size="large" />
        <div style={{ flex: 1 }}>
          {welcomeContent.map((block, i) => block.type === 'heading' ? (
            <div key={i} style={{ fontFamily: fonts.serif, fontSize: '24px', fontWeight: 500, color: colors.navy, marginBottom: '16px', lineHeight: 1.3 }}>{block.text}</div>
          ) : (
            <div key={i} style={{ fontSize: '16px', lineHeight: 1.7, color: colors.navy, marginBottom: '14px' }}>{block.text}</div>
          ))}
          <button onClick={onBegin} style={{
            marginTop: '10px', fontSize: '15px', padding: '12px 30px',
            background: colors.navy, color: 'white', border: 'none', borderRadius: '999px',
            cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit',
          }}>
            Let's begin →
          </button>
        </div>
      </div>
    </div>
  );
}

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
      {[1, 2, 3, 4, 5, 6].filter(n => chunkStatuses[n] === 'complete' && n !== currentChunk).map(n => (
        <CompletedChunkCard key={n} chunkNumber={n} subjectName={subjectName} relationship={relationship} />
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
        <div style={{ width: '4px', height: '16px', background: colors.gold, borderRadius: '2px' }} />
        <div style={{ fontFamily: fonts.serif, fontSize: '14px', fontWeight: 500, color: colors.textSecondary, letterSpacing: '0.3px' }}>{currentChunkLabel}</div>
      </div>

      {currentChunkMessages.map((msg, i) => <Message key={msg.id || i} message={msg} />)}

      {/* Session cards — rendered when the issue plan has been proposed (chunk 7) */}
      {currentChunk === 7 && plan?.sessions?.length > 0 && (
        <div style={{ marginLeft: '54px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {plan.sessions.map((s, i) => <SessionRevealCard key={s.number || i} session={s} index={i} />)}
        </div>
      )}

      {loading && <TypingIndicator />}
      <div ref={messagesEndRef} />

      {!loading && awaitingContinue === currentChunk && (
        <div style={{
          marginLeft: '54px', marginTop: '24px', paddingTop: '20px', borderTop: `0.5px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ fontSize: '13px', color: colors.textTertiary }}>Take your time. Continue when you're ready.</div>
          <button onClick={onContinue} style={{
            fontSize: '14px', padding: '11px 28px', background: colors.navy, color: 'white',
            border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit',
          }}>
            Continue →
          </button>
        </div>
      )}

      {!loading && allComplete && (
        <div style={{
          marginLeft: '54px', marginTop: '28px', background: colors.creamWarm,
          border: `1.5px solid ${colors.gold}`, borderRadius: '14px', padding: '26px 28px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: colors.olive, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3.5 7l2.5 2.5L10.5 4.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ fontSize: '11px', color: colors.tan, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Getting started · Complete</div>
          </div>
          <div style={{ fontFamily: fonts.serif, fontSize: '22px', fontWeight: 500, lineHeight: 1.35, marginBottom: '10px' }}>
            You have a contents page{subjectNameForDone ? ` for ${subjectNameForDone}'s issue` : ''}.
          </div>
          <div style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: 1.7, marginBottom: '20px' }}>
            Your guide for the first session is ready — what you're collecting, how to open, and what to do if something comes up. Read it before you sit down together.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button onClick={onOpenGuide} style={{
              fontSize: '15px', padding: '12px 30px', background: colors.navy, color: 'white',
              border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit',
            }}>
              Open your guide →
            </button>
            <button onClick={onBackToDashboard} style={{
              fontSize: '13px', padding: '10px 18px', background: 'transparent', border: `0.5px solid ${colors.border}`,
              borderRadius: '999px', cursor: 'pointer', color: colors.textSecondary, fontFamily: 'inherit',
            }}>
              Back to dashboard
            </button>
          </div>
        </div>
      )}

      {!loading && !allComplete && awaitingContinue !== currentChunk && !hasGraceMessageThisChunk && (
        <div style={{ marginLeft: '54px', marginTop: '20px' }}><TypingIndicator /></div>
      )}

      {!loading && !allComplete && awaitingContinue !== currentChunk && hasGraceMessageThisChunk && (
        <div style={{ marginLeft: '54px', marginTop: '20px' }}>
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Type your answer here..."
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit(); }}
            style={{
              width: '100%', minHeight: '110px', padding: '14px 16px',
              border: `0.5px solid ${colors.border}`, borderRadius: '8px',
              fontFamily: 'inherit', fontSize: '15px', lineHeight: 1.6, color: colors.text,
              background: 'white', resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', flexWrap: 'wrap', gap: '12px' }}>
            <button onClick={onSkip} style={{
              fontSize: '13px', padding: '7px 14px', background: 'transparent',
              border: `0.5px solid ${colors.border}`, borderRadius: '6px', cursor: 'pointer',
              color: colors.textSecondary, fontFamily: 'inherit',
            }}>
              Skip this one
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: colors.textTertiary }}>⌘+Enter to send</span>
              <button onClick={onSubmit} disabled={!input.trim()} style={{
                fontSize: '14px', padding: '9px 22px',
                background: input.trim() ? colors.navy : colors.gray, color: 'white',
                border: 'none', borderRadius: '999px', cursor: input.trim() ? 'pointer' : 'not-allowed',
                fontWeight: 500, fontFamily: 'inherit',
              }}>
                Send
              </button>
            </div>
          </div>
          {error && (
            <div style={{ marginTop: '12px', padding: '10px 14px', background: '#FBE9E7', color: '#B8543D', borderRadius: '6px', fontSize: '13px' }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NamedChunkIndicator({ current, statuses, subjectName, relationship }) {
  const stepLabels = [
    { num: 1, label: 'Welcome' },
    { num: 2, label: 'You' },
    { num: 3, label: relationship ? `Your ${relationship}` : (subjectName || 'Your mom') },
    { num: 4, label: 'Sensitivities' },
    { num: 5, label: 'The issue' },
    { num: 6, label: 'Logistics' },
    { num: 7, label: 'Your sessions' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
      {stepLabels.map((step, i) => {
        const isComplete = statuses[step.num] === 'complete';
        const isActive = step.num === current;
        const bg = isComplete ? colors.olive : isActive ? colors.navy : 'white';
        const border = isComplete || isActive ? 'none' : `1px solid ${colors.border}`;
        return (
          <React.Fragment key={step.num}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px 4px 4px', borderRadius: '999px',
              background: isActive ? colors.creamWarm : 'transparent',
              border: isActive ? `1px solid ${colors.gold}` : '1px solid transparent',
            }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%', background: bg, border,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 500, color: isComplete || isActive ? 'white' : colors.textTertiary, flexShrink: 0,
              }}>
                {isComplete ? (
                  <svg width="10" height="10" viewBox="0 0 12 12"><path d="M3 6l2 2 4-4" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : step.num}
              </div>
              <span style={{ fontSize: '12px', fontWeight: isActive ? 600 : isComplete ? 500 : 400, color: isComplete || isActive ? colors.text : colors.textTertiary, whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div style={{ width: '8px', height: '1px', background: isComplete ? colors.olive : colors.border, flexShrink: 0 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ============================================================
// Contents panel — the issue assembling as Grace learns
// ============================================================
function ContentsPanel({ project, currentChunk }) {
  const departments = activeDepartments(project);
  const answered = Object.keys((project.departments && typeof project.departments === 'object') ? project.departments : {}).length;
  const fieldsToTrack = [
    project.buyer_relationship, project.subject_name, project.subject_age,
    project.subject_communication_style || project.subject_living_situation,
    project.sensitivities, project.has_photos, answered > 0, project.issue_plan,
  ];
  const filled = fieldsToTrack.filter(Boolean).length;
  const pct = Math.round((filled / fieldsToTrack.length) * 100);
  const candidates = Array.isArray(project.feature_candidates) ? project.feature_candidates : [];

  return (
    <div className="contents-panel" style={{
      background: colors.creamLight, borderLeft: `0.5px solid ${colors.border}`,
      padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '20px',
    }}>
      <div>
        <div style={{ fontSize: '11px', color: colors.tan, fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>
          The issue, in progress
        </div>
        <div style={{ fontFamily: fonts.serif, fontSize: '18px', fontWeight: 500, color: colors.text, marginBottom: '12px', lineHeight: 1.3 }}>
          {pct < 30 ? "We're just getting started." : pct < 60 ? 'Filling in the contents page.' : pct < 100 ? 'Almost there.' : 'Your issue is planned.'}
        </div>
        <div style={{ height: '4px', background: colors.borderSubtle, borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: colors.gold, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      <PanelSection title={`About ${project.subject_name || 'them'}`} active={currentChunk === 3}>
        <PanelField label="Name" value={project.subject_name} />
        <PanelField label="Age" value={project.subject_age} />
        <PanelField label="Lives" value={project.subject_living_situation} />
        <PanelField label="How they talk" value={project.subject_communication_style} multiline />
      </PanelSection>

      <PanelSection title="Sensitivities" active={currentChunk === 4}>
        <PanelField label="What to avoid" value={project.sensitivities} multiline />
      </PanelSection>

      <PanelSection title="Contents" active={currentChunk === 5}>
        {departments.map(d => (
          <div key={d.id} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
              background: d.state === 'in' || d.state === 'planned' ? colors.olive : d.state === 'threaded' ? colors.gold : d.state === 'out' ? colors.borderSubtle : 'white',
              border: d.state === 'unknown' ? `1px solid ${colors.border}` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {(d.state === 'in' || d.state === 'planned') && (
                <svg width="9" height="9" viewBox="0 0 10 10"><path d="M2.5 5l1.5 1.5L7.5 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
              {d.state === 'out' && <span style={{ width: '6px', height: '1px', background: colors.gray }} />}
            </span>
            <span style={{
              color: d.state === 'out' ? colors.gray : d.state === 'unknown' ? colors.textTertiary : colors.text,
              textDecoration: d.state === 'out' ? 'line-through' : 'none',
            }}>
              {d.title}{d.state === 'threaded' ? ' (threaded)' : ''}
            </span>
          </div>
        ))}
        <PanelField label="Photographs" value={project.has_photos} multiline />
        {candidates.length > 0 && (
          <div style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: 1.5, marginTop: '4px' }}>
            <span style={{ fontWeight: 500 }}>Feature candidates:</span> {candidates.join(' · ')}
          </div>
        )}
      </PanelSection>

      {(project.logistics_format || project.logistics_cadence || project.logistics_first_conversation || project.logistics_setting) && (
        <PanelSection title="How we'll do this" active={currentChunk === 6}>
          <PanelField label="Format" value={project.logistics_format} />
          <PanelField label="Cadence" value={project.logistics_cadence} />
          <PanelField label="First one" value={project.logistics_first_conversation} />
          <PanelField label="Where" value={project.logistics_setting} />
          <PanelField label="Bring the box" value={project.logistics_bring_photos} />
        </PanelSection>
      )}
      {currentChunk === 6 && !project.logistics_format && (
        <PanelSection title="How we'll do this" active>
          <div style={{ fontSize: '12px', color: colors.textTertiary, fontStyle: 'italic', lineHeight: 1.5 }}>
            Optional — we can plan logistics here or you can figure it out later.
          </div>
        </PanelSection>
      )}

      <PanelSection title="The sessions" active={currentChunk === 7}>
        {(project.issue_plan?.sessions?.length > 0
          ? project.issue_plan.sessions.map(s => ({ num: s.number, title: s.title, filled: true }))
          : [1, 2, 3, 4].map(n => ({ num: n, title: DEFAULT_SESSION_TITLES[n], filled: false }))
        ).map(s => (
          <div key={s.num} style={{ fontSize: '13px', color: s.filled ? colors.text : colors.textTertiary, display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{
              width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
              background: s.filled ? colors.olive : colors.borderSubtle, color: s.filled ? 'white' : colors.textTertiary,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500,
            }}>
              {s.num}
            </span>
            <span>{s.title}</span>
          </div>
        ))}
      </PanelSection>
    </div>
  );
}

function PanelSection({ title, active, children }) {
  return (
    <div>
      <div style={{
        fontSize: '11px', color: active ? colors.tan : colors.textSecondary, fontWeight: 600,
        letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        {active && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.gold, animation: 'pulse 2s ease-in-out infinite' }} />}
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

function PanelField({ label, value, multiline }) {
  const isFilled = value !== null && value !== undefined && value !== '';
  return (
    <div style={{ fontSize: '13px', lineHeight: 1.4, display: multiline ? 'block' : 'flex', gap: '6px', color: isFilled ? colors.text : colors.textTertiary }}>
      <span style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 500 }}>{label}:</span>{' '}
      <span style={{ color: isFilled ? colors.text : colors.gray, fontStyle: isFilled ? 'normal' : 'italic' }}>
        {isFilled ? (typeof value === 'string' && value.length > 50 ? value.slice(0, 50) + '…' : value) : '—'}
      </span>
    </div>
  );
}

// ============================================================
// Chat sub-components
// ============================================================
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

function Message({ message }) {
  if (message.role === 'grace') {
    const clean = message.content.replace(/\*\*/g, '');
    return (
      <div style={{ display: 'flex', gap: '18px', marginBottom: '24px' }}>
        <GraceAvatar />
        <div style={{ flex: 1 }}>
          {clean.split('\n').filter(p => p.trim()).map((para, i) => (
            <div key={i} style={{ fontSize: '16px', lineHeight: 1.7, color: colors.navy, marginBottom: '12px' }}>{para}</div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={{ marginLeft: '54px', marginBottom: '20px' }}>
      <div style={{
        background: colors.creamLight, borderLeft: `2px solid ${colors.gold}`, padding: '14px 16px',
        borderRadius: '0 8px 8px 0', fontSize: '15px', lineHeight: 1.6, color: colors.text, whiteSpace: 'pre-wrap',
      }}>
        {message.content}
      </div>
    </div>
  );
}

function SessionRevealCard({ session, index }) {
  const collects = Array.isArray(session.collects) ? session.collects : [];
  const labels = collects.map(id => (DEPARTMENTS.find(d => d.id === id)?.title || id)).join(' · ');
  return (
    <div style={{
      background: colors.creamWarm, border: `1px solid ${colors.gold}`, borderRadius: '12px',
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px',
      animation: `fadeUp 0.4s ease ${index * 0.12}s both`,
    }}>
      <IconSession n={session.number || index + 1} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', color: colors.tan, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '2px' }}>
          Session {session.number || index + 1}
        </div>
        <div style={{ fontFamily: fonts.serif, fontSize: '16px', fontWeight: 500, color: colors.text, marginBottom: session.description ? '3px' : 0 }}>
          {session.title}
        </div>
        {session.description && <div style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: 1.5 }}>{session.description}</div>}
        {labels && <div style={{ fontSize: '11px', color: colors.textTertiary, marginTop: '4px' }}>Collects: {labels}</div>}
      </div>
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '18px', marginBottom: '24px' }}>
      <GraceAvatar />
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '14px 0' }}>
        {[0, 0.2, 0.4].map((d, i) => (
          <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.tan, animation: `typingPulse 1.4s ease-in-out ${d}s infinite` }} />
        ))}
        <style>{`@keyframes typingPulse { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }`}</style>
      </div>
    </div>
  );
}

function CompletedChunkCard({ chunkNumber, subjectName, relationship }) {
  return (
    <div style={{
      background: colors.creamLight, border: `0.5px solid ${colors.border}`, borderRadius: '12px',
      padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: colors.olive, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2.5 5l1.5 1.5L7.5 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <div style={{ fontFamily: fonts.serif, fontSize: '14px', color: colors.textSecondary }}>
        {getChunkLabel(chunkNumber, subjectName, relationship)}
      </div>
    </div>
  );
}

// ============================================================
// Session guide — generates once per session, saves, loads instantly
// ============================================================
function SessionGuide({ project, sessionNumber, onProjectUpdate, onReturnToDashboard, onOpenCapture }) {
  const key = String(sessionNumber);
  const saved = project.interviewer_guides?.[key] || null;
  const [guide, setGuide] = useState(saved);
  const [loading, setLoading] = useState(!saved);
  const [error, setError] = useState('');
  const title = sessionTitle(project, sessionNumber);

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
        const text = (data.guide || '').trim();
        if (!text) throw new Error('Empty guide');
        setGuide(text);
        const guides = { ...(project.interviewer_guides || {}), [key]: text };
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

  return (
    <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: fonts.sans, color: colors.text }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: `0.5px solid ${colors.border}` }}>
          <Header onBack={onReturnToDashboard} />
          <div style={{ padding: '28px 32px 8px', borderBottom: `0.5px solid ${colors.border}`, background: colors.creamLight }}>
            <div style={{ fontSize: '11px', color: colors.tan, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px' }}>
              Session {sessionNumber} of {TOTAL_SESSIONS} · Your guide
            </div>
            <h1 style={{ fontFamily: fonts.serif, fontSize: '26px', fontWeight: 500, margin: '0 0 8px', lineHeight: 1.2 }}>{title}</h1>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.6, margin: '0 0 18px', maxWidth: '600px' }}>
              Read this before you sit down{project.subject_name ? ` with ${project.subject_name}` : ''}. Print it if you like — it's meant to be glanced at mid-conversation.
            </p>
          </div>
          <div style={{ padding: '28px 32px 36px' }} className="guide-body">
            {loading && (
              <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                <GraceAvatar />
                <div style={{ fontSize: '15px', color: colors.textSecondary }}>Grace is writing your guide for this session…</div>
              </div>
            )}
            {!loading && error && (
              <div style={{ padding: '14px 16px', background: '#FBE9E7', color: '#B8543D', borderRadius: '8px', fontSize: '14px' }}>
                {error} <button onClick={regenerate} style={{ marginLeft: '8px', fontSize: '13px', background: 'transparent', border: 'none', color: '#B8543D', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>Try again</button>
              </div>
            )}
            {!loading && guide && <GuideText text={guide} />}
            {!loading && guide && (
              <div style={{ marginTop: '32px', paddingTop: '22px', borderTop: `0.5px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={() => window.print()} style={{ fontSize: '13px', padding: '9px 18px', background: 'transparent', border: `0.5px solid ${colors.border}`, borderRadius: '999px', cursor: 'pointer', color: colors.textSecondary, fontFamily: 'inherit' }}>Print</button>
                  <button onClick={regenerate} style={{ fontSize: '13px', padding: '9px 18px', background: 'transparent', border: `0.5px solid ${colors.border}`, borderRadius: '999px', cursor: 'pointer', color: colors.textSecondary, fontFamily: 'inherit' }}>Rewrite the guide</button>
                </div>
                <button onClick={onOpenCapture} style={{ fontSize: '14px', padding: '11px 26px', background: colors.navy, color: 'white', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
                  I've had the session →
                </button>
              </div>
            )}
          </div>
          <style>{`
            @media print {
              body { background: white !important; }
              .guide-body { padding: 0 !important; }
              button { display: none !important; }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}

// Renders the guide's markdown-lite: ## headings, - bullets, paragraphs.
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
// Placeholder for views that arrive in the next stage
// ============================================================
function ComingNext({ title, body, onReturnToDashboard }) {
  return (
    <div style={{ minHeight: '100vh', background: colors.cream, fontFamily: fonts.sans, color: colors.text }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: `0.5px solid ${colors.border}` }}>
          <Header onBack={onReturnToDashboard} />
          <div style={{ padding: '40px 32px' }}>
            <div style={{ fontSize: '11px', color: colors.tan, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>Coming next</div>
            <h1 style={{ fontFamily: fonts.serif, fontSize: '24px', fontWeight: 500, margin: '0 0 12px' }}>{title}</h1>
            <p style={{ fontSize: '15px', color: colors.textSecondary, lineHeight: 1.7, maxWidth: '560px', margin: 0 }}>{body}</p>
          </div>
        </div>
      </div>
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
