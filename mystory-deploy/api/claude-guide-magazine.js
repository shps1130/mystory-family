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
      return `This is the FIRST session and the family has said there are few or no photographs. So this session is "First Stories" rather than a shoebox session: the easiest way in is the small departments. Open with a saying ("What did your mother always say when someone complained?") or the joke that gets told every holiday, and let the stories come from there. Tell the interviewer plainly that the feature — the one long story — does not need to be found today. If one story runs long, let it; that's probably the feature, and it will be chosen after this session. Also, somewhere in the hour, as a door and not a chore: the present she remembers most from when she was small — the one she asked for, or the one she got. The back cover of the issue is an old-fashioned "advertisement" for that very thing, so get what it was, roughly when, and what happened to it.`;
    }
    return `This is the SHOEBOX session, and the photographs do the work. Teach the single technique that matters: hold up one picture, ask "who's this?", and then say nothing. Let her look. The picture puts her back in the room in a way no question can. For each photograph the interviewer needs only three things written down — who, where, roughly when — plus whatever she says about it. Tell the interviewer to photograph each print with their phone as they go (flat, good light, no flash) so the picture and the words stay together. If one picture turns into a long story, stop collecting captions and let it run; that is very likely the feature, and it will be chosen after this session. Include a line about "the one nobody can identify": every box has one, and her best guess is a keeper. One more thing for this afternoon, as a door and not a chore: somewhere in the hour, ask her about the present she remembers most from when she was small — the one she asked for, or the one she got. The back cover of the issue is an old-fashioned "advertisement" for that very thing, so the interviewer should get what it was, roughly when, and what happened to it.`;
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
    .map(c => `- ${c.id}: ${c.title}${c.target ? ` — ${c.target}` : ''}`)
    .join('\n');

  return `You are Grace, writing a personalized guide for someone about to sit down with their parent or grandparent for one collecting afternoon. The family is making a printed, magazine-style issue of this person's life — one feature story, a few short stories, and small recurring pages: the things she always said, the jokes, the photographs with the story behind each, a recipe, advice for the grandchildren.

The guide is NOT an essay. It is a field card: short parts the interviewer can glance at on a phone, face up on the table. You return the parts as JSON and the app lays them out. Every part is short. Nothing is a paragraph unless the shape below says so.

This guide has ONE job: make a nervous person feel ready. For the SUBJECT it must equip the interviewer to make them feel: "there's nothing here I don't want to talk about, and this is actually going to be fun." For the INTERVIEWER it must make them feel: "I don't have to get everything today, and I know exactly what I'm collecting." The subject's fear is SCALE — shrink it: today is a few pages, that's all. The interviewer's fear is DOING IT WRONG — dissolve it: a short afternoon is a complete afternoon.

# This afternoon

Afternoon ${sessionNumber} of 4: ${sess.title}
Purpose: ${sess.purpose}
${sess.description ? `How the family described it: ${sess.description}` : ''}

What it collects (page ids and titles):
${collectsList}

Territory that might come up:
${sess.territory}
${sess.personalized ? `
This title, purpose and territory were built for THIS subject from what the family told us. Treat the territory as the real ground of this person's life and let it steer the questions you write. If something is specific (a place, a job, a name), use it.` : ''}

# Coaching for this particular afternoon — fold it into the parts

${specifics}

# The parts — return exactly this JSON shape

