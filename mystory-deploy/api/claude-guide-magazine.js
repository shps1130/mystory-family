// api/claude-guide-magazine.js
// Generates the personalized guide for one collecting session — ISSUE MODEL.
// Deployed at /api/claude-guide-magazine on Vercel.
//
// This is a NEW endpoint. /api/claude-guide (the five-conversation arc model)
// keeps working untouched.
//
// What changed from claude-guide.js:
//   - Reads project.issue_plan.sessions (four sessions aimed at departments)
//     instead of project.project_plan.conversations (five along a life arc).
//   - "The plan for today" becomes "What we're collecting today": a short list
//     of department slots with honest targets.
//   - Two collecting techniques join the back-pocket phrases: hold up a photo
//     and wait; write a saying down word for word.
//   - Session-specific coaching for the Shoebox and the Feature sessions.
// "When the answer is short" and "If something comes up" carry over intact.

import Anthropic from '@anthropic-ai/sdk';
import { requireEntitlement, requireProject } from './_entitlement.js';

// Department titles, used when the plan is missing one. Pronoun-neutral on
// purpose; the model personalizes from the relationship.
const DEPARTMENT_TITLES = {
  feature: 'The Feature',
  family_stories: 'Family Stories',
  sayings: 'Things They Always Said',
  laughter: 'Laughter, Around Our Table',
  shoebox: 'From the Shoebox',
  kitchen: 'From Their Kitchen',
  know_now: 'What I Know Now',
  faith: 'Faith',
  until_next_time: 'Until Next Time',
};

// Generic fallback for the four sessions. Used only when the project's
// issue_plan doesn't carry its own purpose, territory or collects list.
const FALLBACK_SESSIONS = {
  1: {
    title: 'The Shoebox',
    purpose: 'to get them talking with the photographs doing the work, and to find out which story is the big one',
    collects: ['shoebox', 'family_stories', 'sayings', 'feature'],
    territory: `- Whatever is in the box, in whatever order it comes out
- Who is in each picture, where it was taken, roughly when
- The one that makes them laugh when they see it
- The one nobody can identify
- Any story that runs longer than a caption — let it`,
  },
  2: {
    title: 'The Feature',
    purpose: 'to hear the one story the whole family knows, told all the way through',
    collects: ['feature', 'sayings'],
    territory: `- Where the story starts — the place and the day
- Who was there
- What happened, in order
- What it felt like then
- What they know about it now`,
  },
  3: {
    title: 'Around Our Table',
    purpose: 'to collect the light things — the sayings, the jokes, the recipe, the people',
    collects: ['sayings', 'laughter', 'kitchen', 'family_stories'],
    territory: `- The things they always said, and when they said them
- The joke that gets told every holiday
- One recipe, the way they actually make it
- The people who were always at the table
- A short story or two that comes up along the way`,
  },
  4: {
    title: 'What I Know Now',
    purpose: 'to gather what they would hand forward, and their closing word',
    collects: ['know_now', 'faith', 'until_next_time'],
    territory: `- What they would tell the grandchildren
- What they wish someone had told them at twenty
- What they have come to believe
- How faith ran through it, if it did
- The last thing they want to say`,
  },
};

// Resolve what this session is about, preferring the buyer's own issue plan.
// Fields are resolved individually so an older or partial plan still helps.
function resolveSession(project, sessionNumber) {
  const n = Number(sessionNumber);
  const fallback = FALLBACK_SESSIONS[n] || FALLBACK_SESSIONS[1];

  // issue_plan comes from a model-generated data block; be defensive.
  const plan = project?.issue_plan;
  const list = plan && Array.isArray(plan.sessions) ? plan.sessions : null;
  const planned = list ? list.find(s => s && Number(s.number) === n) : null;

  let usedPlannedTerritory = false;

  const territory = (() => {
    const t = planned?.territory;
    if (Array.isArray(t) && t.length) {
      const lines = t
        .filter(line => typeof line === 'string' && line.trim())
        .map(line => `- ${line.trim()}`);
      if (lines.length) {
        usedPlannedTerritory = true;
        return lines.join('\n');
      }
    }
    if (typeof t === 'string' && t.trim()) {
      usedPlannedTerritory = true;
      return t
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => (line.startsWith('-') ? line : `- ${line}`))
        .join('\n');
    }
    return fallback.territory;
  })();

  const collects = Array.isArray(planned?.collects) && planned.collects.length
    ? planned.collects.filter(id => typeof id === 'string')
    : fallback.collects;

  // Titles and targets for the departments this session feeds, from the plan's
  // departments list when present.
  const planDepartments = plan && Array.isArray(plan.departments) ? plan.departments : [];
  const collectsDetailed = collects.map(id => {
    const d = planDepartments.find(x => x && x.id === id);
    return {
      id,
      title: (d?.title || '').trim() || DEPARTMENT_TITLES[id] || id,
      target: (d?.target || '').trim() || null,
    };
  });

  const usedPlannedPurpose = Boolean((planned?.purpose || '').trim());

  return {
    title: (planned?.title || '').trim() || fallback.title,
    purpose: usedPlannedPurpose ? planned.purpose.trim() : fallback.purpose,
    description: (planned?.description || '').trim() || null,
    territory,
    collects: collectsDetailed,
    personalized: usedPlannedPurpose || usedPlannedTerritory,
  };
}

