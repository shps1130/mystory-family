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
export default function Interview() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [view, setView] = useState('dashboard');

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

    const loadProject = async () => {
      const { data: projects, error } = await supabase
        .from('interview_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading project:', error);
        return;
      }

      if (projects && projects.length > 0) {
        setProject(projects[0]);
      } else {
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

        if (createError) {
          console.error('Error creating project:', createError);
          return;
        }
        setProject(newProject);
      }
    };

    loadProject();
  }, [user]);

  if (authLoading) return <LoadingScreen />;
  if (!user) return <SignInScreen />;
  if (!project) return <LoadingScreen message="Setting up your project..." />;

  if (view === 'getting_started') {
    return (
      <GettingStarted
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
function Dashboard({ user, project, onBeginGettingStarted }) {
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
              />
              <LockedCard
                title="Capturing your conversations"
                subtitle="Step 3 of 3"
                icon={<IconRecord />}
                locked={!project.interviewer_guide_complete}
              />
            </CardGrid>
          </Section>

          <Section
            barColor={colors.gray}
            title="Your conversations"
            subtitle={!project.capturing_conversations_complete ? '— unlocks after preparation' : null}
          >
            <CardGrid>
              <LockedCard title="Early life" subtitle="Conversation 1" icon={<IconHouse />} locked />
              <LockedCard title="Formative years" subtitle="Conversation 2" icon={<IconPerson />} locked />
              <LockedCard title="Faith" subtitle="Conversation 3" icon={<IconCross />} locked />
              <LockedCard title="Marriage & family" subtitle="Conversation 4" icon={<IconFamily />} locked />
              <LockedCard title="Reflections" subtitle="Conversation 5" icon={<IconReflect />} locked />
              <LockedCard title="Add a topic" subtitle="Optional · After Conversation 5" icon={<IconPlus />} locked dashed />
            </CardGrid>
          </Section>

          <BookFooter subject={subject} hasContent={false} />
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

function LockedCard({ title, subtitle, icon, locked, dashed }) {
  return (
    <div style={{
      background: colors.creamLight,
      border: `0.5px ${dashed ? 'dashed' : 'solid'} ${colors.border}`,
      borderRadius: '12px',
      padding: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      opacity: locked ? 0.6 : 1,
    }}>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>{title}</div>
        <div style={{ fontSize: '11px', color: colors.textTertiary }}>
          {subtitle}{locked ? ' · Locked' : ''}
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
function GettingStarted({ project, onProjectUpdate, onReturnToDashboard }) {
  const [currentChunk, setCurrentChunk] = useState(1);
  const [chunkStatuses, setChunkStatuses] = useState({});
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState('');
  const [currentProject, setCurrentProject] = useState(project);
  const messagesEndRef = useRef(null);

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
        } else if (chunks.length > 0) {
          setCurrentChunk(7);
          setHasStarted(true);
        }
      }

      if (msgs) setMessages(msgs);
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

        if (savedMsg) setMessages(prev => [...prev, savedMsg]);
      }

      const history = messages.map(m => ({
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

      const response = await fetch('/api/claude-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          project: currentProject,
          currentChunk: chunkNumber,
          mode: 'getting_started',
        }),
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

      if (savedGrace) setMessages(prev => [...prev, savedGrace]);

      // Extract and save project fields based on chunk and buyer's message
      if (userMessage) {
        await extractAndSaveFields(userMessage, chunkNumber);
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
          const nextChunk = chunkNumber + 1;
          setCurrentChunk(nextChunk);

          await supabase.from('interview_orientation_chunks').upsert({
            project_id: project.id,
            chunk_number: nextChunk,
            chunk_name: CHUNKS[nextChunk].name,
            status: 'in_progress',
            started_at: new Date().toISOString(),
          }, { onConflict: 'project_id,chunk_number' });

          setChunkStatuses(prev => ({ ...prev, [nextChunk]: 'in_progress' }));
          setTimeout(() => sendToGrace(null, nextChunk), 500);
        } else {
          // All chunks complete
          await supabase
            .from('interview_projects')
            .update({ getting_started_complete: true, current_step: 'interviewer_guide' })
            .eq('id', project.id);

          onProjectUpdate({ ...currentProject, getting_started_complete: true });
        }
      }
    } catch (err) {
      console.error('Error talking to Grace:', err);
      setError('Something went wrong. Please try again, or come back later — your progress is saved.');
    } finally {
      setLoading(false);
    }
  };

  // Lightweight field extraction — looks at the buyer's message and stores
  // what we can infer for the plan panel. Conservative — only stores when confident.
  const extractAndSaveFields = async (message, chunkNumber) => {
    const updates = {};
    const lower = message.toLowerCase().trim();

    if (chunkNumber === 2) {
      // Relationship detection
      if (/\bmom\b|\bmother\b/.test(lower)) updates.buyer_relationship = 'mom';
      else if (/\bdad\b|\bfather\b/.test(lower)) updates.buyer_relationship = 'dad';
      else if (/\bgrandmother\b|\bgrandma\b|\bgranny\b/.test(lower)) updates.buyer_relationship = 'grandmother';
      else if (/\bgrandfather\b|\bgrandpa\b|\bgrandad\b/.test(lower)) updates.buyer_relationship = 'grandfather';

      // Save what's prompting if message is longer (likely the motivation answer)
      if (message.length > 30 && !updates.buyer_relationship) {
        updates.buyer_motivation = message;
      }
    }

    if (chunkNumber === 3 && message.length < 50) {
      // Likely the name+age answer
      const ageMatch = message.match(/\b(\d{2,3})\b/);
      if (ageMatch) {
        updates.subject_age = parseInt(ageMatch[1]);
        const nameMatch = message.replace(/\b\d{2,3}\b/, '').replace(/[,.]/g, '').trim();
        if (nameMatch && nameMatch.length < 30) {
          updates.subject_name = nameMatch.split(/\s+/)[0];
        }
      }
    }

    if (chunkNumber === 4 && message.length > 10) {
      updates.sensitivities = message;
    }

    if (chunkNumber === 5 && message.length > 10) {
      updates.hopes_territory = message;
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
  onInputChange, onSubmit, onSkip, subjectName, relationship, messagesEndRef,
}) {
  const currentChunkLabel = getChunkLabel(currentChunk, subjectName, relationship);

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

      {loading && <TypingIndicator />}

      <div ref={messagesEndRef} />

      {/* Input form */}
      {!loading && (
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

      {/* Conversations preview */}
      <PlanSection title="The conversations" active={currentChunk === 7}>
        <ConversationPreview num={1} title="Early life" filled={currentChunk === 7} />
        <ConversationPreview num={2} title="Formative years" filled={currentChunk === 7} />
        <ConversationPreview num={3} title="Faith" filled={currentChunk === 7} />
        <ConversationPreview num={4} title="Marriage & family" filled={currentChunk === 7} />
        <ConversationPreview num={5} title="Reflections" filled={currentChunk === 7} />
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
    return (
      <div style={{ display: 'flex', gap: '18px', marginBottom: '24px' }}>
        <GraceAvatar />
        <div style={{ flex: 1 }}>
          {message.content.split('\n').filter(p => p.trim()).map((para, i) => (
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
