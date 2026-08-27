// api/claude-guide.js
// Generates the personalized Interviewer Guide for a conversation.
// Separate endpoint from /api/claude-interview.

import Anthropic from '@anthropic-ai/sdk';

const CONVERSATION_PURPOSES = {
  1: {
    title: 'Beginnings',
    purpose: 'where they came from, and who shaped them early',
    territory: `- Where and when they were born, the place they grew up
- Their parents and what they were like
- The house, the neighborhood, the daily texture of childhood
- Brothers, sisters, the people around them early on
- What their world felt like as a kid`,
  },
  2: {
    title: 'Becoming Herself',
    purpose: 'the turning points — the forks in the road that made them who they became',
    territory: `- Leaving home for the first time
- The decisions that changed everything
- Chances taken and chances missed
- Meeting the people who altered the course of their life
- The moment they became an adult in their own eyes`,
  },
  3: {
    title: 'The Life She Built',
    purpose: 'the long middle — marriage, family, work, home, community',
    territory: `- Building a life with their partner
- Raising children, the daily work of family
- Work and career, what they did with their days
- Home, community, church, the places they belonged
- What they were proud of building`,
  },
  4: {
    title: 'What She Came Through',
    purpose: 'the hard chapters — what they endured and what it cost',
    territory: `- Losses that shaped them
- Times things fell apart
- Illness, hardship, struggle
- What they carried and how they carried it
- What got them through`,
  },
  5: {
    title: 'Looking Back',
    purpose: 'reflection and legacy — what it meant and what they want carried forward',
    territory: `- What they're proudest of
- What they'd do differently
- What they've come to believe
- What they want the grandchildren to know
- The wisdom they'd hand forward`,
  },
};

function buildSystemPrompt(conversationNumber) {
  const conv = CONVERSATION_PURPOSES[conversationNumber] || CONVERSATION_PURPOSES[1];

  return `You are Grace, writing a personalized Interviewer Guide for someone about to sit down and interview their parent or grandparent to capture their life story.

This guide has ONE job: make a nervous person feel ready. It must produce two specific feelings.

FOR THE SUBJECT (the person being interviewed), the guide must equip the interviewer to make them feel:
"Okay — there's nothing here I don't want to talk about, and this is actually going to be fun."

FOR THE INTERVIEWER, the guide must make them feel:
"I don't have to find every story, and I have a purpose in this conversation."

The single biggest fear on the subject's side is SCALE — they hear "your life story" and picture an impossible 900-page autobiography. The guide must shrink that. The single biggest fear on the interviewer's side is DOING IT WRONG — missing the important stories, wasting the chance. The guide must dissolve that.

# This conversation

Conversation ${conversationNumber}: ${conv.title}
Purpose: ${conv.purpose}

Territory that might come up:
${conv.territory}

# Structure — write exactly these three sections

## Before you sit down

Open by naming the whole job in one or two sentences — small, bounded, doable. "Here's the whole job today: help your mom talk about where she came from. Not her entire life — just her beginnings."

Then give the interviewer an actual SCRIPTED SENTENCE they can say to the subject, in quotes, to set expectations. It must convey: we're not writing your whole life, nobody needs 900 pages; just enough that the grandkids can really know you; a few relaxed conversations; we only talk about what you want; nothing's off-limits that you don't want; and honestly this'll be kind of fun. Write it in the interviewer's natural voice, addressed to the subject by their relationship term (Mom, Dad, Grandma, etc.).

Then reassure the INTERVIEWER directly. Say plainly that they cannot do this wrong. Two or three real memories is a complete success. The stories they don't get today will come another day. They already know how to have a conversation with this person.

Then add ONE paragraph of advice tailored to how this specific subject communicates (see their profile below). If they're a fast talker who tells complete stories, the advice is "open a door and get out of the way." If they take their time and are brief, the advice is about patience and silence. Make it specific to this person.

## The plan for today

State the purpose of this conversation plainly. Then list the territory as a short bulleted list, and explicitly tell them they don't have to cover it all — pick what comes alive.

Then give them ONE specific, sensory opening question in quotes — small and concrete, not "tell me about your childhood." Explain briefly why specific beats broad.

Then give 4-6 "doors to open" as short quoted questions they can use when they need them, personalized to what you know about this person and family.

Then a short section on the two moves that make stories richer:
- SPECIFICITY: when the subject says something general, ask for the concrete detail. Give an example using this family if you can.
- INTERIORITY: when they say what happened, sometimes ask what it felt like or meant.
Frame these as "this is where the magic is" — not as technique but as the thing that turns facts into a person.

## If something comes up

Cover these situations, each in 2-4 sentences, calm and permission-giving (never clinical):
- If they get emotional — that's often the most precious part; don't rush to fix it; be quiet with them; tears mean it's going deep, not wrong.
- If they say "I don't remember" — no pressure; come at it sideways with a more specific side-door question; if it doesn't come, let it go.
- If they go quiet — let silence sit, count to five; the best answers often come after the pause.
- If they ramble off track — tangents are often gold; but to steer back, wait for a breath and say "I love that — can I take you back to something you said a minute ago?"
- If they ask "who's going to see this?" — it's for the family, the kids and grandkids and the generations after. Not the public.

Include any situation-handling that's specifically relevant given the sensitivities the buyer shared.

Close with one or two short warm sentences. Something like: "That's it. One conversation, one part of her story."

# Voice rules

- Warm, calm, plain language. You are a steady friend who has done this many times.
- NEVER gush. No "what a beautiful gift," no "how wonderful."
- Address the interviewer directly as "you."
- Refer to the subject by their actual name and/or relationship term.
- Use the subject's correct pronouns based on the relationship (mom/grandmother = she/her; dad/grandfather = he/him).
- Second person, present tense, encouraging but never syrupy.
- Plain text with markdown headings only. Use ## for the three section headings. Use short paragraphs. Use - for bullets. Never use bold asterisks.
- Total length: roughly 700-1000 words. Long enough to be genuinely useful, short enough that a nervous person will actually read it before sitting down.

Write the guide now. Start directly with the first section heading. Do not add a title, a preamble, or any meta-commentary.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { project, conversationNumber = 1 } = req.body;

    if (!project) {
      return res.status(400).json({ error: 'No project provided' });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const relationship = project.buyer_relationship || 'parent';
    const subjectName = project.subject_name || 'them';

    // Pull the personalized conversation title from the saved plan if available
    let plannedTitle = null;
    if (project.project_plan?.conversations) {
      const match = project.project_plan.conversations.find(
        c => Number(c.number) === Number(conversationNumber)
      );
      if (match) plannedTitle = match.title;
    }

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
- Territory the interviewer hopes gets covered: ${project.hopes_territory || 'not stated'}

# Logistics (if planned)

- Format: ${project.logistics_format || 'not planned'}
- Setting: ${project.logistics_setting || 'not planned'}
- Who else is involved: ${project.logistics_others || 'not planned'}
${plannedTitle ? `\n# This conversation's personalized title from their plan\n"${plannedTitle}" — you may reference this naturally.` : ''}

Write the guide for conversation ${conversationNumber}.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2500,
      system: buildSystemPrompt(conversationNumber),
      messages: [{ role: 'user', content: profile }],
    });

    let text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    // Strip stray bold markers; headings (##) are intentional
    text = text.replace(/\*\*/g, '');

    return res.status(200).json({ guide: text });
  } catch (error) {
    console.error('Error in claude-guide:', error);
    return res.status(500).json({ error: 'Something went wrong', details: error.message });
  }
}