// Coaching that only applies to a particular session.
function sessionSpecifics(n, project) {
  const hasPhotos = String(project.has_photos || '').toLowerCase();
  const noPhotos = hasPhotos.startsWith('no');
  const candidates = Array.isArray(project.feature_candidates) ? project.feature_candidates.filter(Boolean) : [];
  const chosen = (project.feature_title || '').trim();

  if (n === 1) {
    if (noPhotos) {
      return `This is the FIRST session and the family has said there are few or no photographs. So this session is "First Stories" rather than a shoebox session: the easiest way in is the small departments. Open with a saying ("What did your mother always say when someone complained?") or the joke that gets told every holiday, and let the stories come from there. Tell the interviewer plainly that the feature — the one long story — does not need to be found today. If one story runs long, let it; that's probably the feature, and it will be chosen after this session.`;
    }
    return `This is the SHOEBOX session, and the photographs do the work. Teach the single technique that matters: hold up one picture, ask "who's this?", and then say nothing. Let her look. The picture puts her back in the room in a way no question can. For each photograph the interviewer needs only three things written down — who, where, roughly when — plus whatever she says about it. Tell the interviewer to photograph each print with their phone as they go (flat, good light, no flash) so the picture and the words stay together. If one picture turns into a long story, stop collecting captions and let it run; that is very likely the feature, and it will be chosen after this session. Include a line about "the one nobody can identify": every box has one, and her best guess is a keeper.`;
  }

  if (n === 2) {
    const which = chosen
      ? `The family has chosen the feature: "${chosen}". Build the whole guide around getting that one story told all the way through.`
      : candidates.length
        ? `The feature has not been formally chosen yet, but the family pointed to these candidates: ${candidates.map(c => `"${c}"`).join(', ')}. Write the guide so the interviewer opens by asking her which of these she'd like to tell properly — then gets out of the way.`
        : `No feature has been named. Write the guide so the interviewer asks her, plainly, "If the grandchildren could only know one story about your life, which one?" — and then follows that story wherever it goes.`;
    return `This is the FEATURE session: one story, told all the way through. ${which} A feature needs a beginning (a place and a day), the people, what happened in order, what it felt like, and what she knows about it now. The interviewer's job is to keep her inside the one story — gently — and to go back for the missing piece when there is one ("Wait — where were you standing when that happened?"). Tell the interviewer that this is the one session where it's fine to spend the whole hour on a single thing. Also tell them to catch any saying she drops along the way and write it down word for word.`;
  }

  if (n === 3) {
    return `This is the LIGHT session: sayings, laughter, the recipe, the people. It should feel like sitting at the table after a meal. Teach the saying-catch: when she says something that sounds like a line she's said a hundred times, the interviewer writes it down word for word and asks "when did you used to say that?" — the when is the caption. For the recipe, the interviewer asks her to make it out loud, step by step, in her words, including the part she never measures. Jokes get told, not described; let her tell the whole thing even if everyone knows the ending.`;
  }

  return `This is the LAST session: advice, faith if it is part of who she is, and her closing word. Keep it unhurried. The advice comes easiest as "what would you tell the grandchildren about ___" — money, marriage, work, hard years — one at a time, and the interviewer writes each one down close to word for word. If the family chose a Faith department, give it real room here: the verse on the refrigerator, how she prayed, what she'd want held onto. If faith is threaded rather than its own department, let it come up where she puts it and don't force it. End the session by asking for the last word: "If this were the last page, what would you want it to say?" Tell the interviewer that whatever she says is the closing line of the issue, exactly as she said it.`;
}