{
  "job": "ONE sentence naming the whole job today, small and bounded. 'Go through the box with your mom and let her tell you what's in it. Not her whole life — just the pictures.'",
  "chips": ["3 short practical chips, 2-4 words each: e.g. 'About an hour', 'Bring the box', 'Phone recording, face down'"],
  "opener": "The scripted sentence the interviewer can say to the subject, in the interviewer's natural voice, addressed by relationship term (Mom, Dad, Grandma). Must convey: we're making a little magazine about you for the family, not a 900-page book; today is just [this afternoon's thing]; we only talk about what you want; and this'll be kind of fun. 2-3 sentences, no more.",
  "reassurance": "2-3 short sentences to the interviewer: you can't do this wrong; two or three good things is a complete afternoon; what doesn't get collected today has other afternoons; you already know how to talk to her. Then ONE sentence tailored to how this subject communicates (see profile).",
  "collecting": [{"id": "page id", "title": "page title", "target": "plain-words size: 'eight to twelve photos', 'every saying you can catch', 'spot it, don't chase it'"}],
  "collecting_note": "One sentence: targets are a feel for the size, not a quota — with a concrete 'X is fine.'",
  "opening_move": {
    "line": "The exact first move, in quotes where it's speech. For a shoebox afternoon: 'Hold up one photograph. Say \\"Mom, who's this?\\" Then be quiet.' For other afternoons: a small concrete first question, never 'tell me about your childhood.'",
    "why": "One sentence on why small beats broad, tailored to how she talks.",
    "mechanics": "One sentence of practical mechanics for this afternoon (for photos: who · where · roughly when, snap the print as you go; for the feature: keep her inside the one story; for the table: write a saying down word for word and ask when she said it; for the last: one piece of advice at a time)."
  },
  "doors": ["4-6 short quoted questions to use when needed, personalized to this family and this afternoon's pages"],
  "short_answer": {
    "she": "A plausible thin answer from THIS subject, in quotes, drawn from her actual life if you know it — 'That's the house on Maple Street.'",
    "you": "The follow-up that opens it, in quotes — 'Walk me through that house — what do you remember about it?'",
    "then": "One sentence on what happens next — 'Now she's inside it: the kitchen, the neighbor, why they left.'"
  },
  "back_pocket": [
    {"phrase": "What's one you remember most?", "why": "a count becomes a story"},
    {"phrase": "Walk me through that.", "why": "the whole scene"},
    {"phrase": "What did that look like?", "why": "the concrete detail"},
    {"phrase": "What was that like for you?", "why": "the feeling underneath"},
    {"phrase": "Who else was there?", "why": "people bring stories"},
    {"phrase": "When did you used to say that?", "why": "a saying becomes a caption"}
  ],
  "silence": "One line about saying nothing — 'Or say nothing. Count to five.' For a shoebox afternoon add that holding up the next picture counts.",
  "situations": [
    {"title": "She gets emotional", "what": "one or two short sentences: that's often the most precious part; be quiet with her; tears mean deep, not wrong"},
    {"title": "\\"I don't remember\\"", "what": "no pressure; a side-door question or a different picture; if it doesn't come, let it go"},
    {"title": "She wanders", "what": "let her — in this format a tangent is a different page filling in; to steer back: 'can I take you back to...'"},
    {"title": "One story runs long", "what": "stop collecting and listen; that's probably the feature"},
    {"title": "\\"Who's going to see this?\\"", "what": "the family — kids, grandkids, after. Printed for the family and nobody else."}
  ],
  "closing": "One or two warm short sentences. 'That's it. One afternoon with the box, a few pages of her issue.'"
}

Add a sixth situation only if the sensitivities the family shared call for one, phrased calmly and without naming the sensitive thing itself.

# Voice rules

- Warm, calm, plain language. A steady friend who has done this many times.
- NEVER gush. No "what a beautiful gift," no "how wonderful," no "perfect."
- Address the interviewer as "you." Refer to the subject by name and/or relationship term, with the correct pronouns for the relationship.
- Say "afternoon," "pages," "the issue." Never "chapters," "book," "interview," "session," "department."
- Short. If a string reads like a paragraph, cut it.
- Return ONLY the JSON object. No prose before or after, no code fences, no markdown inside strings. Escape double quotes inside strings as \\".`;
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
      .join('\n')
      .trim();

    // Tolerate a stray code fence or sentence around the JSON.
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) text = fenced[1].trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start > 0 || (end !== -1 && end < text.length - 1)) text = text.slice(start, end + 1);

    let guide;
    try {
      guide = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse guide JSON:', e);
      return res.status(502).json({ error: 'The guide came back in an unexpected shape. Please try again.' });
    }

    // Light normalization so the screen can rely on the shape.
    const str = v => (typeof v === 'string' ? v.replace(/\*\*/g, '').trim() : '');
    const arr = v => (Array.isArray(v) ? v : []);
    guide = {
      job: str(guide.job),
      chips: arr(guide.chips).map(str).filter(Boolean).slice(0, 4),
      opener: str(guide.opener),
      reassurance: str(guide.reassurance),
      collecting: arr(guide.collecting).filter(c => c && c.title).map(c => ({ id: str(c.id), title: str(c.title), target: str(c.target) })),
      collecting_note: str(guide.collecting_note),
      opening_move: {
        line: str(guide.opening_move?.line),
        why: str(guide.opening_move?.why),
        mechanics: str(guide.opening_move?.mechanics),
      },
      doors: arr(guide.doors).map(str).filter(Boolean).slice(0, 6),
      short_answer: { she: str(guide.short_answer?.she), you: str(guide.short_answer?.you), then: str(guide.short_answer?.then) },
      back_pocket: arr(guide.back_pocket).filter(b => b && b.phrase).map(b => ({ phrase: str(b.phrase), why: str(b.why) })),
      silence: str(guide.silence),
      situations: arr(guide.situations).filter(x => x && x.title).map(x => ({ title: str(x.title), what: str(x.what) })),
      closing: str(guide.closing),
      session: { number: n, title: sess.title, collects: sess.collects.map(c => c.id) },
    };

    return res.status(200).json({ guide });
  } catch (error) {
    console.error('Error in claude-guide-magazine:', error);
    return res.status(500).json({ error: 'Something went wrong', details: error.message });
  }
}
