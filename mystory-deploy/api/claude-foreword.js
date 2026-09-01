// api/claude-foreword.js
// Writes the foreword — the "as told to" section that records who
// interviewed whom, when, where, and under what circumstances.
//
// This is the part of the book that answers a reader fifty years from now.
// The stories themselves will still make sense; what won't survive is the
// context around them — that Ethan was 34 and Karen was 81, that they sat
// at her kitchen table in Lancaster over four Sunday afternoons in the
// spring of 2026, that his mother was in the room for two of them.
//
// Because of that, this prompt is deliberately constrained. Everything in
// the output has to come from the facts passed in. A foreword that invents
// a warm detail is worse than no foreword at all: it looks like a record.

import Anthropic from '@anthropic-ai/sdk';
import { requireEntitlement, requireProject, admin } from './_entitlement.js';

const SYSTEM_PROMPT = `You write the foreword for a family legacy book — the "as told to" note that opens the volume and establishes, for the record, how the book came to exist.

# What this section is for

Someone will pick this book up in fifty years. They may never have met anyone in it. The stories will still speak for themselves. What they will not know, and cannot recover, is the circumstance: who asked the questions, how old everyone was, where they sat, over what stretch of time, who else was in the room. That is what you are preserving.

Think of it as the archival note at the front of an oral history, written with warmth rather than dryness. It is a record first and a piece of writing second.

# Absolute constraint

Use ONLY the facts given to you. You have no other knowledge of these people.

- Do not invent details. Not a season, not a room, not a mood, not a relationship texture.
- If a fact is missing, write around it. Do not gesture at it, do not use a placeholder, do not hint that something is absent.
- Do not describe what the conversations contained. That is the book's job. You are recording that they happened.
- Do not characterize anyone's feelings unless the interviewer's own note states them. You were not there.

If you find yourself reaching for a detail that would make the paragraph nicer, that is the signal to leave it out.

# Form

Write 150–250 words of continuous prose. No headings, no bullets, no labels. Third person. Past tense for the interviews, present tense for the book's existence.

Open by naming who told the stories and who wrote them down, with the relationship stated plainly. Establish ages and the span of dates early — these are the facts that decay fastest and matter most. Name the place. Name anyone else who was present. If the interviewer left a note in their own words, let it inform the closing sentence, but do not quote it at length or pretend their voice is yours.

Close on the fact of the record: that these are her words, gathered on these dates, in this place, by this person.

# Register

Plain and unhurried. The tone of someone who understands they are writing a document rather than a tribute. Warmth comes from precision — the exact date, the specific room — not from adjectives. Avoid: "cherished", "treasured", "priceless gift", "journey", "tapestry", "legacy" as a noun, and any sentence that tells the reader how to feel.

Never use an em dash.

# Example of the register (fabricated people, do not reuse any detail)

"These stories belong to Margaret Ellen Doyle, born in 1943 in Scranton, Pennsylvania. They were gathered by her grandson, Peter Doyle, over five conversations between the eleventh of March and the twenty-ninth of April, 2026. She was eighty-two. He was thirty-six. Four of the conversations took place at her kitchen table on Vine Street, in the house she moved into in 1971 and has not left since. The fifth was recorded by telephone, in the week she spent at her daughter's after a fall..."

Notice what that does: every clause carries a fact. Nothing is decorative.

Return ONLY the foreword prose. No preamble, no title, no commentary.`;

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : ''));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

function buildFacts(project, details, conversations) {
  const d = details || {};
  const lines = [];

  const push = (label, value) => {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      lines.push(`- ${label}: ${String(value).trim()}`);
    }
  };

  lines.push('## The person whose stories these are');
  push('Full name', d.subject_full_name || project.subject_name);
  push('Age at the time of the interviews', d.subject_age || project.subject_age);
  push('Year of birth', d.subject_birth_year);
  push('Place of birth', d.subject_birth_place);

  lines.push('');
  lines.push('## The person who gathered them');
  push('Full name', d.interviewer_full_name || project.buyer_name);
  push('Age at the time of the interviews', d.interviewer_age);
  push(
    'Relationship to her',
    d.interviewer_relationship ||
      (project.buyer_relationship
        ? `She is his or her ${project.buyer_relationship}`
        : null)
  );

  lines.push('');
  lines.push('## The conversations');
  if (conversations && conversations.length) {
    for (const c of conversations) {
      const parts = [];
      if (c.title) parts.push(`"${c.title}"`);
      const when = formatDate(c.recorded_on) || formatDate(c.approved_at);
      if (when) parts.push(`recorded ${when}`);
      if (c.recorded_where) parts.push(`at ${c.recorded_where}`);
      if (c.others_present) parts.push(`also present: ${c.others_present}`);
      if (c.transcript_source === 'audio') parts.push('recorded as audio');
      lines.push(`- Conversation ${c.conversation_number}: ${parts.join(', ')}`);
    }
  }
  push('Where most of them took place', d.primary_location);
  push('How they were conducted', d.method);

  if (d.interviewer_note && d.interviewer_note.trim()) {
    lines.push('');
    lines.push('## A note the interviewer wrote, in their own words');
    lines.push(d.interviewer_note.trim().slice(0, 2000));
    lines.push('');
    lines.push('(Let this inform the closing sentence. Do not quote it at length.)');
  }

  return lines.join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify the caller holds the interview product.
  const auth = await requireEntitlement(req, 'interview');
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const { project: clientProject, details } = req.body;

    if (!clientProject) {
      return res.status(400).json({ error: 'No project provided' });
    }

    // Load the project from the database rather than trusting the client copy.
    const owned = await requireProject(auth.user.id, clientProject?.id);
    if (owned.error) return res.status(owned.status).json({ error: owned.error });
    const project = owned.project;

    // Conversations come from the database too — these are the dates and
    // places that go on the record, and they should not be client-supplied.
    const { data: conversations } = await admin
      .from('interview_conversations')
      .select('conversation_number, title, recorded_on, recorded_where, others_present, transcript_source, approved_at, approved')
      .eq('project_id', project.id)
      .order('conversation_number', { ascending: true });

    const facts = buildFacts(project, details, (conversations || []).filter(c => c.approved));

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here are the facts. Use only these.\n\n${facts}\n\nWrite the foreword.`,
        },
      ],
    });

    const foreword = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim();

    if (!foreword) {
      return res.status(502).json({ error: 'No foreword returned' });
    }

    return res.status(200).json({ foreword });
  } catch (err) {
    console.error('Foreword error:', err);
    return res.status(502).json({ error: 'Could not write the foreword' });
  }
}