function buildSystemPrompt(sessionNumber, sess, specifics) {
  const collectsList = sess.collects
    .map(c => `- ${c.title}${c.target ? ` — ${c.target}` : ''}`)
    .join('\n');

  return `You are Grace, writing a personalized guide for someone about to sit down with their parent or grandparent for one collecting session. The family is making a printed, magazine-style issue of this person's life — one feature story, a few short stories, and small recurring departments: the things she always said, the jokes, the photographs with the story behind each, a recipe, advice for the grandchildren.

This guide has ONE job: make a nervous person feel ready. It must produce two specific feelings.

FOR THE SUBJECT (the person being interviewed), the guide must equip the interviewer to make them feel:
"Okay — there's nothing here I don't want to talk about, and this is actually going to be fun."

FOR THE INTERVIEWER, the guide must make them feel:
"I don't have to get everything today, and I know exactly what I'm collecting."

The single biggest fear on the subject's side is SCALE — they hear "your life story" and picture an impossible 900-page autobiography. The guide must shrink that: today we're filling a few pages of a magazine, that's all. The single biggest fear on the interviewer's side is DOING IT WRONG — missing the important stories, wasting the chance. The guide must dissolve that: the issue is collected a little at a time, and a short session is a complete session.

# This session

Session ${sessionNumber} of 4: ${sess.title}
Purpose: ${sess.purpose}
${sess.description ? `How the family described it: ${sess.description}` : ''}

What this session collects (the departments it feeds):
${collectsList}

Territory that might come up:
${sess.territory}
${sess.personalized ? `
This title, purpose and territory were built for THIS subject from what the family told us — they are not a generic template. Treat the territory as the real ground of this person's life, and let it steer the questions you write. If something in it is specific (a place, a job, a name), use it.` : ''}

# Session-specific coaching — fold this into the guide

${specifics}

# Structure — write exactly these four sections

## Before you sit down

Open by naming the whole job in one or two sentences — small, bounded, doable. "Here's the whole job today: go through the box with your mom and let her tell you what's in it. Not her whole life — just the pictures."

Then give the interviewer an actual SCRIPTED SENTENCE they can say to the subject, in quotes, to set expectations. It must convey: we're making a little magazine about you for the family, not a 900-page book; today is just [the pictures / one story / the sayings and the recipe / what you'd tell the grandkids]; we only talk about what you want; and honestly this'll be kind of fun. Write it in the interviewer's natural voice, addressed to the subject by their relationship term (Mom, Dad, Grandma, etc.).

Then reassure the INTERVIEWER directly. Say plainly that they cannot do this wrong. A short session with two or three good things in it is a complete success. What doesn't get collected today has three more sessions to show up in. They already know how to have a conversation with this person.

Then one practical line: set the phone to record, put it face down, and forget about it — the recording is how the words get into the issue exactly as she said them.

Then add ONE paragraph of advice tailored to how this specific subject communicates (see their profile below). If they're a fast talker who tells complete stories, the advice is "open a door and get out of the way." If they take their time and are brief, the advice is about patience and silence. Make it specific to this person.

## What we're collecting today

State the purpose of this session plainly. Then list what it collects as a short bulleted list — the departments above, each with an honest target in plain words ("three or four photographs with the story behind each", "every saying you can catch", "one recipe"). Explicitly tell them the targets are a feel for the size, not a quota; two is fine.

Then list the territory as a short bulleted list, and tell them they don't have to cover it all — pick what comes alive.

Then give them ONE specific, concrete opening move in quotes — for a shoebox session it's a picture to hold up, for other sessions it's a small sensory question. Never "tell me about your childhood." Explain briefly why small beats broad.

Then give 4-6 "doors to open" as short quoted questions they can use when they need them, personalized to this person and this session's departments.

Then a short section on the two moves that make stories richer:
- SPECIFICITY: when she says something general, ask for the concrete detail. Give an example using this family if you can.
- INTERIORITY: when she says what happened, sometimes ask what it felt like or meant.
Frame these as "this is where the magic is" — not as technique but as the thing that turns facts into a person.

## When the answer is short

This section is REQUIRED and it is one of the most useful parts of the guide. Nervous interviewers get a thin answer and move on to the next question. Teach them not to.

Open with a concrete worked example using this family. Show a thin answer the subject might plausibly give — something like "we moved four times" or "he was a good man" — and then show the follow-up that opens it up. Make the example specific to what you know about this person's actual life.

Then give these as a short list of ready-made follow-ups the interviewer can use almost verbatim on any thin answer. Present them as phrases to keep in your back pocket:

- "What's one you remember most?" — turns a count into a story
- "Walk me through that." — invites the whole scene instead of the summary
- "What did that look like?" — asks for the physical, concrete detail
- "What was that like for you?" — the feeling underneath the fact
- "Who else was there?" — brings people in, and people bring stories
- "When did you used to say that?" — turns a saying into a caption

Then, as its own short paragraph, the move most people never make: SAY NOTHING. Count to five. Most thin answers get filled in by the person who gave them, if you don't rush in with the next question. Silence is the cheapest and best follow-up there is. (For a shoebox session, add: holding up the next picture and waiting counts as silence.)

Keep this whole section tight and practical. These are phrases to glance down at mid-conversation, not a lesson.

## If something comes up

Cover these situations, each in 2-4 sentences, calm and permission-giving (never clinical):
- If they get emotional — that's often the most precious part; don't rush to fix it; be quiet with them; tears mean it's going deep, not wrong.
- If they say "I don't remember" — no pressure; come at it sideways with a more specific side-door question, or a different picture; if it doesn't come, let it go.
- If they go quiet — let silence sit, count to five; the best answers often come after the pause.
- If they ramble off track — tangents are often gold, and in this format a tangent is usually just a different department filling itself in; write it down. To steer back, wait for a breath and say "I love that — can I take you back to something you said a minute ago?"
- If one thing turns into a long story — let it. Stop collecting and listen. That story is probably the feature, or a Family Stories page on its own.
- If they ask "who's going to see this?" — it's for the family, the kids and grandkids and the generations after. Not the public. It's printed for the family and nobody else.

Include any situation-handling that's specifically relevant given the sensitivities the buyer shared.

Close with one or two short warm sentences. Something like: "That's it. One afternoon, a few pages of her issue."

# Voice rules

- Warm, calm, plain language. You are a steady friend who has done this many times.
- NEVER gush. No "what a beautiful gift," no "how wonderful."
- Address the interviewer directly as "you."
- Refer to the subject by their actual name and/or relationship term.
- Use the subject's correct pronouns based on the relationship (mom/grandmother = she/her; dad/grandfather = he/him).
- Say "issue," "pages," "departments," "session." Never "chapters." Never "book." Never "interview."
- Second person, present tense, encouraging but never syrupy.
- Plain text with markdown headings only. Use ## for the four section headings. Use short paragraphs. Use - for bullets. Never use bold asterisks.
- Total length: roughly 900-1300 words. Long enough to be genuinely useful, short enough that a nervous person will actually read it before sitting down.

Write the guide now. Start directly with the first section heading. Do not add a title, a preamble, or any meta-commentary.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify the caller holds the interview product.
  const auth = await requireEntitlement(req, 'interview');
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const { project: clientProject, sessionNumber = 1 } = req.body;

    if (!clientProject) {
      return res.status(400).json({ error: 'No project provided' });
    }

    const n = Math.min(4, Math.max(1, Number(sessionNumber) || 1));

    // Load the project from the database instead of trusting the client copy.
    const owned = await requireProject(auth.user.id, clientProject?.id);
    if (owned.error) return res.status(owned.status).json({ error: owned.error });
    const project = owned.project;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const relationship = project.buyer_relationship || 'parent';
    const subjectName = project.subject_name || 'them';

    const sess = resolveSession(project, n);
    const specifics = sessionSpecifics(n, project);

    const departmentsText = (() => {
      const d = project.departments;
      if (!d) return 'not stated';
      if (typeof d === 'string') return d;
      try {
        return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', ') || 'not stated';
      } catch {
        return 'not stated';
      }
    })();

    const profile = `# Who you're writing this for

- The interviewer's name: ${project.buyer_name || 'the buyer'}
- Their relationship to the subject: ${relationship} (so the subject is their ${relationship})
- Why they're doing this now: ${project.buyer_motivation || 'not stated'}

# The subject

- Name: ${subjectName}
- Age: ${project.subject_age || 'not stated'}
- Living situation: ${project.subject_living_situation || 'not stated'}
- How they communicate: ${project.subject_communication_style || 'not stated'}
- One important thing to know about them: ${project.subject_one_thing_to_know || 'not stated'}
- Sensitivities / what to be careful with: ${project.sensitivities || 'none named'}
- Photographs: ${project.has_photos || 'not stated'}
- Departments the family said fit this person: ${departmentsText}
- Feature candidates the family pointed to: ${Array.isArray(project.feature_candidates) && project.feature_candidates.length ? project.feature_candidates.join('; ') : 'none yet'}
- Anything else the family hopes gets pages: ${project.hopes_territory || 'not stated'}

# Logistics (if planned)

- Format: ${project.logistics_format || 'not planned'}
- Setting: ${project.logistics_setting || 'not planned'}
- Who else is involved: ${project.logistics_others || 'not planned'}

# This session's title from their plan
"${sess.title}" — you may reference this naturally.

Write the guide for session ${n}.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2500,
      system: buildSystemPrompt(n, sess, specifics),
      messages: [{ role: 'user', content: profile }],
    });

    let text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    // Strip stray bold markers; headings (##) are intentional
    text = text.replace(/\*\*/g, '');

    return res.status(200).json({ guide: text, session: { number: n, title: sess.title, collects: sess.collects.map(c => c.id) } });
  } catch (error) {
    console.error('Error in claude-guide-magazine:', error);
    return res.status(500).json({ error: 'Something went wrong', details: error.message });
  }
}
